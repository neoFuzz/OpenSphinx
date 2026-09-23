# OpenSphinx (TypeScript, Cloudflare Workers + React)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0) [![Deploy JSDoc content to Pages](https://github.com/neoFuzz/OpenSphinx/actions/workflows/deploy-jsdoc.yml/badge.svg)](https://github.com/neoFuzz/OpenSphinx/actions/workflows/deploy-jsdoc.yml)
[![Cloudflare Status](https://img.shields.io/website?url=https%3A%2F%2Fopensphinx.pages.dev&label=Cloudflare&logo=cloudflare)](https://opensphinx.online)

A modern, web-based implementation of Laser Chess (also known as Khet) — the strategic board game where players use mirrors and lasers to capture pieces and outmaneuver their opponent.

**[Live Game](https://opensphinx.online)** | **[API Documentation](https://neofuzz.github.io/OpenSphinx/)**

This monorepo contains:

- `server-worker/` – Authoritative game server built on Cloudflare Workers, Durable Objects (room state + SSE fan-out), and D1 (persistence)
- `client/` – Interactive game client with 3D board view (React, Vite, Three.js) and 2D board view (HTML/CSS) with animated laser effects
- `shared/` – Core TypeScript game engine handling rules, laser mechanics, and game state, shared between client and server

## Prerequisites
- Node.js 20+
- npm 8+ (supports workspaces)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`) for Worker development
- Modern browser with EventSource/SSE support (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

## Install
```bash
npm install --workspaces
```

## Run (two terminals)
```bash
# Terminal 1 – Worker (Cloudflare Workers dev server)
cd server-worker
npx wrangler dev

# Terminal 2 – Client
npm run dev --workspace client
```
Open the client at the URL Vite prints (typically http://localhost:5173). The client expects the Worker at `http://localhost:8787`.

Set `VITE_SERVER_URL=http://localhost:8787` in `client/.env` for local development.

## Build for Production
```bash
# Build client (output to client/dist/)
npm run build --workspace client

# Deploy Worker to Cloudflare
cd server-worker
npx wrangler deploy
```

## Deploy

### Cloudflare Workers (backend)
1. [Create a Cloudflare account](https://dash.cloudflare.com/sign-up) and install Wrangler
2. Authenticate: `wrangler login`
3. Create the D1 database: `wrangler d1 create opensphinx` — update `database_id` in `server-worker/wrangler.toml`
4. Apply the schema: `wrangler d1 execute opensphinx --file=server-worker/schema.sql`
5. Set secrets:
   ```bash
   cd server-worker
   wrangler secret put JWT_SECRET
   wrangler secret put CSRF_SECRET
   wrangler secret put DISCORD_CLIENT_ID
   wrangler secret put DISCORD_CLIENT_SECRET
   wrangler secret put DISCORD_REDIRECT_URI
   wrangler secret put CLIENT_URLS
   ```
6. Deploy: `wrangler deploy`

### Cloudflare Pages (frontend)
The client is deployed as a static site to Cloudflare Pages. Set the `VITE_SERVER_URL` environment variable in the Pages project settings to point at the deployed Worker URL.

## Configuration

### Worker Secrets
Secrets are managed via `wrangler secret put` (never committed to source control):
```
JWT_SECRET              – used to sign/verify JWT auth tokens
CSRF_SECRET             – used for HMAC CSRF token signatures
DISCORD_CLIENT_ID       – Discord OAuth app client ID
DISCORD_CLIENT_SECRET   – Discord OAuth app client secret
DISCORD_REDIRECT_URI    – e.g. https://opensphinx-server.workers.dev/auth/discord/callback
CLIENT_URLS             – comma-separated allowed CORS origins
```

Non-secret config lives in `server-worker/wrangler.toml` under `[vars]`:
```toml
[vars]
ALLOWED_DOMAIN = "opensphinx.online"
```

### Client Environment
**`client/.env`**:
```bash
VITE_SERVER_URL=https://opensphinx-server.workers.dev  # production Worker URL
# For local dev: VITE_SERVER_URL=http://localhost:8787
```

### Network Access
For local network testing, set `VITE_SERVER_URL` in `client/.env.local` to the Wrangler dev URL exposed on your network interface.

## Folder structure
```
OpenSphinx/
├─ server-worker/
├─ client/
└─ shared/
```

## Technology Stack
- **Frontend**: React 19, Vite, Three.js, TypeScript
- **Backend**: Cloudflare Workers, Durable Objects, D1 (SQLite-compatible)
- **Real-time**: Server-Sent Events (SSE) via native `EventSource`
- **Authentication**: Discord OAuth 2.0, JWT (jose)
- **Security**: SubtleCrypto CSRF, CORS headers, rate limiting
- **Logging**: Cloudflare Workers console / dashboard
- **Testing**: Jest, React Testing Library

## Features
- **3D Graphics**: Three.js-powered 3D game board with models, textures, and animations
- **2D View**: Alternative HTML/CSS board view with animated laser effects (toggle with view switcher)
- **Game Persistence**: Save and load games using Cloudflare D1
- **Authentication**: Discord OAuth integration with JWT tokens
- **Security**: CSRF protection, rate limiting, and security headers
- **Networking**: Room-based multiplayer system supporting 2 players per game with spectator mode for additional viewers; real-time events delivered via SSE
- **Room Management**: Create or join game rooms with unique room codes
- **Rules**: Basic laser chess variant — move one orthogonal step or rotate 90°, then fire the active player's laser. Pharaoh hit ends the game
- **Save/Load**: Games can be saved with custom names and resumed later
- **Game Management**: View, load, and delete saved games through the UI
- **Audio**: Sound effects and audio feedback
- **Logging**: Structured logging via Cloudflare Workers dashboard

## Game Save/Load
- Click "Save Game" during an active game to save the current state
- Click "Load Game" to view and load previously saved games
- Saved games include the complete board state and can be resumed from any point
- Games are stored in Cloudflare D1 on the server

## API Endpoints
- `GET /api/rooms` — List public rooms
- `POST /api/rooms` — Create a room
- `POST /api/rooms/:roomId/join` — Join a room
- `POST /api/rooms/:roomId/move` — Submit a move
- `POST /api/rooms/:roomId/save` — Save game
- `POST /api/rooms/load` — Load a saved game
- `GET /api/rooms/:roomId/events` — SSE stream (real-time game events)
- `GET /api/games` — List saved games
- `DELETE /api/games/:id` — Delete a saved game
- `GET /api/csrf-token` — Issue a CSRF token
- `GET /auth/discord` — Discord OAuth login
- `GET /auth/discord/callback` — Discord OAuth callback
- `POST /auth/logout` — User logout
- `GET /auth/me` — Current user info
- `GET /health` — Health check

## SSE Events
The `GET /api/rooms/:roomId/events` endpoint is an SSE stream. The client subscribes with the native `EventSource` API and receives the following named events:

| Event | Payload | When |
|-------|---------|------|
| `room:state` | `{ roomId, players, state, config }` | On join; on player connect/disconnect |
| `game:state` | `{ state: GameState, ack? }` | After every valid move |
| `game:end` | `{ winner: Player }` | When Pharaoh is hit |
| `game:saved` | `{ success, error? }` | After save completes |

## API Documentation
Full API documentation is available at [https://neofuzz.github.io/OpenSphinx/](https://neofuzz.github.io/OpenSphinx/)

## Troubleshooting

### Connection Issues
- **CORS errors**: Ensure `CLIENT_URLS` secret includes your client's origin
- **SSE connection failed**: Check that `VITE_SERVER_URL` in `client/.env` points at the correct Worker URL
- **Worker not responding**: Check the Cloudflare Workers dashboard logs, or run `wrangler tail` for live log streaming

### Port Conflicts
- Wrangler dev defaults to port 8787. Change it with `wrangler dev --port <PORT>`
- Client Vite dev defaults to 5173. If in use, Vite will choose the next available port automatically

### Database Issues
- D1 schema is applied once via `wrangler d1 execute opensphinx --file=server-worker/schema.sql`
- To reset local D1 data: delete the local `.wrangler/` directory and re-apply the schema

### Build Errors
- Clear node_modules: `rm -rf node_modules package-lock.json && npm install --workspaces`
- Ensure Node.js version is 20 or higher: `node --version`
- TypeScript errors in the worker: `cd server-worker && npx tsc --noEmit`

## Contributing
Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes following the existing code style
4. Ensure TypeScript compiles without errors: `npm run build --workspaces`
5. Test your changes locally with `wrangler dev` + `npm run dev --workspace client`
6. Commit with clear messages: `git commit -m "Add: feature description"`
7. Push to your fork: `git push origin feature/your-feature`
8. Open a Pull Request with a description of your changes

### Code Style
- Use TypeScript strict mode
- Follow existing formatting conventions
- Add JSDoc comments for public APIs
- Keep functions small and focused

## License
GNU Affero General Public License v3.0 - see [LICENSE](LICENSE) file for details.

This project is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. If you modify this program and provide it as a network service, you must make the source code available to users.

## Notes
- Extend easily to match strict Khet 2.0 rules (pyramid one-sidedness, Djed swap, official setups) in `shared/src/engine`
- `.env.local` files are gitignored for local overrides
- The `server/` directory (legacy Node.js/Express server) is preserved as a reference implementation but is no longer the active backend
