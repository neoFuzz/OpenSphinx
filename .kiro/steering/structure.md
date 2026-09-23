# OpenSphinx — Project Structure

## Monorepo Layout
npm workspaces monorepo with four packages. A single `package-lock.json` lives at the root.

```
OpenSphinx/
├── package.json          ← workspace host; only script: generate-docs
├── package-lock.json     ← single lock file for all workspaces
├── tsconfig.docs.json
├── typedoc.json
├── client/               ← React frontend
├── server-worker/        ← Cloudflare Workers backend
├── shared/               ← shared TypeScript game engine
├── docs/                 ← TypeDoc output (gitignored)
└── .github/workflows/    ← CI pipelines
```

---

## `client/` — Frontend Package
React + Vite app, also wrapped as an Android app via Capacitor.

```
client/
├── package.json
├── vite.config.ts        ← host: 0.0.0.0; fs.allow: ['..'] to resolve shared/
├── capacitor.config.ts   ← appId: online.opensphinx.game
├── index.html
├── src/
│   ├── main.tsx          ← React entry point
│   ├── App.tsx           ← root component / router
│   ├── sse.ts            ← EventSource singleton + postToRoom fetch helper
│   ├── i18n.ts           ← i18next initialisation
│   ├── components/       ← all React components
│   │   ├── Board.tsx         ← 2D board view (HTML/CSS)
│   │   ├── Board3D.tsx       ← 3D Three.js board view
│   │   ├── BoardComponents.tsx
│   │   ├── models/           ← per-piece 3D model components
│   │   ├── Header.tsx, Footer.tsx, About.tsx, Rules.tsx
│   │   ├── SavedGames.tsx, Replay.tsx, Stats.tsx
│   │   └── AdMob.tsx, AdSense.tsx
│   ├── state/
│   │   ├── game.ts       ← Zustand game state store (EventSource subscriptions)
│   │   └── auth.ts       ← Zustand auth state store
│   ├── utils/            ← animation helpers and misc utilities
│   ├── config/           ← app-level constants
│   ├── locales/          ← i18n translation JSON files
│   └── types/            ← client-specific TypeScript types
├── public/
│   ├── models/           ← GLB assets: anubis, djed, laser, obelisk, pharaoh, pyramid, sphinx
│   ├── textures/         ← texture files used by the 3D board
│   └── sounds/           ← explosion.mp3 and other audio
├── android/              ← Capacitor-generated Android project
└── scripts/
    └── indexnow.js       ← SEO ping run automatically after `npm run build`
```

---

## `server-worker/` — Cloudflare Workers Package
Authoritative game server running on Cloudflare Workers + Durable Objects + D1.

```
server-worker/
├── package.json
├── tsconfig.json
├── wrangler.toml         ← Wrangler config: DO binding, D1, secrets, compatibility
├── schema.sql            ← D1 schema (users, saved_games, game_replays, player_stats)
└── src/
    ├── index.ts          ← Workers fetch handler + URL router; exports GameRoom DO class
    ├── room.ts           ← GameRoom Durable Object (SSE fan-out, game state, DO SQLite)
    ├── database.ts       ← D1 operations (mirrors server/src/database.ts API)
    ├── auth.ts           ← Discord OAuth + JWT (jose) + CSRF (SubtleCrypto)
    ├── middleware.ts     ← CORS, security headers, rate limiting, auth helpers
    └── types.ts          ← Env interface and Worker-specific types
```

---

## `shared/` — Game Engine Package (name: `@laser/shared`)
Pure TypeScript game engine; imported by both client and server-worker.

```
shared/
├── package.json
└── src/
    ├── index.ts          ← barrel export
    ├── types.ts          ← core types: GameState, Piece, Move, Player, Dir, …
    ├── constants.ts      ← BOARD_W, TILE_SIZE, COLORS, etc.
    ├── logger.ts         ← shared logging utilities
    ├── badges.ts         ← SVG badge generation
    └── engine/
        ├── index.ts          ← engine barrel (applyMove, etc.)
        ├── laser.ts          ← laser path tracing and reflection logic
        ├── moves.ts          ← move validation and application
        ├── setup.ts          ← board setup for CLASSIC / IMHOTEP / DYNASTY
        └── sphinx-utils.ts   ← utilities for the Sphinx piece
```

---

## Key Inter-Package Relationships

| From | To | How |
|------|----|-----|
| `client` ↔ `server-worker` | SSE + HTTP | EventSource (server push) + fetch (actions) |
| `client` → `shared` | TypeScript import | Vite resolves via `fs.allow: ['..']` |
| `server-worker` → `shared` | TypeScript import | Wrangler bundles at build time via TS path alias |
| `server-worker` ↔ `GameRoom DO` | Internal HTTP | DO stub forwarding per room ID |
| `server-worker` → `Cloudflare D1` | D1 binding | users, saved_games, game_replays, player_stats |
| `GameRoom DO` → `DO SQLite` | `this.ctx.storage.sql` | room meta, current game state, move history |
| `android/` → `client` | Capacitor | web build copied into Android assets via `npx cap sync` |

---

## CI / GitHub Actions

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `android-release.yml` | Tag push | Builds signed APK/AAB with Gradle + JDK 21 |
| `deploy-jsdoc.yml` | Push to main | Runs TypeDoc → deploys to GitHub Pages |
| `synk.yml` | Push / schedule | Snyk security scan |

---

## Architectural Invariants
1. **Authoritative Worker**: All moves validated by the `GameRoom` Durable Object. Clients send intent via HTTP POST; the DO broadcasts the validated result over SSE to all connected clients.
2. **Shared engine is pure**: `shared/src/engine/` has zero side effects. Both client (optimistic UI) and `GameRoom` DO (validation) run the same code.
3. **Single type source**: Cross-package types belong in `shared/src/types.ts` — not duplicated.
4. **One lock file**: Never add a `package-lock.json` inside a workspace package; the root lock file covers all.
