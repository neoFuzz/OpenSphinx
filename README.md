# OpenSphinx (TypeScript, Node.js + Express + Socket.IO + React)
An open-source version of Laser Chess

This is a monorepo containing:

- `server/` – Node.js + Express + Socket.IO authoritative server
- `client/` – React (Vite) front-end
- `shared/` – Pure TypeScript game engine (rules + laser tracing) shared by both

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

## Folder structure
```
laser-chess-ts/
├─ server/
├─ client/
└─ shared/
```

## Notes
- Networking: simple room system; up to 2 players + spectators.
- Rules: basic laser chess variant — move one orthogonal step or rotate 90°, then fire the active player's laser. Pharaoh hit ends the game.
- Extend easily to match strict Khet 2.0 rules (pyramid one-sidedness, Djed swap, official setups) in `shared/src/engine`.
