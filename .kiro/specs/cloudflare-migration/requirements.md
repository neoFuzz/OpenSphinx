# Requirements — Cloudflare Migration

## Overview
Migrate the OpenSphinx game server from a Node.js/Express/Socket.IO deployment on Render.com to a fully serverless deployment on Cloudflare Workers + Durable Objects + D1. The client communication protocol changes from Socket.IO (WebSockets) to SSE (Server-Sent Events) for server push and plain HTTP for client actions.

The client (React/Vite) continues to be hosted on Cloudflare Pages. After migration, no Render.com infrastructure is needed.

---

## Functional Requirements

### FR-1 — New Worker Package
A new `server-worker/` package must exist in the monorepo alongside the existing `server/` package. The existing `server/` package is preserved until the migration is validated in production.

### FR-2 — HTTP API Parity
All existing REST endpoints must be available at the same paths:

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/rooms` | List public rooms |
| POST | `/api/rooms` | Create a room (replaces `room:create` socket event) |
| POST | `/api/rooms/:roomId/join` | Join a room (replaces `room:join` socket event) |
| POST | `/api/rooms/:roomId/move` | Submit a move (replaces `game:move` socket event) |
| POST | `/api/rooms/:roomId/save` | Save game (replaces `game:save` socket event) |
| POST | `/api/rooms/load` | Load a saved game (replaces `game:load` socket event) |
| GET | `/api/rooms/:roomId/events` | SSE stream — new, replaces Socket.IO connection |
| GET | `/api/games` | List saved games |
| DELETE | `/api/games/:id` | Delete a saved game |
| GET | `/api/stats/:userId` | Get player stats |
| GET | `/api/replays` | List replays (paginated + search) |
| GET | `/api/replays/:id` | Get a replay |
| GET | `/api/csrf-token` | Issue a CSRF token |
| GET | `/auth/discord` | Discord OAuth redirect |
| GET | `/auth/discord/callback` | Discord OAuth callback |
| POST | `/auth/logout` | Clear auth cookie |
| GET | `/auth/me` | Current user info |
| GET | `/health` | Health check |
| GET | `/api/badge/status` | Server status SVG badge |
| GET | `/api/badge/client-status` | Client status SVG badge |
| GET | `/api/user/active-games` | User's active rooms |

### FR-3 — SSE Event Stream
`GET /api/rooms/:roomId/events` must return an SSE stream that pushes the following named events to all connected clients (players and spectators) in the room:

| SSE event name | Payload | When emitted |
|---|---|---|
| `room:state` | `{ roomId, players: [{name, color}], state: GameState, config }` | On join; on player disconnect |
| `game:state` | `{ state: GameState, ack?: string }` | After every valid move |
| `game:end` | `{ winner: Player }` | When Pharaoh is hit |
| `game:saved` | `{ success: boolean, error?: string }` | After save completes |

On initial connection the server must immediately push the current `room:state` so the client has a starting state without a separate HTTP round-trip.

### FR-4 — Durable Objects Room Management
Each game room must be managed by a single `GameRoom` Durable Object instance keyed by room ID. The DO must:
- Hold all in-memory room state (players, spectators, gameStates history, config)
- Persist room metadata, current game state, and game history to DO SQLite storage so the room survives eviction
- Hydrate from DO SQLite on wake via `state.blockConcurrencyWhile()` in the constructor
- Checkpoint game history: append one row to `game_history` table and overwrite `game_state` after every valid move (2 DO SQLite writes per move)
- Manage the list of active SSE connections for fan-out (in-memory only — connections are re-established by clients on reconnect)
- Push current `room:state` immediately on every new SSE connection so reconnecting clients recover without an extra round-trip
- Remove dead SSE connections on write failure
- Use a Storage Alarm to auto-delete finished rooms after 30 seconds (`this.ctx.storage.setAlarm`)
- Prevent self-play for authenticated users

### FR-4a — Storage split
| Data | Storage |
|---|---|
| Room metadata (id, config, players, password) | DO SQLite |
| Current `gameState` | DO SQLite |
| `gameStates[]` move history | DO SQLite (flushed to D1 on game end) |
| SSE `WritableStream` connections | In-memory only |
| `users`, `saved_games`, `game_replays`, `player_stats` | D1 |

### FR-5 — D1 Database
All persistence must use Cloudflare D1 with the same schema as the existing SQLite database:
- `users`, `saved_games`, `game_replays`, `player_stats` tables
- Auto-save completed game and replay on game end
- Update player stats on game end

### FR-6 — Authentication
Discord OAuth 2.0 + JWT authentication must work identically to the current implementation:
- JWT signed with `JWT_SECRET` env var
- `auth_token` httpOnly cookie, 7-day expiry, `Secure` in production
- JWT library must be Workers-compatible (`jose`)
- Authenticated user ID attached to move/save/join actions via cookie

### FR-7 — Security
- CSRF protection on all state-mutating API endpoints (move, save, delete, logout)
- CORS restricted to configured `CLIENT_URLS`
- Rate limiting on `/auth/*` (100 req / 15 min) and `/api/*` (1000 req / 15 min)
- All security headers equivalent to current Helmet configuration

### FR-8 — Client Updates
The React client must be updated to remove `socket.io-client` and replace all socket usage with:
- `EventSource` for the SSE stream (`/api/rooms/:roomId/events`)
- `fetch` for all actions (join, move, save, load, create)
- Automatic reconnection is handled by the browser's native `EventSource` API

### FR-9 — Shared Engine Unchanged
`shared/src/engine/` must not be modified. It runs in Workers without change.

### FR-10 — Wrangler Configuration
A `wrangler.toml` must exist in `server-worker/` configuring:
- Worker entry point
- Durable Object binding (`GAME_ROOM`)
- D1 database binding (`DB`)
- Environment variable bindings for secrets
- Routes

---

## Non-Functional Requirements

### NFR-1 — No Render.com dependency
After successful deployment, the server on Render.com can be decommissioned.

### NFR-2 — Backward compatibility during transition
The existing `server/` package must remain functional during development so the live game is unaffected until the Worker is validated.

### NFR-3 — CF Workers free tier awareness
The implementation should be mindful of Durable Object and D1 request limits. The SSE stream counts as one long-lived request per connected client — this is normal and expected on the paid Workers plan (required for Durable Objects).

### NFR-4 — TypeScript throughout
The `server-worker/` package must use TypeScript with the same strict-mode settings as the rest of the monorepo.
