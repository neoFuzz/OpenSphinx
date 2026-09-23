# Tasks — Cloudflare Migration

## Task 1 — Scaffold `server-worker/` package

- [ ] Create `server-worker/package.json` with `wrangler`, `@cloudflare/workers-types`, `jose`, and `typescript` as dependencies; add `@laser/shared` workspace reference
- [ ] Create `server-worker/tsconfig.json` — strict mode, target `ES2022`, lib `["ES2022"]`, types `["@cloudflare/workers-types"]`
- [ ] Create `server-worker/wrangler.toml` with DO binding (`GAME_ROOM`), D1 binding (`DB`), vars, and route configuration
- [ ] Create `server-worker/src/types.ts` defining the `Env` interface for all bindings and secrets
- [ ] Add `server-worker` to the root `package.json` workspaces array
- [ ] Verify `npx wrangler dev` starts without errors (empty worker stub)

---

## Task 2 — D1 database layer

- [ ] Create `server-worker/schema.sql` with the four table definitions (`users`, `saved_games`, `game_replays`, `player_stats`) identical to the existing SQLite schema
- [ ] Run `wrangler d1 create opensphinx` and update `wrangler.toml` with the returned `database_id`
- [ ] Run `wrangler d1 execute opensphinx --file=schema.sql` to apply schema to local D1
- [ ] Create `server-worker/src/database.ts` — `DatabaseManager` class with D1 bindings replacing `better-sqlite3`; methods: `saveGame`, `loadGame`, `listGames`, `deleteGame`, `saveReplay`, `loadReplay`, `listReplays`, `createUser`, `getUserByDiscordId`, `updateUser`, `updatePlayerStats`, `getPlayerStats`
- [ ] Verify all queries use `stmt.bind(...).run()` / `.first()` / `.all().results` (D1 API — not better-sqlite3 spread syntax)

---

## Task 3 — Authentication & security helpers

- [ ] Create `server-worker/src/auth.ts` — Discord OAuth handlers (`/auth/discord`, `/auth/discord/callback`, `/auth/logout`, `/auth/me`) using `fetch` for token exchange; JWT signing/verification via `jose` (`SignJWT`, `jwtVerify`) with `HS256`
- [ ] Implement `issueCsrfToken` and `validateCsrf` in `auth.ts` using `crypto.randomUUID()` and a HMAC signature against `env.CSRF_SECRET`
- [ ] Create `server-worker/src/middleware.ts` — `securityHeaders()`, `corsHeaders()`, `authenticateToken()`, `optionalAuth()` as pure functions operating on `Request`/`Response` (no Express types)
- [ ] Implement rate limiting: lightweight in-memory counter map reset on a per-minute basis, or document configuration of Cloudflare Rate Limiting rules in `wrangler.toml` as alternative
- [ ] Set all secrets via `wrangler secret put`: `JWT_SECRET`, `CSRF_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `CLIENT_URLS`

---

## Task 4 — GameRoom Durable Object

- [ ] Create `server-worker/src/room.ts` — `GameRoom` class extending `DurableObject`
- [ ] Implement DO SQLite schema inside the DO constructor using `this.ctx.storage.sql.exec(...)`: `room_meta` table (key/value for id, config, players, gameState) and `game_history` table (seq + game_state JSON per move)
- [ ] Implement constructor hydration via `state.blockConcurrencyWhile()` — on wake, read `room_meta` and `game_state` from DO storage and restore `game_history` rows into the in-memory `gameStates[]` array; if storage is empty the DO is freshly created
- [ ] Implement in-memory state fields: `players`, `spectators` (Set of clientIds), `gameState`, `gameStates[]`, `config`, `isPrivate`, `password`, `finishedAt`
- [ ] Implement `connections: Map<string, { writer: WritableStreamDefaultWriter; userId?: string }>` for SSE fan-out (never persisted)
- [ ] Implement `persistMove(newState)` — appends row to `game_history` table AND overwrites `game_state` in DO storage (2 writes per move); called after every valid `applyMove`
- [ ] Implement `persistMeta()` — writes `room_meta` JSON to DO storage; called on room creation and on player join/leave
- [ ] Implement `broadcast(event, data)` — iterates connections, writes SSE payload, removes dead connections on write failure
- [ ] Implement `sendTo(clientId, event, data)` — single-client SSE write
- [ ] Implement internal HTTP routes on the DO's `fetch` handler:
  - `GET /events` — assign `clientId`, open `TransformStream`, add writer to connections, push `room:state` immediately (covers reconnect after eviction), return `ReadableStream` as SSE response
  - `POST /join` — validate password, anti-self-play check, assign color or spectator, call `persistMeta()`, broadcast `room:state`
  - `POST /move` — validate player + turn, call `applyMove` from shared engine, call `persistMove(newState)`; broadcast `game:state`; on win: broadcast `game:end`, update D1 stats, flush `game_history` rows to D1 `saveReplay`, auto-save final state to D1 `saveGame`, call `this.ctx.storage.setAlarm(Date.now() + 30_000)`
  - `POST /save` — save current `gameState` to D1, send `game:saved` to requesting client only
  - `POST /leave` — remove client from players/spectators/connections, call `persistMeta()`, broadcast updated `room:state`
  - `GET /state` — return current `publicState()` as JSON
- [ ] Implement `alarm()` — calls `this.ctx.storage.deleteAll()` to wipe all DO SQLite tables and KV entries; DO is evicted after storage clears
- [ ] Export `GameRoom` from `server-worker/src/index.ts` (required by Wrangler for DO registration)

---

## Task 5 — Workers fetch handler & routing

- [ ] Create `server-worker/src/index.ts` — default export with `fetch(request, env, ctx)` handler
- [ ] Implement URL router covering all paths in FR-2; apply CORS headers and security headers to every response
- [ ] Implement `handleRooms`: `GET /api/rooms` (list public rooms via DO state), `POST /api/rooms` (create room — generate ID, get DO stub, forward to DO), `GET /api/rooms/:roomId/events` (forward to DO `/events`), `POST /api/rooms/:roomId/join`, `POST /api/rooms/:roomId/move`, `POST /api/rooms/:roomId/save`, `POST /api/rooms/load`
- [ ] Implement `handleGames`: delegates to `DatabaseManager` for list/delete/load saved games
- [ ] Implement `handleApi`: stats, replays, CSRF token, badge endpoints, active-games, health
- [ ] For all room-specific routes: resolve DO stub via `env.GAME_ROOM.idFromName(roomId)` then `env.GAME_ROOM.get(id)`; forward the request to the DO
- [ ] On server startup (`fetch` first call), create the default public room (`KHET_2_0` + `CLASSIC`) if no rooms exist — or handle this via a startup request in `wrangler.toml` `[triggers]`

---

## Task 6 — Client: remove Socket.IO, add SSE + fetch

- [ ] Remove `socket.io-client` from `client/package.json`
- [ ] Delete `client/src/socket.ts`
- [ ] Create `client/src/sse.ts` — `connectToRoom(roomId)` returning `EventSource` with `withCredentials: true`; `disconnectFromRoom()`; helper `postToRoom(roomId, action, payload, csrfToken)` wrapping `fetch` POST
- [ ] Update `client/src/state/game.ts` (Zustand store) — replace `socket.on(...)` subscriptions with `EventSource.addEventListener(...)` for `room:state`, `game:state`, `game:end`, `game:saved`
- [ ] Update all components that call `socket.emit(...)` to call `postToRoom(...)` instead:
  - `room:create` → `POST /api/rooms`
  - `room:join` → `POST /api/rooms/:roomId/join`
  - `game:move` → `POST /api/rooms/:roomId/move`
  - `game:save` → `POST /api/rooms/:roomId/save`
  - `game:load` → `POST /api/rooms/load`
- [ ] Update `client/src/state/auth.ts` or relevant component to fetch `/api/csrf-token` on load and store the token for use in POST headers
- [ ] Update `client/.env.example` to remove Socket.IO-specific variables; verify `VITE_SERVER_URL` points at the Worker URL for production
- [ ] Run `npm run build --workspace client` and confirm zero errors

---

## Task 7 — Integration testing & staging deployment

- [ ] Run `wrangler dev` locally and run through the full game flow manually: create room → join as both players (two browser tabs) → play moves → laser animation → game end → save/load
- [ ] Verify spectator SSE stream receives all events in real time (third browser tab)
- [ ] Verify Discord OAuth login flow end-to-end in local dev
- [ ] Deploy to Cloudflare staging (`wrangler deploy --env staging`)
- [ ] Point a staging client build at the staging Worker URL and repeat the full game flow test
- [ ] Run `wrangler d1 execute opensphinx --file=schema.sql --env production` to apply schema to production D1

---

## Task 8 — Production cutover

- [ ] Deploy Worker to production (`wrangler deploy`)
- [ ] Update `client/.env` (or Cloudflare Pages environment variable) to point `VITE_SERVER_URL` at the production Worker URL
- [ ] Deploy updated client to Cloudflare Pages
- [ ] Smoke test production: create room, play a full game, verify save/load, verify Discord login
- [ ] Monitor Worker logs in Cloudflare dashboard for errors
- [ ] Decommission Render.com server once production is confirmed stable

---

## Task 9 — Update steering & documentation

- [ ] Update `.kiro/steering/tech.md` — remove `server/` package entries; add `server-worker/` entries (Wrangler, Durable Objects, D1, jose); update dev commands to use `wrangler dev`
- [ ] Update `.kiro/steering/structure.md` — replace `server/` directory tree with `server-worker/` tree; update inter-package relationships (remove Socket.IO row, add SSE row)
- [ ] Update `README.md` — replace Render deployment info with Cloudflare Workers info; update run/build/deploy instructions; remove Socket.IO from tech stack table
- [ ] Update `client/README.md` if it exists
- [ ] Remove old `server/` package from the repository (or archive it in a `_archive/` directory)
