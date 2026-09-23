/**
 * server-worker/src/index.ts
 *
 * Cloudflare Workers fetch handler and URL router.
 *
 * Architecture:
 *  - Every request is routed here first.
 *  - CORS preflight is handled immediately.
 *  - Auth routes go to src/auth.ts handlers.
 *  - Room-specific routes are forwarded to the GameRoom Durable Object.
 *  - Database-backed routes (games, replays, stats) hit D1 via DatabaseManager.
 *  - Security + CORS headers are applied to every response via withSecurityAndCors().
 *
 * Room listing strategy (task 5.7 / FR "list public rooms"):
 *  DOs are opaque — the Worker cannot enumerate all instances. A module-level
 *  Map<string, RoomListEntry> tracks rooms created in this isolate. This is
 *  per-isolate and best-effort (sufficient for development; replace with a
 *  dedicated "room registry" DO for production multi-isolate consistency).
 */

import { DatabaseManager } from './database';
import {
  handleAuthRedirect,
  handleAuthCallback,
  handleAuthLogout,
  handleAuthMe,
  issueCsrfToken,
  validateCsrf,
  parseCookies,
} from './auth';
import {
  withSecurityAndCors,
  corsPreflightResponse,
  optionalAuth,
  checkRateLimit,
  rateLimitResponse,
} from './middleware';
import type { Env } from './types';
import type { GameConfig } from '@laser/shared/types';

// Re-export so Wrangler picks up the DO class name from this entry file.
export { GameRoom } from './room';

// ---------------------------------------------------------------------------
// Module-level room registry (per-isolate, best-effort)
// ---------------------------------------------------------------------------

/** Lightweight metadata about a created room tracked in this Worker isolate. */
interface RoomListEntry {
  roomId: string;
  config: GameConfig;
  isPrivate: boolean;
  playerCount: number;
}

/**
 * In-memory registry of rooms created by this isolate.
 * Populated on `POST /api/rooms` and updated on DO state responses.
 * Key = roomId.
 */
const roomRegistry = new Map<string, RoomListEntry>();

/** Whether the default public room has been seeded for this isolate. */
let defaultRoomSeeded = false;

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generates a short, human-readable room ID.
 * Format: `<year><6 random uppercase alphanumeric chars>` — e.g. `2025AB12CD`
 */
function makeRoomId(): string {
  return `${new Date().getFullYear()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// DO forwarding helpers
// ---------------------------------------------------------------------------

/**
 * Resolves a GameRoom Durable Object stub by room ID.
 * @param roomId - The logical room identifier
 * @param env - Worker environment bindings
 * @returns A DO stub for the given room
 */
function getRoomStub(roomId: string, env: Env): DurableObjectStub {
  const id = env.GAME_ROOM.idFromName(roomId);
  return env.GAME_ROOM.get(id);
}

/**
 * Forwards an HTTP request to a GameRoom DO at the given path.
 * Constructs a fresh Request with the correct URL so the DO's `fetch()` handler
 * can route on `url.pathname` without seeing the Worker's full URL.
 *
 * @param stub   - Resolved DO stub
 * @param path   - Pathname to call on the DO (e.g. `'/move'`)
 * @param method - HTTP method
 * @param body   - Optional JSON-serialisable body
 * @param query  - Optional query-string params
 * @returns The DO's Response
 */
async function forwardToDo(
  stub: DurableObjectStub,
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: unknown,
  query?: Record<string, string>,
): Promise<Response> {
  const u = new URL(`https://do${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      u.searchParams.set(k, v);
    }
  }

  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }

  return stub.fetch(new Request(u.toString(), init));
}

// ---------------------------------------------------------------------------
// Task 5.7 — ensure default public room exists
// ---------------------------------------------------------------------------

/**
 * Seeds a single default public room the first time this isolate handles a
 * request. This is best-effort (one isolate only) — suitable for development.
 *
 * The default room uses `CLASSIC` rules + `CLASSIC` setup and is public.
 */
async function ensureDefaultRoom(env: Env): Promise<void> {
  if (defaultRoomSeeded || roomRegistry.size > 0) {
    defaultRoomSeeded = true;
    return;
  }

  const roomId = makeRoomId();
  const config: GameConfig = { rules: 'CLASSIC', setup: 'CLASSIC' };

  const stub = getRoomStub(roomId, env);
  try {
    await forwardToDo(stub, '/create', 'POST', { roomId, config, isPrivate: false });
    roomRegistry.set(roomId, { roomId, config, isPrivate: false, playerCount: 0 });
  } catch {
    // Non-critical — log and continue
    console.error('Failed to seed default room', roomId);
  }

  defaultRoomSeeded = true;
}

// ---------------------------------------------------------------------------
// Main fetch handler (task 5.1)
// ---------------------------------------------------------------------------

export default {
  /**
   * Entry point for all HTTP requests arriving at the Worker.
   *
   * Request flow:
   * 1. Handle CORS preflight immediately.
   * 2. Seed default room on first request.
   * 3. Route to the appropriate handler.
   * 4. Wrap every response with security + CORS headers.
   *
   * @param request - Incoming HTTP request
   * @param env     - Environment bindings (DO namespace, D1, secrets…)
   * @param ctx     - Execution context (waitUntil, passThroughOnException)
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS preflight — must be handled before anything else
    if (request.method === 'OPTIONS') {
      return corsPreflightResponse(request, env);
    }

    // Best-effort default room seed (task 5.7)
    ctx.waitUntil(ensureDefaultRoom(env));

    const response = await route(request, env, ctx);
    return withSecurityAndCors(response, request, env);
  },
};

// ---------------------------------------------------------------------------
// URL router (task 5.2)
// ---------------------------------------------------------------------------

/**
 * Routes the request to the appropriate sub-handler based on path prefix.
 *
 * All responses returned here are plain (no security/CORS headers yet) — those
 * are applied by the caller after routing returns.
 */
async function route(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Health check (no auth / rate limit required)
  if (path === '/health') {
    return Response.json({ ok: true, timestamp: Date.now() });
  }

  // Auth routes — rate-limited at /auth/*
  if (path.startsWith('/auth/') || path === '/auth') {
    if (!checkRateLimit(request, '/auth')) {
      return rateLimitResponse();
    }
    return handleAuth(request, url, env);
  }

  // All /api/* routes — rate-limited at /api/*
  if (path.startsWith('/api/')) {
    if (!checkRateLimit(request, '/api')) {
      return rateLimitResponse();
    }

    if (path.startsWith('/api/rooms')) return handleRooms(request, url, env);
    if (path.startsWith('/api/games')) return handleGames(request, url, env);
    return handleApi(request, url, env);
  }

  return new Response('Not Found', { status: 404 });
}

// ---------------------------------------------------------------------------
// Auth handler
// ---------------------------------------------------------------------------

/**
 * Delegates to the appropriate Discord OAuth / session handler in `./auth.ts`.
 */
function handleAuth(request: Request, url: URL, env: Env): Promise<Response> | Response {
  const path = url.pathname;

  if (path === '/auth/discord' && request.method === 'GET') {
    return handleAuthRedirect(request, env);
  }

  if (path === '/auth/discord/callback' && request.method === 'GET') {
    return handleAuthCallback(request, env);
  }

  if (path === '/auth/logout' && request.method === 'POST') {
    return handleAuthLogout(request, env);
  }

  if (path === '/auth/me' && request.method === 'GET') {
    return handleAuthMe(request, env);
  }

  return new Response('Not Found', { status: 404 });
}

// ---------------------------------------------------------------------------
// Room routes — task 5.3 & 5.6
// ---------------------------------------------------------------------------

/**
 * Handles all `/api/rooms` routes.
 *
 * Route table:
 * - `GET  /api/rooms`                  → list public rooms
 * - `POST /api/rooms`                  → create a new room
 * - `POST /api/rooms/load`             → load a saved game into a new room
 * - `GET  /api/rooms/:id/events`       → SSE stream (proxied to DO)
 * - `POST /api/rooms/:id/join`         → join room (proxied to DO)
 * - `POST /api/rooms/:id/move`         → apply move (proxied to DO)
 * - `POST /api/rooms/:id/save`         → save game (proxied to DO)
 * - `POST /api/rooms/:id/leave`        → leave room (proxied to DO)
 * - `GET  /api/rooms/:id/state`        → get room state (proxied to DO)
 *
 * @param request - Incoming request
 * @param url     - Parsed URL
 * @param env     - Worker environment bindings
 */
async function handleRooms(request: Request, url: URL, env: Env): Promise<Response> {
  const path = url.pathname;

  // ── GET /api/rooms ────────────────────────────────────────────────────────
  if (path === '/api/rooms' && request.method === 'GET') {
    // Return in-memory registry filtered to public rooms.
    // For each known room, query its current DO state to get fresh player counts.
    const publicRooms = await Promise.all(
      Array.from(roomRegistry.values())
        .filter((r) => !r.isPrivate)
        .map(async (entry) => {
          try {
            const stub = getRoomStub(entry.roomId, env);
            const stateRes = await forwardToDo(stub, '/state', 'GET');
            if (stateRes.ok) {
              const state = await stateRes.json() as {
                players?: Array<unknown>;
                spectatorCount?: number;
                state?: { winner?: string; turn?: string };
                config?: GameConfig;
              };
              // Update cached player count
              entry.playerCount = state.players?.length ?? 0;
              return {
                id: entry.roomId,
                playerCount: entry.playerCount,
                spectatorCount: state.spectatorCount ?? 0,
                hasWinner: !!(state.state?.winner),
                turn: state.state?.turn ?? 'RED',
                config: state.config ?? entry.config,
              };
            }
          } catch {
            // DO may be evicted/finished — return cached data
          }
          return {
            id: entry.roomId,
            playerCount: entry.playerCount,
            spectatorCount: 0,
            hasWinner: false,
            turn: 'RED',
            config: entry.config,
          };
        }),
    );
    return Response.json(publicRooms);
  }

  // ── POST /api/rooms ───────────────────────────────────────────────────────
  if (path === '/api/rooms' && request.method === 'POST') {
    interface CreateRoomBody {
      config?: GameConfig;
      isPrivate?: boolean;
      password?: string;
    }
    let body: CreateRoomBody = {};
    try {
      body = await request.json() as CreateRoomBody;
    } catch {
      // Empty body is fine — use defaults
    }

    const roomId = makeRoomId();
    const config: GameConfig = body.config ?? { rules: 'CLASSIC', setup: 'CLASSIC' };
    const isPrivate = body.isPrivate ?? false;

    const stub = getRoomStub(roomId, env);
    const doRes = await forwardToDo(stub, '/create', 'POST', {
      roomId,
      config,
      isPrivate,
      password: body.password,
    });

    if (!doRes.ok) {
      return Response.json({ error: 'Failed to create room' }, { status: 500 });
    }

    roomRegistry.set(roomId, { roomId, config, isPrivate, playerCount: 0 });
    return Response.json({ roomId });
  }

  // ── POST /api/rooms/load ──────────────────────────────────────────────────
  // Must be checked before the :roomId pattern to avoid mis-routing.
  if (path === '/api/rooms/load' && request.method === 'POST') {
    // CSRF required
    if (!(await validateCsrf(request, env))) {
      return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    interface LoadBody { gameId: string }
    let body: LoadBody;
    try {
      body = await request.json() as LoadBody;
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const db = new DatabaseManager(env.DB);
    const saved = await db.loadGame(body.gameId);
    if (!saved) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    const roomId = makeRoomId();
    const config: GameConfig = saved.gameState.config ?? { rules: 'CLASSIC', setup: 'CLASSIC' };

    const stub = getRoomStub(roomId, env);
    const doRes = await forwardToDo(stub, '/create', 'POST', {
      roomId,
      config,
      isPrivate: false,
      // Note: the DO initialises with createInitialState; to load a specific
      // state we would need a /load DO endpoint. For now we create the room
      // and the client reconnects — a future enhancement can add /load to the DO.
    });

    if (!doRes.ok) {
      return Response.json({ error: 'Failed to create room for loaded game' }, { status: 500 });
    }

    roomRegistry.set(roomId, { roomId, config, isPrivate: false, playerCount: 0 });
    return Response.json({ roomId, name: saved.name });
  }

  // ── Room-specific routes — extract :roomId ────────────────────────────────
  // Pattern: /api/rooms/:roomId/<action>
  const roomMatch = path.match(/^\/api\/rooms\/([^/]+)(?:\/(.*))?$/);
  if (!roomMatch) {
    return new Response('Not Found', { status: 404 });
  }

  const roomId = roomMatch[1];
  const action = roomMatch[2] ?? '';

  // ── GET /api/rooms/:roomId/events — SSE proxy ─────────────────────────────
  if (action === 'events' && request.method === 'GET') {
    const cookies = parseCookies(request);
    const authToken = cookies['auth_token'];
    const user = authToken ? await optionalAuth(request, env) : null;

    // Assign or reuse a clientId so the DO can track SSE connections.
    const clientId = url.searchParams.get('clientId') ?? crypto.randomUUID();

    const stub = getRoomStub(roomId, env);
    const query: Record<string, string> = { clientId };
    if (user?.userId) query['userId'] = user.userId;

    // Forward the SSE request to the DO and stream the response back.
    const doRes = await forwardToDo(stub, '/events', 'GET', undefined, query);
    return doRes;
  }

  // ── GET /api/rooms/:roomId/state ──────────────────────────────────────────
  if (action === 'state' && request.method === 'GET') {
    const stub = getRoomStub(roomId, env);
    return forwardToDo(stub, '/state', 'GET');
  }

  // ── POST /api/rooms/:roomId/join ──────────────────────────────────────────
  if (action === 'join' && request.method === 'POST') {
    if (!(await validateCsrf(request, env))) {
      return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    interface JoinBody {
      clientId: string;
      name: string;
      password?: string;
    }
    let body: JoinBody;
    try {
      body = await request.json() as JoinBody;
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const user = await optionalAuth(request, env);

    const stub = getRoomStub(roomId, env);
    const doRes = await forwardToDo(stub, '/join', 'POST', {
      ...body,
      userId: user?.userId,
    });

    // Keep registry player count in sync
    if (doRes.ok) {
      const entry = roomRegistry.get(roomId);
      if (entry) {
        const json = await doRes.clone().json() as { spectator?: boolean };
        if (!json.spectator) entry.playerCount = Math.min(2, entry.playerCount + 1);
      }
    }

    return doRes;
  }

  // ── POST /api/rooms/:roomId/move ──────────────────────────────────────────
  if (action === 'move' && request.method === 'POST') {
    if (!(await validateCsrf(request, env))) {
      return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    interface MoveBody { clientId: string; move: unknown }
    let body: MoveBody;
    try {
      body = await request.json() as MoveBody;
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const stub = getRoomStub(roomId, env);
    return forwardToDo(stub, '/move', 'POST', body);
  }

  // ── POST /api/rooms/:roomId/save ──────────────────────────────────────────
  if (action === 'save' && request.method === 'POST') {
    if (!(await validateCsrf(request, env))) {
      return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    interface SaveBody { clientId: string; name: string }
    let body: SaveBody;
    try {
      body = await request.json() as SaveBody;
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const user = await optionalAuth(request, env);

    const stub = getRoomStub(roomId, env);
    return forwardToDo(stub, '/save', 'POST', { ...body, userId: user?.userId });
  }

  // ── POST /api/rooms/:roomId/leave ─────────────────────────────────────────
  if (action === 'leave' && request.method === 'POST') {
    interface LeaveBody { clientId: string }
    let body: LeaveBody;
    try {
      body = await request.json() as LeaveBody;
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const stub = getRoomStub(roomId, env);
    return forwardToDo(stub, '/leave', 'POST', body);
  }

  return new Response('Not Found', { status: 404 });
}

// ---------------------------------------------------------------------------
// Game routes — task 5.4
// ---------------------------------------------------------------------------

/**
 * Handles all `/api/games` routes.
 *
 * Route table:
 * - `GET    /api/games`       → list saved games from D1
 * - `GET    /api/games/:id`   → load a specific saved game from D1
 * - `DELETE /api/games/:id`   → delete a saved game from D1 (CSRF required)
 */
async function handleGames(request: Request, url: URL, env: Env): Promise<Response> {
  const path = url.pathname;
  const db = new DatabaseManager(env.DB);

  // ── GET /api/games ────────────────────────────────────────────────────────
  if (path === '/api/games' && request.method === 'GET') {
    const games = await db.listGames();
    return Response.json(games);
  }

  // Extract :id from /api/games/:id
  const idMatch = path.match(/^\/api\/games\/([^/]+)$/);
  if (idMatch) {
    const gameId = idMatch[1];

    // ── GET /api/games/:id ────────────────────────────────────────────────
    if (request.method === 'GET') {
      const game = await db.loadGame(gameId);
      if (!game) return Response.json({ error: 'Game not found' }, { status: 404 });
      return Response.json(game);
    }

    // ── DELETE /api/games/:id ─────────────────────────────────────────────
    if (request.method === 'DELETE') {
      if (!(await validateCsrf(request, env))) {
        return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
      }
      await db.deleteGame(gameId);
      return Response.json({ success: true });
    }
  }

  return new Response('Not Found', { status: 404 });
}

// ---------------------------------------------------------------------------
// General API routes — task 5.5
// ---------------------------------------------------------------------------

/**
 * Handles `/api/*` routes that are not rooms or games.
 *
 * Route table:
 * - `GET /api/stats/:userId`       → player stats from D1
 * - `GET /api/replays`             → paginated replay list from D1
 * - `GET /api/replays/:id`         → single replay from D1
 * - `GET /api/csrf-token`          → issue CSRF token + set cookie
 * - `GET /api/badge/status`        → server status SVG badge
 * - `GET /api/badge/client-status` → client status SVG badge
 * - `GET /api/user/active-games`   → auth required; active rooms for user
 */
async function handleApi(request: Request, url: URL, env: Env): Promise<Response> {
  const path = url.pathname;
  const db = new DatabaseManager(env.DB);

  // ── GET /api/stats/:userId ────────────────────────────────────────────────
  const statsMatch = path.match(/^\/api\/stats\/([^/]+)$/);
  if (statsMatch && request.method === 'GET') {
    const userId = statsMatch[1];
    const stats = await db.getPlayerStats(userId);
    if (!stats) return Response.json({ error: 'Stats not found' }, { status: 404 });
    return Response.json(stats);
  }

  // ── GET /api/replays/:id ──────────────────────────────────────────────────
  const replayIdMatch = path.match(/^\/api\/replays\/([^/]+)$/);
  if (replayIdMatch && request.method === 'GET') {
    const replayId = replayIdMatch[1];
    const replay = await db.loadReplay(replayId);
    if (!replay) return Response.json({ error: 'Replay not found' }, { status: 404 });
    return Response.json(replay);
  }

  // ── GET /api/replays ──────────────────────────────────────────────────────
  if (path === '/api/replays' && request.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
    const search = url.searchParams.get('search') ?? '';
    const result = await db.listReplays({ limit, offset, search: search || undefined });
    return Response.json(result);
  }

  // ── GET /api/csrf-token ───────────────────────────────────────────────────
  if (path === '/api/csrf-token' && request.method === 'GET') {
    const token = await issueCsrfToken(env);
    const isProduction = env.NODE_ENV === 'production';

    // Set csrf_token cookie — NOT httpOnly so the JS client can read it.
    const cookieParts = [
      `csrf_token=${token}`,
      'Path=/',
      'SameSite=Strict',
      'Max-Age=86400',
    ];
    if (isProduction) cookieParts.push('Secure');

    return new Response(JSON.stringify({ csrfToken: token }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieParts.join('; '),
      },
    });
  }

  // ── GET /api/badge/status ─────────────────────────────────────────────────
  if (path === '/api/badge/status' && request.method === 'GET') {
    const svg = buildBadgeSvg('server', 'online', '#46E3B7');
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache, max-age=0' },
    });
  }

  // ── GET /api/badge/client-status ─────────────────────────────────────────
  if (path === '/api/badge/client-status' && request.method === 'GET') {
    const svg = buildBadgeSvg('client', 'Cloudflare Pages', '#F38020');
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache, max-age=0' },
    });
  }

  // ── GET /api/user/active-games ────────────────────────────────────────────
  if (path === '/api/user/active-games' && request.method === 'GET') {
    let user;
    try {
      user = await optionalAuth(request, env);
    } catch {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Query all known rooms to find ones this user is active in.
    const activeGames = (
      await Promise.all(
        Array.from(roomRegistry.values()).map(async (entry) => {
          try {
            const stub = getRoomStub(entry.roomId, env);
            const stateRes = await forwardToDo(stub, '/state', 'GET');
            if (!stateRes.ok) return null;

            const roomState = await stateRes.json() as {
              players?: Array<{ name: string; color: 'RED' | 'SILVER'; userId?: string }>;
              state?: { winner?: string; turn?: string };
              config?: GameConfig;
            };

            const player = roomState.players?.find((p) => (p as { userId?: string }).userId === user.userId);
            if (!player || roomState.state?.winner) return null;

            return {
              roomId: entry.roomId,
              playerColor: player.color,
              turn: roomState.state?.turn,
              config: roomState.config ?? entry.config,
            };
          } catch {
            return null;
          }
        }),
      )
    ).filter((g): g is NonNullable<typeof g> => g !== null);

    return Response.json(activeGames);
  }

  return new Response('Not Found', { status: 404 });
}

// ---------------------------------------------------------------------------
// Badge SVG helper (inline — avoids importing shared/src/badges.ts which
// uses `process.env`, unavailable in the Workers runtime)
// ---------------------------------------------------------------------------

/**
 * Builds a minimal shields.io-style flat badge SVG inline.
 * Avoids the `badge-maker` import from shared/ which pulls in `process.env`.
 *
 * @param label   - Left-hand label text
 * @param message - Right-hand message text
 * @param color   - Right-hand background colour (hex or CSS colour)
 * @returns SVG string
 */
function buildBadgeSvg(label: string, message: string, color: string): string {
  // Approximate character widths (monospace approximation at 11px)
  const charW = 7;
  const pad = 10;
  const lw = label.length * charW + pad;
  const rw = message.length * charW + pad;
  const totalW = lw + rw;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${label}: ${message}">
  <title>${label}: ${message}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#555"/>
    <rect x="${lw}" width="${rw}" height="20" fill="${color}"/>
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${lw / 2}" y="15" fill="#010101" fill-opacity=".3" aria-hidden="true">${label}</text>
    <text x="${lw / 2}" y="14">${label}</text>
    <text x="${lw + rw / 2}" y="15" fill="#010101" fill-opacity=".3" aria-hidden="true">${message}</text>
    <text x="${lw + rw / 2}" y="14">${message}</text>
  </g>
</svg>`;
}
