# OpenSphinx (TypeScript, Node.js + Express + Socket.IO + React)
[![Deploy JSDoc content to Pages](https://github.com/neoFuzz/OpenSphinx/actions/workflows/deploy-jsdoc.yml/badge.svg)](https://github.com/neoFuzz/OpenSphinx/actions/workflows/deploy-jsdoc.yml)  
[![Render Status](https://img.shields.io/website?url=https%3A%2F%2Fopensphinx.onrender.com%2Fapi%2Frooms&label=Render&logo=render)](https://opensphinx.onrender.com)
[![Cloudflare Status](https://img.shields.io/website?url=https%3A%2F%2Fopensphinx.pages.dev&label=Cloudflare&logo=cloudflare)](https://opensphinx.online)  
[![Server Status](https://opensphinx.onrender.com/api/badge/status)](https://opensphinx.onrender.com)
[![Client Status](https://opensphinx.onrender.com/api/badge/client-status)](https://opensphinx.pages.dev)

A modern, web-based implementation of Laser Chess (also known as Khet) - the strategic board game where players use mirrors and lasers to capture pieces and outmaneuver their opponent.

This monorepo contains:

- `server/` – Authoritative game server built with Node.js, Express, Socket.IO and SQLite for game persistence
- `client/` – Interactive game client with 3D board view (React, Vite, Three.js) and 2D board view (HTML/CSS) with animated laser effects
- `shared/` – Core TypeScript game engine handling rules, laser mechanics, and game state, shared between client and server

## Prerequisites
- Node.js 20+
- npm 8+ (supports workspaces)

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

## Features
- **3D Graphics**: Three.js-powered 3D game board with models, textures, and animations
- **Game Persistence**: Save and load games using SQLite database
- **Authentication**: Discord OAuth integration with JWT tokens
- **Security**: CSRF protection, rate limiting, and helmet security headers
- **Networking**: Simple room system; up to 2 players + spectators
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

## Notes
- Extend easily to match strict Khet 2.0 rules (pyramid one-sidedness, Djed swap, official setups) in `shared/src/engine`
- `.env.local` files are gitignored for local overrides
