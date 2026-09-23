# OpenSphinx — Coding Guidelines

## TypeScript Standards
- Strict mode is enabled across all packages — no relaxing it
- Explicit type annotations on all function parameters and return types
- No `any` types; use `unknown` with type narrowing when the type isn't known at compile time
- All shared types live in `shared/src/types.ts` — add new cross-package types there
- Use type guards for runtime validation of data crossing trust boundaries (e.g. socket payloads)

## Formatting
- **2-space indentation** for all TS/JS/TSX files
- **Single quotes** for strings; double quotes in JSX attributes
- **Semicolons required** at every statement end
- **Trailing commas** in multi-line arrays and objects
- **Max line length**: 120 characters
- Consistent spacing around operators and after keywords

## Naming Conventions
| Thing | Convention | Example |
|-------|-----------|---------|
| Variables / functions | camelCase | `gameState`, `applyMove` |
| Types / interfaces | PascalCase | `GameState`, `Move`, `Piece` |
| Constants | UPPER_SNAKE_CASE | `BOARD_W`, `TILE_SIZE` |
| React components | PascalCase | `Board3D`, `LaserPath3D` |
| Component files | PascalCase | `Board3D.tsx` |
| Utility files | kebab-case | `animationUtils.ts` |
| Private methods | `_` prefix | `_initMatricesTexture` |

## Documentation
- JSDoc comments on all public functions, classes, and non-obvious logic
- Use `@param`, `@returns`, and `@example` tags where helpful
- Inline comments for workarounds or non-obvious decisions
- Each package has a README with setup and usage instructions

## React Patterns
- Functional components with hooks only — no class components
- Extract reusable logic into custom hooks (`useGame`, `useMovementAnimation`, etc.)
- `useMemo` / `useCallback` for expensive computations and stable references
- `React.memo` on components that re-render frequently
- Error boundaries around major feature sections

## State Management
- **Zustand** for global game and auth state (`client/src/state/game.ts`, `auth.ts`)
- **`useState`** for purely local UI state
- **`useRef`** for mutable values that must not trigger re-renders
- State updates must be **immutable** — use spread or array methods, never direct mutation

## Shared Game Engine (`shared/src/engine/`)
- All engine functions are **pure** — no side effects, no I/O
- Deep-clone `GameState` before mutating it
- Validation functions return `boolean` or the validated value
- Engine functions accept a `gameId` parameter for logging context
- The server is **authoritative**: clients may run the engine for optimistic UI, but the server's result always wins

## Server Patterns
- Express middleware chain order: CORS → Helmet → rate limiting → CSRF → routes
- All game logic validated server-side before broadcasting state
- Use **prepared statements** for all SQLite queries (never string-interpolate SQL)
- Winston logger for structured output — pass context objects, not interpolated strings
- JWT and CSRF secrets must come from environment variables — never hardcode

## 3D Rendering Patterns
```typescript
// Grid → world coordinates
function gridToWorld(r: number, c: number) {
  return new THREE.Vector3(ORIGIN_X + c * TILE_SIZE, 0, ORIGIN_Z + r * TILE_SIZE);
}

// Direction → Y rotation (radians)
function dirToY(facing?: Dir) {
  switch (facing) {
    case 'N': return 0;
    case 'E': return Math.PI / 2;
    case 'S': return Math.PI;
    case 'W': return -Math.PI / 2;
    default:  return 0;
  }
}
```
- Dispose Three.js geometries and materials when components unmount to avoid memory leaks
- Use `useFrame` for per-frame animation updates; store animation state in `Map<string, AnimationState>`

## Animation Pattern
```typescript
// Animation state keyed by piece ID
const [rotatingPieces, setRotatingPieces] = useState<Map<string, RotationAnimation>>(new Map());

const animateRotation = useCallback((pieceId: string, delta: number, from: number, to: number) => {
  setRotatingPieces(prev => {
    const next = new Map(prev);
    next.set(pieceId, { startTime: performance.now(), delta, fromRotY: from, toRotY: to });
    return next;
  });
}, []);
```

## Security Checklist
- Sanitize all user-supplied strings rendered as HTML with DOMPurify
- Never trust data arriving over WebSocket — validate shape and ownership server-side
- Rate limiting is applied to all API routes via express-rate-limit
- CSRF tokens required on state-mutating requests
- JWT secrets and CSRF secrets from env vars only

## Git Commit Style
Prefix commits with the type of change:
- `Add:` — new feature or file
- `Fix:` — bug fix
- `Update:` — modification to existing feature
- `Refactor:` — code restructure without behaviour change
- `Docs:` — documentation only

Use feature branches and pull requests; do not commit directly to `main`.
