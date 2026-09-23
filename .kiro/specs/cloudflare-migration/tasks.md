# Implementation Plan: Cloudflare Migration

## Overview

Migrate the OpenSphinx game server from a Node.js/Express/Socket.IO backend on Render.com to Cloudflare Workers with Durable Objects (for real-time room state), D1 (for persistent storage), and SSE (replacing Socket.IO). The client is updated to use native `EventSource` and `fetch` instead of the Socket.IO client library.

## Tasks

## [ ] 1 — Scaffold `server-worker/` package

- [x] 1.1 Create `server-worker/package.json` with `wrangler`, `@cloudflare/workers-types`, `jose`, and `typescript` as dependencies; add `@laser/shared` workspace reference
- [x] 1.2 Create `server-worker/tsconfig.json` — strict mode, target `ES2022`, lib `["ES2022"]`, types `["@cloudflare/workers-types"]`
- [x] 1.3 Create `server-worker/wrangler.toml` with DO binding (`GAME_ROOM`), D1 binding (`DB`), vars, and route configuration
- [x] 1.4 Create `server-worker/src/types.ts` defining the `Env` interface for all bindings and secrets
- [x] 1.5 Add `server-worker` to the root `package.json` workspaces array
- [x] 1.6 Verify `npx wrangler dev` starts without errors (empty worker stub)

---

## [ ] 2 — D1 database layer

- [x] 2.1 Create `server-worker/schema.sql` with the four table definitions (`users`, `saved_games`, `game_replays`, `player_stats`) identical to the existing SQLite schema
- [x] 2.2 Run `wrangler d1 create opensphinx` and update `wrangler.toml` with the returned `database_id`
- [x] 2.3 Run `wrangler d1 execute opensphinx --file=schema.sql` to apply schema to local D1
- [x] 2.4 Create `server-worker/src/database.ts` — `DatabaseManager` class with D1 bindings replacing `better-sqlite3`; methods: `saveGame`, `loadGame`, `listGames`, `deleteGame`, `saveReplay`, `loadReplay`, `listReplays`, `createUser`, `getUserByDiscordId`, `updateUser`, `updatePlayerStats`, `getPlayerStats`
- [x] 2.5 Verify all queries use `stmt.bind(...).run()` / `.first()` / `.all().results` (D1 API — not better-sqlite3 spread syntax)

---

## [ ] 3 — Authentication & security helpers

- [x] 3.1 Create `server-worker/src/auth.ts` — Discord OAuth handlers (`/auth/discord`, `/auth/discord/callback`, `/auth/logout`, `/auth/me`) using `fetch` for token exchange; JWT signing/verification via `jose` (`SignJWT`, `jwtVerify`) with `HS256`
- [x] 3.2 Implement `issueCsrfToken` and `validateCsrf` in `auth.ts` using `crypto.randomUUID()` and a HMAC signature against `env.CSRF_SECRET`
- [x] 3.3 Create `server-worker/src/middleware.ts` — `securityHeaders()`, `corsHeaders()`, `authenticateToken()`, `optionalAuth()` as pure functions operating on `Request`/`Response` (no Express types)
- [x] 3.4 Implement rate limiting: lightweight in-memory counter map reset on a per-minute basis, or document configuration of Cloudflare Rate Limiting rules in `wrangler.toml` as alternative
- [x] 3.5 Set all secrets via `wrangler secret put`: `JWT_SECRET`, `CSRF_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `CLIENT_URLS`

---

## [ ] 4 — GameRoom Durable Object

- [x] 4.1 Create `server-worker/src/room.ts` — `GameRoom` class extending `DurableObject`
- [x] 4.2 Implement DO SQLite schema inside the DO constructor using `this.ctx.storage.sql.exec(...)`: `room_meta` table (key/value for id, config, players, gameState) and `game_history` table (seq + game_state JSON per move)
- [x] 4.3 Implement constructor hydration via `state.blockConcurrencyWhile()` — on wake, read `room_meta` and `game_state` from DO storage and restore `game_history` rows into the in-memory `gameStates[]` array; if storage is empty the DO is freshly created
- [x] 4.4 Implement in-memory state fields: `players`, `spectators` (Set of clientIds), `gameState`, `gameStates[]`, `config`, `isPrivate`, `password`, `finishedAt`
- [x] 4.5 Implement `connections: Map<string, { writer: WritableStreamDefaultWriter; userId?: string }>` for SSE fan-out (never persisted)
- [x] 4.6 Implement `persistMove(newState)` — appends row to `game_history` table AND overwrites `game_state` in DO storage (2 writes per move); called after every valid `applyMove`
- [x] 4.7 Implement `persistMeta()` — writes `room_meta` JSON to DO storage; called on room creation and on player join/leave
- [x] 4.8 Implement `broadcast(event, data)` — iterates connections, writes SSE payload, removes dead connections on write failure
- [x] 4.9 Implement `sendTo(clientId, event, data)` — single-client SSE write
- [x] 4.10 Implement internal HTTP routes on the DO's `fetch` handler:
  - `GET /events` — assign `clientId`, open `TransformStream`, add writer to connections, push `room:state` immediately (covers reconnect after eviction), return `ReadableStream` as SSE response
  - `POST /join` — validate password, anti-self-play check, assign color or spectator, call `persistMeta()`, broadcast `room:state`
  - `POST /move` — validate player + turn, call `applyMove` from shared engine, call `persistMove(newState)`; broadcast `game:state`; on win: broadcast `game:end`, update D1 stats, flush `game_history` rows to D1 `saveReplay`, auto-save final state to D1 `saveGame`, call `this.ctx.storage.setAlarm(Date.now() + 30_000)`
  - `POST /save` — save current `gameState` to D1, send `game:saved` to requesting client only
  - `POST /leave` — remove client from players/spectators/connections, call `persistMeta()`, broadcast updated `room:state`
  - `GET /state` — return current `publicState()` as JSON
- [x] 4.11 Implement `alarm()` — calls `this.ctx.storage.deleteAll()` to wipe all DO SQLite tables and KV entries; DO is evicted after storage clears
- [x] 4.12 Export `GameRoom` from `server-worker/src/index.ts` (required by Wrangler for DO registration)

---

## [ ] 5 — Workers fetch handler & routing

- [x] 5.1 Create `server-worker/src/index.ts` — default export with `fetch(request, env, ctx)` handler
- [x] 5.2 Implement URL router covering all paths in FR-2; apply CORS headers and security headers to every response
- [x] 5.3 Implement `handleRooms`: `GET /api/rooms` (list public rooms via DO state), `POST /api/rooms` (create room — generate ID, get DO stub, forward to DO), `GET /api/rooms/:roomId/events` (forward to DO `/events`), `POST /api/rooms/:roomId/join`, `POST /api/rooms/:roomId/move`, `POST /api/rooms/:roomId/save`, `POST /api/rooms/load`
- [x] 5.4 Implement `handleGames`: delegates to `DatabaseManager` for list/delete/load saved games
- [x] 5.5 Implement `handleApi`: stats, replays, CSRF token, badge endpoints, active-games, health
- [x] 5.6 For all room-specific routes: resolve DO stub via `env.GAME_ROOM.idFromName(roomId)` then `env.GAME_ROOM.get(id)`; forward the request to the DO
- [x] 5.7 On server startup (`fetch` first call), create the default public room (`KHET_2_0` + `CLASSIC`) if no rooms exist — or handle this via a startup request in `wrangler.toml` `[triggers]`

---

## [ ] 6 — Client: remove Socket.IO, add SSE + fetch

- [x] 6.1 Remove `socket.io-client` from `client/package.json`
- [x] 6.2 Delete `client/src/socket.ts`
- [x] 6.3 Create `client/src/sse.ts` — `connectToRoom(roomId)` returning `EventSource` with `withCredentials: true`; `disconnectFromRoom()`; helper `postToRoom(roomId, action, payload, csrfToken)` wrapping `fetch` POST
- [x] 6.4 Update `client/src/state/game.ts` (Zustand store) — replace `socket.on(...)` subscriptions with `EventSource.addEventListener(...)` for `room:state`, `game:state`, `game:end`, `game:saved`
- [x] 6.5 Update all components that call `socket.emit(...)` to call `postToRoom(...)` instead:
  - `room:create` → `POST /api/rooms`
  - `room:join` → `POST /api/rooms/:roomId/join`
  - `game:move` → `POST /api/rooms/:roomId/move`
  - `game:save` → `POST /api/rooms/:roomId/save`
  - `game:load` → `POST /api/rooms/load`
- [x] 6.6 Update `client/src/state/auth.ts` or relevant component to fetch `/api/csrf-token` on load and store the token for use in POST headers
- [x] 6.7 Update `client/.env.example` to remove Socket.IO-specific variables; verify `VITE_SERVER_URL` points at the Worker URL for production
- [x] 6.8 Run `npm run build --workspace client` and confirm zero errors

---

## [ ] 7 — Integration testing & staging deployment

- [x] 7.1 Run `wrangler dev` locally and run through the full game flow manually: create room → join as both players (two browser tabs) → play moves → laser animation → game end → save/load
- [x] 7.2 Verify spectator SSE stream receives all events in real time (third browser tab)
- [x] 7.3 Verify Discord OAuth login flow end-to-end in local dev
- [x] 7.4 Deploy to Cloudflare staging (`wrangler deploy --env staging`)
- [x] 7.5 Point a staging client build at the staging Worker URL and repeat the full game flow test
- [x] 7.6 Run `wrangler d1 execute opensphinx --file=schema.sql --env production` to apply schema to production D1

---

## [ ] 8 — Production cutover

- [x] 8.1 Deploy Worker to production (`wrangler deploy`)
- [x] 8.2 Update `client/.env` (or Cloudflare Pages environment variable) to point `VITE_SERVER_URL` at the production Worker URL
- [x] 8.3 Deploy updated client to Cloudflare Pages
- [x] 8.4 Smoke test production: create room, play a full game, verify save/load, verify Discord login
- [x] 8.5 Monitor Worker logs in Cloudflare dashboard for errors
- [x] 8.6 Decommission Render.com server once production is confirmed stable

---

[ ] 9 — Update steering & documentation

- [x] 9.1 Update `.kiro/steering/tech.md` — remove `server/` package entries; add `server-worker/` entries (Wrangler, Durable Objects, D1, jose); update dev commands to use `wrangler dev`
- [x] 9.2 Update `.kiro/steering/structure.md` — replace `server/` directory tree with `server-worker/` tree; update inter-package relationships (remove Socket.IO row, add SSE row)
- [x] 9.3 Update `README.md` — replace Render deployment info with Cloudflare Workers info; update run/build/deploy instructions; remove Socket.IO from tech stack table
- [x] 9.4 Update `client/README.md` if it exists
- [x] 9.5 Remove old `server/` package from the repository (or archive it in a `_archive/` directory)

---

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2] },
    { "wave": 3, "tasks": [3] },
    { "wave": 4, "tasks": [4] },
    { "wave": 5, "tasks": [5] },
    { "wave": 6, "tasks": [6] },
    { "wave": 7, "tasks": [7] },
    { "wave": 8, "tasks": [8] },
    { "wave": 9, "tasks": [9] }
  ]
}
```

Tasks 1–5 are strictly sequential — each builds on the previous. Task 6 can begin once Task 5's API contract is stable. Tasks 7–9 follow in order after all implementation tasks are complete.

## Notes

- All Worker code must target the Cloudflare Workers runtime (not Node.js). Avoid Node-specific APIs; use Web Standard APIs (`fetch`, `crypto`, `ReadableStream`, etc.).
- The `server/` package remains untouched until Task 8 is confirmed stable in production. Run both environments in parallel during Task 7.
- Durable Object SQLite (`this.ctx.storage.sql`) is distinct from D1. DO storage holds ephemeral room state; D1 holds durable player/game records.
- SSE connections are stateless from the Worker's perspective — the DO owns all connection state. The Worker simply proxies `/events` requests to the correct DO stub.
- CSRF tokens issued by the Worker use a HMAC signature (via `SubtleCrypto`) rather than the Express `csurf` middleware pattern.
- Rate limiting preference: use Cloudflare's native Rate Limiting rules in `wrangler.toml` where possible; fall back to an in-memory counter map only for cases not covered by native rules.
