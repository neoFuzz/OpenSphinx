# Design — Cloudflare Migration

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Cloudflare Edge                 │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │        Workers Fetch Handler         │    │
│  │  (routing, auth, CORS, rate limit)   │    │
│  └──────────┬──────────────────────────┘    │
│             │ DO stub per roomId             │
│  ┌──────────▼──────────────────────────┐    │
│  │       GameRoom Durable Object        │    │
│  │  - SSE fan-out list                  │    │
│  │  - In-memory room state              │    │
│  │  - applyMove (shared engine)         │    │
│  │  - Storage Alarm (cleanup)           │    │
│  └──────────┬──────────────────────────┘    │
│             │ SQL                            │
│  ┌──────────▼──────────────────────────┐    │
│  │          Cloudflare D1               │    │
│  │  users / saved_games /               │    │
│  │  game_replays / player_stats         │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
         ▲                    ▲
   SSE stream            HTTP POST
   (EventSource)         (fetch)
         │                    │
┌────────┴────────────────────┴────────────────┐
│              React Client                     │
│         (Cloudflare Pages)                    │
└───────────────────────────────────────────────┘
```

---

## Package Structure

```
server-worker/               ← new Wrangler package
├── package.json
├── tsconfig.json
├── wrangler.toml
└── src/
    ├── index.ts             ← Workers fetch handler (routing)
    ├── room.ts              ← GameRoom Durable Object class
    ├── database.ts          ← D1 operations (mirrors existing database.ts API)
    ├── auth.ts              ← Discord OAuth + JWT (jose) + CSRF
    ├── middleware.ts        ← Auth helpers, CORS, rate limit, security headers
    └── types.ts             ← Worker-specific types (Env, bindings)
```

The `shared/` package is imported directly — Wrangler bundles it at build time via the TypeScript path alias.

---

## Workers Fetch Handler (`src/index.ts`)

Simple URL-pattern router. No Express — just `Request` in, `Response` out.

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS preflight
    if (request.method === 'OPTIONS') return corsResponse(request, env);
    
    // Security headers on every response (via wrapper)
    return withSecurityHeaders(route(request, url, env, ctx), request, env);
  }
};

// Routing table
async function route(request: Request, url: URL, env: Env, ctx: ExecutionContext) {
  const path = url.pathname;
  
  if (path.startsWith('/auth/'))      return handleAuth(request, url, env);
  if (path === '/health')             return Response.json({ ok: true });
  if (path.startsWith('/api/rooms'))  return handleRooms(request, url, env);
  if (path.startsWith('/api/games'))  return handleGames(request, url, env);
  if (path.startsWith('/api/'))       return handleApi(request, url, env);
  
  return new Response('Not Found', { status: 404 });
}
```

---

## GameRoom Durable Object (`src/room.ts`)

The DO is the heart of the migration. One instance per room, keyed by room ID.

### Storage split

| Data | Where | Why |
|---|---|---|
| `players`, `config`, `isPrivate`, `password` | DO SQLite | Room-scoped, fast in-process reads |
| `gameState` (current board) | DO SQLite | Survives DO eviction; restored on wake |
| `gameStates[]` (history) | DO SQLite (checkpointed) | Survives eviction; flushed to D1 on game end |
| `connections` (SSE writers) | In-memory only | Can't serialize streams; rebuilt on reconnect |
| `users`, `saved_games`, `game_replays`, `player_stats` | D1 | Global — queried across rooms and from the Worker |

### State

```typescript
// In-memory (rebuilt from DO SQLite on wake)
interface RoomState {
  id: string;
  players: { clientId: string; name: string; color: 'RED' | 'SILVER'; userId?: string }[];
  gameState: GameState;
  gameStates: GameState[];          // full move history, checkpointed to DO SQLite
  spectatorIds: Set<string>;
  config: GameConfig;
  isPrivate: boolean;
  password?: string;
  finishedAt?: number;
}

// SSE connections — never persisted, in-memory only
private connections = new Map<string, { writer: WritableStreamDefaultWriter; userId?: string }>();
```

`clientId` replaces `socketId` — a random UUID assigned when a client opens its SSE connection.

### DO SQLite schema (internal to each room instance)

```sql
CREATE TABLE IF NOT EXISTS room_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Stores: id, config (JSON), isPrivate, password, finishedAt
-- Stores: players (JSON array), gameState (JSON)

CREATE TABLE IF NOT EXISTS game_history (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,
  game_state TEXT NOT NULL   -- JSON-serialised GameState
);
```

### Constructor — hydrating from DO SQLite on wake

When the CF runtime re-creates an evicted DO, the constructor re-hydrates from storage:

```typescript
constructor(state: DurableObjectState, env: Env) {
  super(state, env);
  // Hydration runs before any fetch() is handled
  state.blockConcurrencyWhile(async () => {
    const meta = await this.storage.get<string>('room_meta');
    if (meta) {
      const parsed = JSON.parse(meta);
      this.id = parsed.id;
      this.config = parsed.config;
      this.isPrivate = parsed.isPrivate;
      this.password = parsed.password;
      this.finishedAt = parsed.finishedAt;
      this.players = parsed.players ?? [];
    }

    const gs = await this.storage.get<string>('game_state');
    if (gs) this.gameState = JSON.parse(gs);

    // Restore full history from game_history table
    const rows = await this.sql
      .exec('SELECT game_state FROM game_history ORDER BY seq ASC')
      .toArray();
    this.gameStates = rows.map(r => JSON.parse(r.game_state as string));
  });
}
```

### Checkpointing game history after each move

After every valid move, the new `GameState` is appended to the `game_history` table and `game_state` is updated atomically:

```typescript
private async persistMove(newState: GameState): Promise<void> {
  // Append to history
  this.sql.exec(
    'INSERT INTO game_history (game_state) VALUES (?)',
    JSON.stringify(newState)
  );
  // Overwrite current state
  await this.storage.put('game_state', JSON.stringify(newState));
}
```

This keeps the DO SQLite row-write cost at **2 writes per move** (one history row + one state overwrite), well within the free tier for typical game traffic.

On game end, `gameStates` is read from `game_history` and flushed to D1 as the replay blob, then `this.storage.setAlarm()` triggers cleanup.

### Fetch handler (called by Worker via DO stub)

The DO exposes a single internal HTTP interface. The Worker forwards requests to the DO after routing:

```
GET  /events              → open SSE stream, add to connections map
POST /join                → join room, push room:state to all
POST /move                → validate + applyMove, checkpoint to DO SQLite, push game:state to all
POST /save                → save to D1, push game:saved to requester
POST /leave               → remove client from players/spectators
GET  /state               → return current room state (for reconnect / HTTP fallback)
```

### SSE fan-out

```typescript
private async broadcast(event: string, data: unknown): Promise<void> {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const dead: string[] = [];
  
  for (const [clientId, conn] of this.connections) {
    try {
      await conn.writer.write(new TextEncoder().encode(payload));
    } catch {
      dead.push(clientId);  // connection dropped
    }
  }
  
  // Clean up dead connections
  for (const id of dead) {
    this.removeClient(id);
  }
}
```

### Opening an SSE stream

```typescript
if (url.pathname === '/events') {
  const clientId = crypto.randomUUID();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  
  this.connections.set(clientId, { writer, userId: authenticatedUserId });
  
  // Push current state immediately on connect (covers reconnect after eviction)
  await this.sendTo(clientId, 'room:state', this.publicState());
  
  // Return the readable side as the SSE response
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

Because `room:state` is pushed immediately on every SSE connect, a client that reconnects after a DO eviction gets the full current state without any extra round-trip.

### Storage Alarm (room cleanup)

```typescript
async alarm(): Promise<void> {
  // Called by CF runtime 30s after game end
  await this.storage.deleteAll();  // clears DO SQLite tables + all KV entries
  // DO instance is evicted after storage is cleared
}

// In handleMove, when game ends:
await this.ctx.storage.setAlarm(Date.now() + 30_000);
```

---

## D1 Database (`src/database.ts`)

D1 holds only global, cross-room data (`users`, `saved_games`, `game_replays`, `player_stats`). Per-room state and game history live in DO SQLite and are flushed to D1 only once on game end.

Same interface as the existing `DatabaseManager` but fully async with D1:

```typescript
export class DatabaseManager {
  constructor(private db: D1Database) {}
  
  async saveGame(id: string, name: string, gameState: GameState, userId?: string): Promise<void> {
    await this.db.prepare(
      `INSERT OR REPLACE INTO saved_games (id, name, game_state, user_id, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(id, name, JSON.stringify(gameState), userId ?? null).run();
  }
  
  // ... rest mirrors existing database.ts
}
```

Key differences from current `database.ts`:
- `stmt.run(...)` → `stmt.bind(...).run()` (D1 API)
- `stmt.get(...)` → `stmt.bind(...).first()` (D1 API)
- `stmt.all(...)` → `stmt.bind(...).all()` then `.results`
- Dynamic query in `listReplays` built with array params, not spread
- `randomUUID()` from `crypto.randomUUID()` (Web Crypto, no Node import)

D1 schema migration file (`schema.sql`) is identical to the existing SQLite schema.

---

## Authentication (`src/auth.ts`)

Replace `jsonwebtoken` with `jose` (Web Crypto compatible):

```typescript
import { SignJWT, jwtVerify } from 'jose';

async function signToken(payload: JwtPayload, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(key);
}

async function verifyToken(token: string, secret: string): Promise<JwtPayload> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const { payload } = await jwtVerify(token, key);
  return payload as JwtPayload;
}
```

Discord OAuth flow is unchanged — same redirect URLs, same token exchange, same cookie setting.

### CSRF

Replace `@dr.pogodin/csurf` with a double-submit cookie using Web Crypto:

```typescript
// Issue token
async function issueCsrfToken(env: Env): Promise<string> {
  const token = crypto.randomUUID();
  // Sign with CSRF_SECRET so it can't be forged
  return signCsrfToken(token, env.CSRF_SECRET);
}

// Validate on mutating requests
async function validateCsrf(request: Request, env: Env): Promise<boolean> {
  const headerToken = request.headers.get('X-CSRF-Token');
  const cookieToken = getCookie(request, 'csrf_token');
  if (!headerToken || !cookieToken) return false;
  return headerToken === cookieToken && verifyCsrfToken(headerToken, env.CSRF_SECRET);
}
```

---

## Security Headers & CORS (`src/middleware.ts`)

Replace `helmet` and `cors` packages with manual header injection:

```typescript
function securityHeaders(isProduction: boolean): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...(isProduction ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
  };
}

function corsHeaders(request: Request, allowedOrigins: string[]): HeadersInit {
  const origin = request.headers.get('Origin') ?? '';
  if (!allowedOrigins.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
  };
}
```

### Rate Limiting

Use a lightweight DO-backed counter or Cloudflare's native rate limiting rules (configured in `wrangler.toml`). For the Worker implementation, a simple in-memory counter per DO instance is sufficient given CF's edge isolation.

---

## Client Updates (`client/src/`)

### Remove
- `socket.io-client` dependency from `client/package.json`
- `client/src/socket.ts` (the Socket.IO singleton)

### Add: `client/src/sse.ts`

```typescript
let eventSource: EventSource | null = null;

export function connectToRoom(roomId: string): EventSource {
  eventSource?.close();
  eventSource = new EventSource(`${SERVER_URL}/api/rooms/${roomId}/events`, {
    withCredentials: true  // sends auth cookie
  });
  return eventSource;
}

export function disconnectFromRoom(): void {
  eventSource?.close();
  eventSource = null;
}
```

### Event listener pattern (in components / state)

```typescript
// Replace:  socket.on('game:state', handler)
// With:
es.addEventListener('game:state', (e: MessageEvent) => {
  const data = JSON.parse(e.data);
  handler(data);
});

// Replace:  socket.emit('game:move', payload)
// With:
await fetch(`${SERVER_URL}/api/rooms/${roomId}/move`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
  body: JSON.stringify(payload),
});
```

### State store changes (`client/src/state/game.ts`)

The Zustand store currently subscribes to socket events directly. These subscriptions move to the SSE event listeners. The store shape doesn't change — only how events arrive.

---

## Wrangler Configuration (`server-worker/wrangler.toml`)

```toml
name = "opensphinx-server"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "GAME_ROOM"
class_name = "GameRoom"

[[migrations]]
tag = "v1"
new_classes = ["GameRoom"]

[[d1_databases]]
binding = "DB"
database_name = "opensphinx"
database_id = "<id from wrangler d1 create opensphinx>"

[vars]
ALLOWED_DOMAIN = "opensphinx.online"

# Secrets (set via `wrangler secret put`):
# JWT_SECRET
# CSRF_SECRET
# DISCORD_CLIENT_ID
# DISCORD_CLIENT_SECRET
# DISCORD_REDIRECT_URI
# CLIENT_URLS
```

---

## Environment Bindings (`src/types.ts`)

```typescript
export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  DB: D1Database;
  JWT_SECRET: string;
  CSRF_SECRET: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;
  CLIENT_URLS: string;
  ALLOWED_DOMAIN: string;
  NODE_ENV?: string;
}
```

---

## Migration Sequence

The existing `server/` package stays live on Render throughout. The Worker is deployed in parallel and tested before cutting over.

1. Deploy Worker to a staging route (e.g. `opensphinx-dev.workers.dev`)
2. Test full game flow against staging Worker with staging client build
3. Update `client/.env` to point at Worker URL
4. Deploy updated client to Cloudflare Pages
5. Verify production traffic on Worker
6. Decommission Render server
7. Remove old `server/` package (optional, or keep as reference)
