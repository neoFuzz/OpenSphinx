import { parseCookies, verifyJwt } from './auth';
import type { Env, JwtPayload } from './types';

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

/**
 * Returns a set of security-oriented HTTP response headers.
 *
 * In production, `Strict-Transport-Security` (HSTS) is added so browsers
 * remember to use HTTPS for up to one year across all sub-domains.
 *
 * @param isProduction - `true` when `NODE_ENV === 'production'`
 * @returns A `HeadersInit`-compatible object ready to spread into a Response
 *
 * @example
 * ```typescript
 * const headers = securityHeaders(env.NODE_ENV === 'production');
 * // { 'X-Content-Type-Options': 'nosniff', ... }
 * ```
 */
export function securityHeaders(isProduction: boolean): HeadersInit {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  if (isProduction) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }

  return headers;
}

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

/**
 * Returns CORS response headers when the request `Origin` is in the allow-list.
 *
 * Returns an empty object (no CORS headers) when the origin is not allowed,
 * so the browser will block the cross-origin request as expected.
 *
 * @param request - Incoming `Request` whose `Origin` header is inspected
 * @param allowedOrigins - List of fully-qualified origins that are permitted
 *   (e.g. `['https://opensphinx.online', 'http://localhost:5173']`)
 * @returns A `HeadersInit` object with CORS headers, or `{}` if not allowed
 *
 * @example
 * ```typescript
 * const cors = corsHeaders(request, env.CLIENT_URLS.split(',').map(s => s.trim()));
 * ```
 */
export function corsHeaders(request: Request, allowedOrigins: string[]): HeadersInit {
  const origin = request.headers.get('Origin') ?? '';

  if (!allowedOrigins.includes(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
  };
}

// ---------------------------------------------------------------------------
// Header application helpers
// ---------------------------------------------------------------------------

/**
 * Creates a new `Response` that is identical to `response` but with one or
 * more additional header sets merged in.
 *
 * The original response is not mutated. Later `HeadersInit` objects in
 * `headerSets` override earlier ones for the same header name.
 *
 * @param response - The base `Response` to clone
 * @param headerSets - One or more `HeadersInit` objects to merge
 * @returns A new `Response` with all headers applied
 *
 * @example
 * ```typescript
 * const secured = applyHeaders(response, securityHeaders(true), { 'X-Custom': 'value' });
 * ```
 */
export function applyHeaders(response: Response, ...headerSets: HeadersInit[]): Response {
  const headers = new Headers(response.headers);

  for (const set of headerSets) {
    const entries =
      set instanceof Headers
        ? [...set.entries()]
        : Array.isArray(set)
          ? (set as [string, string][])
          : Object.entries(set as Record<string, string>);

    for (const [key, value] of entries) {
      headers.set(key, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Convenience wrapper that applies both security headers and CORS headers to
 * a `Response` in a single call.
 *
 * `allowedOrigins` is derived from `env.CLIENT_URLS` (comma-separated list).
 * `isProduction` is derived from `env.NODE_ENV === 'production'`.
 *
 * @param response - The base `Response` to wrap
 * @param request - The incoming `Request` (needed to read the `Origin` header)
 * @param env - Worker environment bindings
 * @returns A new `Response` with security and CORS headers applied
 *
 * @example
 * ```typescript
 * return withSecurityAndCors(Response.json({ ok: true }), request, env);
 * ```
 */
export function withSecurityAndCors(response: Response, request: Request, env: Env): Response {
  const isProduction = env.NODE_ENV === 'production';
  const allowedOrigins = env.CLIENT_URLS.split(',').map((o) => o.trim());

  return applyHeaders(
    response,
    securityHeaders(isProduction),
    corsHeaders(request, allowedOrigins),
  );
}

// ---------------------------------------------------------------------------
// CORS preflight
// ---------------------------------------------------------------------------

/**
 * Handles an `OPTIONS` preflight request by returning a `204 No Content`
 * response with the appropriate CORS preflight headers.
 *
 * Call this at the top of your fetch handler before any other routing:
 * ```typescript
 * if (request.method === 'OPTIONS') return corsPreflightResponse(request, env);
 * ```
 *
 * @param request - Incoming `OPTIONS` request
 * @param env - Worker environment bindings
 * @returns `204 No Content` with CORS headers, or `204` with no CORS headers
 *   if the origin is not in the allow-list
 */
export function corsPreflightResponse(request: Request, env: Env): Response {
  const allowedOrigins = env.CLIENT_URLS.split(',').map((o) => o.trim());
  const headers = new Headers(corsHeaders(request, allowedOrigins) as Record<string, string>);
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(null, { status: 204, headers });
}

// ---------------------------------------------------------------------------
// Authentication helpers
// ---------------------------------------------------------------------------

/** Cookie name used for the JWT auth token */
const AUTH_COOKIE = 'auth_token';

/**
 * Authenticates the incoming request by reading and verifying the `auth_token`
 * cookie.
 *
 * Throws a `Response` with HTTP 401 if:
 * - The cookie is absent
 * - The JWT is invalid, expired, or cannot be verified
 * - The payload cannot be decoded
 *
 * Route handlers should `catch` the thrown `Response` and return it directly:
 * ```typescript
 * let user: JwtPayload;
 * try {
 *   user = await authenticateToken(request, env);
 * } catch (e) {
 *   return e as Response;
 * }
 * ```
 *
 * @param request - Incoming `Request` with `auth_token` cookie
 * @param env - Worker environment bindings (uses `JWT_SECRET`)
 * @returns The decoded `JwtPayload` on success
 * @throws A `Response` (HTTP 401) when authentication fails
 */
export async function authenticateToken(request: Request, env: Env): Promise<JwtPayload> {
  const cookies = parseCookies(request);
  const token = cookies[AUTH_COOKIE];

  if (!token) {
    throw Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const payload = await verifyJwt(token, env.JWT_SECRET);

  if (!payload) {
    throw Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  return payload;
}

/**
 * Optionally authenticates the incoming request.
 *
 * Unlike {@link authenticateToken}, this function never throws â€” it returns
 * `null` when the `auth_token` cookie is absent or the JWT is invalid. Use
 * this on routes that work for both anonymous and authenticated users.
 *
 * @param request - Incoming `Request` with an optional `auth_token` cookie
 * @param env - Worker environment bindings (uses `JWT_SECRET`)
 * @returns The decoded `JwtPayload` if authenticated, `null` otherwise
 *
 * @example
 * ```typescript
 * const user = await optionalAuth(request, env);
 * const userId = user?.userId ?? undefined;
 * ```
 */
export async function optionalAuth(request: Request, env: Env): Promise<JwtPayload | null> {
  try {
    return await authenticateToken(request, env);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
// NOTE: Cloudflare's native rate limiting rules (configured in the dashboard
// or via Wrangler) are the preferred approach for production:
//   - /auth/*  ? 100 requests per IP per 15 minutes
//   - /api/*   ? 1000 requests per IP per 15 minutes
//
// The in-memory counter below provides a best-effort fallback within a single
// Worker isolate. Because CF spins up multiple isolates globally, this counter
// is NOT globally consistent — it only prevents bursts within one edge node.
// Use Cloudflare's native Rate Limiting for strict enforcement.
// ---------------------------------------------------------------------------

/** Rate limit counter entry */
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/**
 * Module-level counter map. Persists for the lifetime of the Worker isolate.
 * Key format: `<ip>:<pathPrefix>` — e.g. `"1.2.3.4:/auth"`.
 */
const rateLimitCounters = new Map<string, RateLimitEntry>();

/** Clean up expired entries every 5 minutes to prevent unbounded growth. */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

/**
 * Checks an in-memory sliding-window rate limit for the requesting IP.
 *
 * Returns `true` if the request is within the allowed limit (pass),
 * `false` if the limit has been exceeded (reject).
 *
 * Configuration:
 * - `/auth/*` paths: 100 requests per 15 minutes
 * - `/api/*` paths: 1000 requests per 15 minutes
 *
 * Limitations: counter is per-isolate, not globally consistent. See module
 * comment above for production guidance.
 *
 * @param request - Incoming request (used to extract CF-Connecting-IP header)
 * @param pathPrefix - The route prefix to apply limits to (`'/auth'` or `'/api'`)
 * @returns `true` if the request should proceed, `false` if rate-limited
 *
 * @example
 * ```typescript
 * if (!checkRateLimit(request, '/auth')) {
 *   return Response.json({ error: 'Too many requests' }, { status: 429 });
 * }
 * ```
 */
export function checkRateLimit(request: Request, pathPrefix: '/auth' | '/api'): boolean {
  const ip =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ??
    'unknown';

  const key = `${ip}:${pathPrefix}`;
  const now = Date.now();

  // Limits per route type (window = 15 minutes)
  const WINDOW_MS = 15 * 60 * 1000;
  const limit = pathPrefix === '/auth' ? 100 : 1000;

  // Periodic cleanup of stale entries
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    for (const [k, entry] of rateLimitCounters) {
      if (now - entry.windowStart > WINDOW_MS) {
        rateLimitCounters.delete(k);
      }
    }
    lastCleanup = now;
  }

  const entry = rateLimitCounters.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // Start a new window
    rateLimitCounters.set(key, { count: 1, windowStart: now });
    return true;
  }

  entry.count += 1;

  if (entry.count > limit) {
    return false;
  }

  return true;
}

/**
 * Returns a `429 Too Many Requests` response with a `Retry-After` header
 * indicating how long to wait before retrying (in seconds).
 *
 * @param windowMs - Rate limit window in milliseconds (used to set Retry-After)
 * @returns A `429` response
 */
export function rateLimitResponse(windowMs = 15 * 60 * 1000): Response {
  const retryAfterSeconds = Math.ceil(windowMs / 1000);
  return Response.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    },
  );
}
