# OpenSphinx — Technology Stack

## Languages
- **TypeScript 5.5** — strict mode everywhere; no `any` types
- Server worker targets **ES2022** (Cloudflare Workers runtime); client uses **ES modules**

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
| Real-time (server push) | EventSource (native browser API) | - |
| i18n | i18next + react-i18next + browser-languagedetector | 25.6 / 16.2 / 8.2 |
| XSS sanitization | DOMPurify | 3.2.7 |
| Mobile runtime | @capacitor/core + @capacitor/android | 7.4.3 |
| AdMob | @capacitor-community/admob | 7.0.3 |

## Worker Backend (`server-worker/`)
| Category | Library | Version |
|----------|---------|---------|
| Runtime | Cloudflare Workers | - |
| HTTP routing | Web Platform APIs (Request/Response) | - |
| Real-time push | Server-Sent Events (SSE) | - |
| Durable Objects | @cloudflare/workers-types | 5.x |
| Database | Cloudflare D1 (SQLite-compatible) | - |
| Auth | jose (JWT, HS256) | 6.x |
| Security | SubtleCrypto (CSRF) + manual headers | - |
| Rate limiting | In-memory counter + CF native rules | - |
| Logging | console (CF Workers runtime) | - |
| Dev/deploy | wrangler | 4.x |

## Shared (`shared/`)
- Pure TypeScript game engine — **no side effects**, no runtime UI deps
- `badge-maker 5.0.2` for SVG badge generation

## Dev Tooling
| Tool | Purpose |
|------|---------|
| TypeDoc 0.28.13 | API docs → GitHub Pages |
| dotenv 16/17 | Env var loading (client only) |
| npm workspaces | Monorepo package management |

## Development Commands

```bash
# Install everything (run from repo root)
npm install --workspaces

# Client dev server  →  http://localhost:5173
npm run dev --workspace client

# Worker dev server  →  http://localhost:8787
cd server-worker && npx wrangler dev

# Deploy Worker to production
cd server-worker && npx wrangler deploy

# Deploy Worker to staging
cd server-worker && npx wrangler deploy --env staging

# Production builds
npm run build --workspace client   # → client/dist/

# Preview production client build locally
npm run preview --workspace client

# Generate TypeDoc API docs  →  docs/
npm run generate-docs

# Capacitor: sync web build to Android project
npx cap sync android               # run from client/
```

## Environment Variables

**`server-worker/` — secrets set via `wrangler secret put`**
```
# Set each with: wrangler secret put <KEY>
JWT_SECRET
CSRF_SECRET
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI   # e.g. https://opensphinx-server.workers.dev/auth/discord/callback

# Non-secret vars in wrangler.toml [vars]
ALLOWED_DOMAIN=opensphinx.online
CLIENT_URLS=https://opensphinx.online,https://opensphinx.pages.dev
```

**`client/.env`**
```
VITE_SERVER_URL=https://opensphinx-server.workers.dev   # production Worker URL
# or http://localhost:8787 for local dev against wrangler dev
```

## Version Requirements
- Node.js 20+, npm 8+
- Modern browser: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- EventSource/SSE support required for real-time multiplayer (supported by all target browsers)
