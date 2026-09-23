# OpenSphinx — Technology Stack

## Languages
- **TypeScript 5.5** — strict mode everywhere; no `any` types
- Server compiles to **CommonJS**; client uses **ES modules**

## Frontend (`client/`)
| Category | Library | Version |
|----------|---------|---------|
| UI framework | React + React DOM | 19.1.1 |
| Build tool | Vite + @vitejs/plugin-react | 7.1.11 / 5.0.2 |
| 3D rendering | Three.js | 0.179.1 |
| React ↔ Three.js | @react-three/fiber | 9.3.0 |
| Three.js helpers | @react-three/drei | 10.7.4 |
| State management | Zustand | 5.0.8 |
| CSS framework | Bootstrap | 5.3.8 |
| Routing | react-router-dom | 7.9.6 |
| WebSocket client | socket.io-client | 4.7.5 |
| i18n | i18next + react-i18next + browser-languagedetector | 25.6 / 16.2 / 8.2 |
| XSS sanitization | DOMPurify | 3.2.7 |
| Mobile runtime | @capacitor/core + @capacitor/android | 7.4.3 |
| AdMob | @capacitor-community/admob | 7.0.3 |

## Backend (`server/`)
| Category | Library | Version |
|----------|---------|---------|
| Runtime | Node.js | 20+ |
| HTTP framework | Express | 5.0.3 |
| WebSocket server | Socket.IO | 4.7.5 |
| Database | better-sqlite3 (synchronous SQLite) | 12.4.1 |
| Auth | jsonwebtoken + axios (Discord OAuth) | 9.0.2 / 1.6.7 |
| Security headers | helmet | 8.1.0 |
| CSRF | @dr.pogodin/csurf | 1.16.5 |
| CORS | cors | 2.8.5 |
| Rate limiting | express-rate-limit | 7.5.1 |
| Cookies | cookie-parser | 1.4.7 |
| Logging | winston | 3.17.0 |
| Dev runner | ts-node + nodemon | 10.9.2 / 3.0.2 |

## Shared (`shared/`)
- Pure TypeScript game engine — **no side effects**, no runtime UI deps
- `badge-maker 5.0.2` for SVG badge generation

## Dev Tooling
| Tool | Purpose |
|------|---------|
| TypeDoc 0.28.13 | API docs → GitHub Pages |
| dotenv 16/17 | Env var loading |
| npm workspaces | Monorepo package management |

## Development Commands

```bash
# Install everything (run from repo root)
npm install --workspaces

# Client dev server  →  http://localhost:5173
npm run dev --workspace client

# Server dev (nodemon + ts-node, hot reload)
npm run dev --workspace server

# Production builds
npm run build --workspace client   # → client/dist/
npm run build --workspace server   # → dist/  (tsc)

# Run production server
NODE_ENV=production npm run start --workspace server

# Preview production client build locally
npm run preview --workspace client

# Generate TypeDoc API docs  →  docs/
npm run generate-docs

# Capacitor: sync web build to Android project
npx cap sync android               # run from client/
```

## Environment Variables

**`server/.env`**
```
PORT=3001
HOST=0.0.0.0
CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173
NODE_ENV=development
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:3001/auth/discord/callback
JWT_SECRET=
CSRF_SECRET=
```

**`client/.env`**
```
VITE_SERVER_URL=http://localhost:3001
```

## Version Requirements
- Node.js 20+, npm 8+
- Modern browser: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- WebSocket support required for multiplayer
