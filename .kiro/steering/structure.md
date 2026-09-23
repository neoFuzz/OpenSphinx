# OpenSphinx — Project Structure

## Monorepo Layout
npm workspaces monorepo with three packages. A single `package-lock.json` lives at the root.

```
OpenSphinx/
├── package.json          ← workspace host; only script: generate-docs
├── package-lock.json     ← single lock file for all workspaces
├── tsconfig.docs.json
├── typedoc.json
├── client/               ← React frontend
├── server/               ← Node.js backend
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
│   ├── socket.ts         ← Socket.IO client singleton
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
│   │   ├── game.ts       ← Zustand game state store
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

## `server/` — Backend Package
Authoritative Express + Socket.IO game server.

```
server/
├── package.json
├── tsconfig.json
├── .env / .env.example
├── games.db              ← SQLite database (gitignored)
└── src/
    ├── index.ts          ← entry point: Express + Socket.IO setup
    ├── rooms.ts          ← room management and game state
    ├── database.ts       ← SQLite operations via better-sqlite3
    ├── auth.ts           ← Discord OAuth + JWT token handling
    └── middleware.ts     ← CORS, Helmet, CSRF, rate limiting
```

---

## `shared/` — Game Engine Package (name: `@laser/shared`)
Pure TypeScript game engine; imported by both client and server.

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
| `client` ↔ `server` | WebSocket events | Socket.IO (real-time game actions) |
| `client` → `shared` | TypeScript import | Vite resolves via `fs.allow: ['..']` |
| `server` → `shared` | TypeScript import | ts-node / tsc resolves directly |
| `server` → `games.db` | better-sqlite3 | synchronous SQLite API |
| `client` → `public/` | static assets | GLB models, textures, sounds loaded at runtime |
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
1. **Authoritative server**: All moves validated server-side. Clients send intent; server broadcasts the validated result.
2. **Shared engine is pure**: `shared/src/engine/` has zero side effects. Both client (optimistic UI) and server (validation) run the same code.
3. **Single type source**: Cross-package types belong in `shared/src/types.ts` — not duplicated.
4. **One lock file**: Never add a `package-lock.json` inside a workspace package; the root lock file covers all.
