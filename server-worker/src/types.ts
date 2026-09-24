import type { GameConfig, GameState } from '@laser/shared/types';

/**
 * Cloudflare Workers environment bindings and secrets.
 * All fields map directly to bindings/vars/secrets declared in wrangler.toml.
 */
export interface Env {
  /** Durable Object namespace for game rooms — one instance per room ID */
  GAME_ROOM: DurableObjectNamespace;

  /** D1 database holding users, saved_games, game_replays, player_stats */
  DB: D1Database;

  /** Secret used to sign and verify JWT auth tokens */
  JWT_SECRET: string;

  /** Secret used to HMAC-sign CSRF tokens */
  CSRF_SECRET: string;

  /** Discord application client ID (for OAuth 2.0) */
  DISCORD_CLIENT_ID: string;

  /** Discord application client secret (for OAuth 2.0) */
  DISCORD_CLIENT_SECRET: string;

  /** Discord OAuth callback URL registered on the Discord application */
  DISCORD_REDIRECT_URI: string;

  /** Comma-separated list of allowed client origins for CORS */
  CLIENT_URLS: string;

  /** Primary domain for HSTS and cookie Secure flag decisions */
  ALLOWED_DOMAIN: string;

  /** Optional: 'development' | 'production' | 'staging' */
  NODE_ENV?: string;
}

/**
 * Decoded JWT payload attached to authenticated requests.
 */
export interface JwtPayload {
  /** Internal database user ID */
  userId: string;
  /** Discord snowflake ID */
  discordId: string;
  /** Discord username */
  username: string;
  /** Discord avatar hash, if set */
  avatar?: string;
  /** Issued-at time (seconds since epoch) */
  iat?: number;
  /** Expiry time (seconds since epoch) */
  exp?: number;
}

/**
 * A player or spectator connected to a game room.
 * `clientId` replaces Socket.IO's socket ID — assigned when the SSE connection opens.
 */
export interface PlayerInfo {
  /** UUID assigned at SSE connection time */
  clientId: string;
  /** Display name */
  name: string;
  /** Board color assigned to this player */
  color: 'RED' | 'SILVER';
  /** Authenticated user ID (if logged in via Discord) */
  userId?: string;
}

/**
 * Public-facing room state broadcast to all clients as `room:state`.
 */
export interface PublicRoomState {
  roomId: string;
  players: Array<{ clientId: string; name: string; color: 'RED' | 'SILVER' }>;
  spectatorCount: number;
  state: GameState;
  config: GameConfig;
  isPrivate: boolean;
}

/**
 * Payload for the `game:state` SSE event.
 */
export interface GameStateEvent {
  state: GameState;
  /** Echo of `clientMoveId` from the move request, for optimistic-UI ack */
  ack?: string;
}

/**
 * Payload for the `game:end` SSE event.
 */
export interface GameEndEvent {
  winner: 'RED' | 'SILVER';
}

/**
 * Payload for the `game:saved` SSE event.
 */
export interface GameSavedEvent {
  success: boolean;
  error?: string;
}
