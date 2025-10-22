# OpenSphinx (TypeScript, Node.js + Express + Socket.IO + React)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0) [![Deploy JSDoc content to Pages](https://github.com/neoFuzz/OpenSphinx/actions/workflows/deploy-jsdoc.yml/badge.svg)](https://github.com/neoFuzz/OpenSphinx/actions/workflows/deploy-jsdoc.yml)  
[![Render Status](https://img.shields.io/website?url=https%3A%2F%2Fopensphinx.onrender.com%2Fapi%2Frooms&label=Render&logo=render)](https://opensphinx.onrender.com)
[![Cloudflare Status](https://img.shields.io/website?url=https%3A%2F%2Fopensphinx.pages.dev&label=Cloudflare&logo=cloudflare)](https://opensphinx.online)  
[![Server Status](https://opensphinx.onrender.com/api/badge/status)](https://opensphinx.onrender.com)
[![Client Status](https://opensphinx.onrender.com/api/badge/client-status)](https://opensphinx.pages.dev)

A modern, web-based implementation of Laser Chess (also known as Khet) - the strategic board game where players use mirrors and lasers to capture pieces and outmaneuver their opponent.

**[Live Game](https://opensphinx.online)** | **[API Documentation](https://neofuzz.github.io/OpenSphinx/)**

This monorepo contains:

- `server/` – Authoritative game server built with Node.js, Express, Socket.IO and SQLite for game persistence
- `client/` – Interactive game client with 3D board view (React, Vite, Three.js) and 2D board view (HTML/CSS) with animated laser effects
- `shared/` – Core TypeScript game engine handling rules, laser mechanics, and game state, shared between client and server

## Prerequisites
- Node.js 20+
- npm 8+ (supports workspaces)
- Modern browser with WebSocket support (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

## Install
```bash
npm install --workspaces
```

## Run (two terminals)
```bash
# Terminal 1 – Server
npm run dev --workspace server

# Terminal 2 – Client
npm run dev --workspace client
```
Open the client at the URL Vite prints (typically http://localhost:5173). The client expects the server at `http://localhost:3001`.

## Build for Production
```bash
# Build all workspaces
npm run build --workspaces

# Start production server
NODE_ENV=production npm run start --workspace server
```

Production builds are optimized and minified. The client build outputs to `client/dist/` and can be served statically or deployed to CDN/hosting platforms like Cloudflare Pages or Vercel.

## Configuration

### Environment Variables
- **Server** (`server/.env`):
  ```bash
  PORT=3001 # Server port
  HOST=0.0.0.0 # Server host (0.0.0.0 for external access)
  CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173 # Allowed client origins
  NODE_ENV=development # Environment mode
  
  # Discord OAuth (optional)
  DISCORD_CLIENT_ID=your_discord_client_id
  DISCORD_CLIENT_SECRET=your_discord_client_secret
  DISCORD_REDIRECT_URI=http://localhost:3001/auth/discord/callback
  
  # Security
  JWT_SECRET=your_secure_random_string
  CSRF_SECRET=your_csrf_secret_key
  ```
- **Client** (`client/.env`):
  ```bash
  VITE_SERVER_URL=http://localhost:3001 # Server URL
  ```

### Network Access
For network access, update `CLIENT_URLS` in `server/.env` and create `client/.env.local`:
```bash
# server/.env
CLIENT_URLS=http://localhost:5173,http://192.168.x.x:5173

# client/.env.local
VITE_SERVER_URL=http://192.168.x.x:3001
```

## Folder structure
```
OpenSphinx/
├─ server/
├─ client/
└─ shared/
```

## Technology Stack
- **Frontend**: React 18, Vite, Three.js, TypeScript
- **Backend**: Node.js, Express, Socket.IO, TypeScript
- **Database**: SQLite with better-sqlite3
- **Authentication**: Discord OAuth 2.0, JWT
- **Security**: Helmet, CSRF tokens, rate limiting
- **Logging**: Winston
- **Testing**: Jest, React Testing Library

## Features
- **3D Graphics**: Three.js-powered 3D game board with models, textures, and animations
- **2D View**: Alternative HTML/CSS board view with animated laser effects (toggle with view switcher)
- **Game Persistence**: Save and load games using SQLite database
- **Authentication**: Discord OAuth integration with JWT tokens
- **Security**: CSRF protection, rate limiting, and helmet security headers
- **Networking**: Room-based multiplayer system supporting 2 players per game with spectator mode for additional viewers
- **Room Management**: Create or join game rooms with unique room codes
- **Rules**: Basic laser chess variant — move one orthogonal step or rotate 90°, then fire the active player's laser. Pharaoh hit ends the game
- **Save/Load**: Games can be saved with custom names and resumed later
- **Game Management**: View, load, and delete saved games through the UI
- **Audio**: Sound effects and audio feedback
- **Logging**: Winston-based logging system

## Game Save/Load
- Click "Save Game" during an active game to save the current state
- Click "Load Game" to view and load previously saved games
- Saved games include the complete board state and can be resumed from any point
- Games are stored in SQLite database (`games.db`) on the server

## API Endpoints
- `GET /api/games` - List all saved games
- `DELETE /api/games/:id` - Delete a saved game
- `GET /auth/discord` - Discord OAuth login
- `GET /auth/discord/callback` - Discord OAuth callback
- `POST /auth/logout` - User logout

## Socket Events
- `game:save` - Save current game state
- `game:load` - Load a saved game
- `game:saved` - Confirmation of save operation
- `room:create` - Create a new game room
- `room:join` - Join an existing room
- `game:move` - Submit a player move
- `game:state` - Receive game state updates

## API Documentation
Full API documentation is available at [https://neofuzz.github.io/OpenSphinx/](https://neofuzz.github.io/OpenSphinx/)

## Troubleshooting

### Connection Issues
- **CORS errors**: Ensure `CLIENT_URLS` in `server/.env` includes your client URL
- **WebSocket connection failed**: Check firewall/proxy settings allow WebSocket connections
- **Server not responding**: Verify server is running on correct port with `netstat -an | findstr :3001` (Windows) or `lsof -i :3001` (Unix)

### Port Conflicts
- If port 3001 or 5173 is in use, update `PORT` in `server/.env` and `VITE_SERVER_URL` in `client/.env`
- Kill existing processes: `npx kill-port 3001 5173`

### Database Issues
- SQLite database is auto-created at `server/games.db` on first run
- Delete `games.db` to reset all saved games
- Check file permissions if database creation fails

### Build Errors
- Clear node_modules: `rm -rf node_modules package-lock.json && npm install --workspaces`
- Ensure Node.js version is 20 or higher: `node --version`
- TypeScript errors: Run `npm run type-check --workspaces` to identify issues

## Contributing
Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes following the existing code style
4. Ensure TypeScript compiles without errors: `npm run build --workspaces`
5. Test your changes locally
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
