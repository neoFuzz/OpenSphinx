import { SignJWT, jwtVerify } from 'jose';
import { DatabaseManager } from './database';
import type { Env, JwtPayload } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** JWT algorithm used for signing and verification */
const JWT_ALG = 'HS256';

/** Auth cookie name — httpOnly, 7-day expiry */
const AUTH_COOKIE = 'auth_token';

/** Cookie max-age in seconds: 7 days */
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// JWT helpers (exported for use by middleware)
// ---------------------------------------------------------------------------

/**
 * Derives an HMAC-SHA256 `CryptoKey` from a raw secret string.
 * @param secret - The raw secret string to derive the key from
 * @param usage - Key usage: `'sign'` or `'verify'`
 * @returns A `CryptoKey` suitable for the requested usage
 */
async function importHmacKey(
  secret: string,
  usage: 'sign' | 'verify',
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  );
}

/**
 * Signs a JWT payload using HS256 with a 7-day expiry.
 *
 * @param payload - Claims to encode in the token
 * @param secret - HMAC secret (from `env.JWT_SECRET`)
 * @returns Signed JWT string
 *
 * @example
 * ```typescript
 * const token = await signJwt({ userId: 'abc', discordId: '123', username: 'Alice' }, env.JWT_SECRET);
 * ```
 */
export async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const key = await importHmacKey(secret, 'sign');
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

/**
 * Verifies a JWT string and returns the decoded payload, or `null` if invalid.
 *
 * @param token - JWT string to verify
 * @param secret - HMAC secret (from `env.JWT_SECRET`)
 * @returns Decoded `JwtPayload` on success, `null` on any verification failure
 *
 * @example
 * ```typescript
 * const payload = await verifyJwt(token, env.JWT_SECRET);
 * if (payload) {
 *   console.log(payload.userId);
 * }
 * ```
 */
export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const key = await importHmacKey(secret, 'verify');
    const { payload } = await jwtVerify(token, key, { algorithms: [JWT_ALG] });
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/**
 * Parses the `Cookie` header from a request into a key/value map.
 *
 * @param request - Incoming `Request` object
 * @returns Object mapping cookie names to their raw string values
 *
 * @example
 * ```typescript
 * const cookies = parseCookies(request);
 * const token = cookies['auth_token'];
 * ```
 */
export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const result: Record<string, string> = {};

  for (const pair of cookieHeader.split(';')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const name = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (name) result[name] = value;
  }

  return result;
}

/**
 * Builds a `Set-Cookie` header value.
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie attributes
 * @returns Formatted `Set-Cookie` string
 */
function buildSetCookie(
  name: string,
  value: string,
  options: {
    maxAge: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Lax' | 'Strict' | 'None';
    path: string;
  },
): string {
  const parts = [
    `${name}=${value}`,
    `Max-Age=${options.maxAge}`,
    `Path=${options.path}`,
    `SameSite=${options.sameSite}`,
  ];

  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');

  return parts.join('; ');
}

// ---------------------------------------------------------------------------
// Discord API types
// ---------------------------------------------------------------------------

/** Shape of the Discord OAuth token response */
interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/** Shape of the Discord /users/@me response */
interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

// ---------------------------------------------------------------------------
// Auth handlers
// ---------------------------------------------------------------------------

/**
 * Handles `GET /auth/discord` — initiates the Discord OAuth 2.0 authorization flow.
 *
 * Builds the Discord authorization URL and returns a 302 redirect.
 * Validates that the configured redirect URI is a known safe origin.
 *
 * @param _request - Incoming request (unused but required for handler signature consistency)
 * @param env - Worker environment bindings
 * @returns 302 redirect to Discord authorization URL, or 400 on configuration error
 */
export function handleAuthRedirect(_request: Request, env: Env): Response {
  try {
    const redirectUri = new URL(env.DISCORD_REDIRECT_URI);
    const isLocalhost = ['localhost', '127.0.0.1'].includes(redirectUri.hostname);
    const isAllowedDomain = redirectUri.hostname.endsWith(env.ALLOWED_DOMAIN);

    if (!isLocalhost && !isAllowedDomain) {
      return Response.json({ error: 'Invalid redirect URI configuration' }, { status: 400 });
    }

    const params = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      redirect_uri: env.DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify',
    });

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    return Response.redirect(discordAuthUrl, 302);
  } catch {
    return Response.json({ error: 'Invalid configuration' }, { status: 400 });
  }
}

/**
 * Handles `GET /auth/discord/callback` — completes the Discord OAuth flow.
 *
 * Steps:
 * 1. Extract `code` from query string
 * 2. POST to Discord token endpoint to exchange code for access token
 * 3. GET Discord `/users/@me` with the access token
 * 4. Create or update the user record in D1
 * 5. Sign a JWT with the user's internal ID and Discord info
 * 6. Set the `auth_token` httpOnly cookie
 * 7. Redirect to the first configured `CLIENT_URLS` origin
 *
 * @param request - Incoming request containing the `code` query param
 * @param env - Worker environment bindings
 * @returns 302 redirect to client on success; 400/500 on failure
 */
export async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return Response.json({ error: 'No authorization code provided' }, { status: 400 });
  }

  try {
    // Exchange authorization code for Discord access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error('Discord token exchange failed:', tokenRes.status, body);
      return Response.json({ error: 'Token exchange failed' }, { status: 500 });
    }

    const tokenData = await tokenRes.json() as DiscordTokenResponse;
    const { access_token } = tokenData;

    // Fetch the authenticated Discord user's profile
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      console.error('Discord user fetch failed:', userRes.status);
      return Response.json({ error: 'Failed to fetch Discord user' }, { status: 500 });
    }

    const discordUser = await userRes.json() as DiscordUser;
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : undefined;

    // Create or update user record in D1
    const db = new DatabaseManager(env.DB);
    let user = await db.getUserByDiscordId(discordUser.id);

    if (!user) {
      user = await db.createUser(discordUser.id, discordUser.username, avatarUrl);
    } else {
      const updated = await db.updateUser(discordUser.id, discordUser.username, avatarUrl);
      if (updated) user = updated;
    }

    // Sign JWT with user info
    const jwtPayload: JwtPayload = {
      userId: user.id,
      discordId: user.discordId,
      username: user.username,
      avatar: user.avatarUrl,
    };
    const token = await signJwt(jwtPayload, env.JWT_SECRET);

    // Determine cookie security based on environment
    const isProduction = env.NODE_ENV === 'production';

    const setCookie = buildSetCookie(AUTH_COOKIE, token, {
      maxAge: AUTH_COOKIE_MAX_AGE,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Lax',
      path: '/',
    });

    // Redirect to the first configured client URL
    const clientUrl = env.CLIENT_URLS.split(',')[0].trim();

    return new Response(null, {
      status: 302,
      headers: {
        Location: clientUrl,
        'Set-Cookie': setCookie,
      },
    });
  } catch (err) {
    console.error('Discord OAuth callback error:', err);
    return Response.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

/**
 * Handles `POST /auth/logout` — clears the `auth_token` cookie.
 *
 * Expires the cookie immediately by setting `Max-Age=0`.
 *
 * @param _request - Incoming request (unused)
 * @param _env - Worker environment bindings (unused)
 * @returns JSON `{ success: true }` with an expired Set-Cookie header
 */
export function handleAuthLogout(_request: Request, _env: Env): Response {
  const expireCookie = buildSetCookie(AUTH_COOKIE, '', {
    maxAge: 0,
    httpOnly: true,
    secure: false, // expiring — Secure flag not needed
    sameSite: 'Lax',
    path: '/',
  });

  return Response.json(
    { success: true },
    {
      status: 200,
      headers: { 'Set-Cookie': expireCookie },
    },
  );
}

/**
 * Handles `GET /auth/me` — returns the currently authenticated user.
 *
 * Reads the `auth_token` cookie, verifies the JWT, then loads the user
 * record from D1 using the `discordId` embedded in the token payload.
 *
 * @param request - Incoming request with `auth_token` cookie
 * @param env - Worker environment bindings
 * @returns JSON `{ user }` on success; 401 if unauthenticated or token invalid
 */
export async function handleAuthMe(request: Request, env: Env): Promise<Response> {
  const cookies = parseCookies(request);
  const token = cookies[AUTH_COOKIE];

  if (!token) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  const db = new DatabaseManager(env.DB);
  const user = await db.getUserByDiscordId(payload.discordId);

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 401 });
  }

  return Response.json({ user });
}

// ---------------------------------------------------------------------------
// CSRF helpers (used by Task 3.2 and middleware)
// ---------------------------------------------------------------------------

/**
 * Signs a CSRF token string using HMAC-SHA256 and returns the hex digest.
 *
 * @param token - Raw token string to sign (typically a UUID)
 * @param secret - CSRF signing secret (from `env.CSRF_SECRET`)
 * @returns Hex-encoded HMAC-SHA256 signature
 */
export async function signCsrfToken(token: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(token),
  );

  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifies a CSRF token signature. Returns `true` if the HMAC matches.
 *
 * @param token - Raw token string that was originally signed
 * @param signature - Hex-encoded HMAC-SHA256 signature to verify
 * @param secret - CSRF signing secret (from `env.CSRF_SECRET`)
 * @returns `true` if the signature is valid, `false` otherwise
 */
export async function verifyCsrfSignature(
  token: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const expected = await signCsrfToken(token, secret);
    // Constant-time comparison to resist timing attacks
    if (expected.length !== signature.length) return false;

    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// CSRF public API (task 3.2)
// ---------------------------------------------------------------------------

/**
 * Issues a new CSRF token using the double-submit cookie pattern.
 *
 * The token is a UUID appended with a `.` and its HMAC-SHA256 hex signature.
 * The format `<uuid>.<signature>` means the client only needs to echo back
 * the full string � the server splits on `.` to verify without stored state.
 *
 * @param env - Worker environment bindings (uses `CSRF_SECRET`)
 * @returns A signed CSRF token string of the form `<uuid>.<hex-hmac>`
 *
 * @example
 * ```typescript
 * const token = await issueCsrfToken(env);
 * // ? "f47ac10b-58cc-4372-a567-0e02b2c3d479.3f4a..."
 * ```
 */
export async function issueCsrfToken(env: Env): Promise<string> {
  const uuid = crypto.randomUUID();
  const sig = await signCsrfToken(uuid, env.CSRF_SECRET);
  return `${uuid}.${sig}`;
}

/**
 * Validates a CSRF token on an incoming mutating request.
 *
 * Uses the double-submit pattern:
 * - The client sends the token in the `X-CSRF-Token` request header.
 * - The client also echoes it in the `csrf_token` cookie (set when the token was issued).
 * - Both must match, and the embedded HMAC must verify against `env.CSRF_SECRET`.
 *
 * @param request - Incoming request to validate
 * @param env - Worker environment bindings (uses `CSRF_SECRET`)
 * @returns `true` if the CSRF check passes, `false` otherwise
 */
export async function validateCsrf(request: Request, env: Env): Promise<boolean> {
  const headerToken = request.headers.get('X-CSRF-Token');
  const cookies = parseCookies(request);
  const cookieToken = cookies['csrf_token'];

  if (!headerToken || !cookieToken) return false;
  // Header and cookie must carry the same token value
  if (headerToken !== cookieToken) return false;

  // Split into uuid + signature and verify HMAC
  const dotIdx = headerToken.lastIndexOf('.');
  if (dotIdx === -1) return false;

  const uuid = headerToken.slice(0, dotIdx);
  const sig = headerToken.slice(dotIdx + 1);

  return verifyCsrfSignature(uuid, sig, env.CSRF_SECRET);
}
