import type { GameState } from '@laser/shared/types';

// ---------------------------------------------------------------------------
// Row types — typed representations of raw D1 query results
// ---------------------------------------------------------------------------

interface SavedGameRow {
  id: string;
  name: string;
  game_state: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface GameReplayRow {
  id: string;
  name: string;
  game_states: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface GameReplayMetaRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface UserRow {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface PlayerStatsRow {
  user_id: string;
  games_played: number;
  wins: number;
  losses: number;
}

interface CountRow {
  count: number;
}

// ---------------------------------------------------------------------------
// Public interfaces — mirror server/src/database.ts exactly
// ---------------------------------------------------------------------------

/** Represents a game replay with multiple game states */
export interface GameReplay {
  id: string;
  name: string;
  gameStates: GameState[];
  createdAt: Date;
  updatedAt: Date;
}

/** Represents a user in the system */
export interface User {
  id: string;
  discordId: string;
  username: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Represents player statistics */
export interface PlayerStats {
  userId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
}

/** Represents a saved game state */
export interface SavedGame {
  id: string;
  name: string;
  gameState: GameState;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// DatabaseManager
// ---------------------------------------------------------------------------

/**
 * Manages all D1 database operations for the Cloudflare Worker backend.
 *
 * This class mirrors the `DatabaseManager` API from `server/src/database.ts`
 * but replaces the synchronous `better-sqlite3` calls with the fully-async
 * Cloudflare D1 API (`prepare().bind().run()` / `.first()` / `.all()`).
 *
 * One instance is created per request using `env.DB` — it is NOT a singleton.
 *
 * @example
 * ```typescript
 * const db = new DatabaseManager(env.DB);
 * const user = await db.getUserByDiscordId('123456789');
 * ```
 */
export class DatabaseManager {
  constructor(private readonly db: D1Database) {}

  // -------------------------------------------------------------------------
  // Saved games
  // -------------------------------------------------------------------------

  /**
   * Saves a game state to the database (insert or replace).
   * @param id - Unique game identifier
   * @param name - Display name for the saved game
   * @param gameState - Current game state to save
   * @param userId - Optional authenticated user ID who saved the game
   */
  async saveGame(id: string, name: string, gameState: GameState, userId?: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO saved_games (id, name, game_state, user_id, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
      .bind(id, name, JSON.stringify(gameState), userId ?? null)
      .run();
  }

  /**
   * Loads a saved game by ID.
   * @param id - Game ID to load
   * @returns The saved game, or `null` if not found
   */
  async loadGame(id: string): Promise<SavedGame | null> {
    const row = await this.db
      .prepare('SELECT * FROM saved_games WHERE id = ?')
      .bind(id)
      .first<SavedGameRow>();

    if (!row) return null;

    const gameState = JSON.parse(row.game_state) as GameState;
    return {
      id: row.id,
      name: row.name,
      gameState,
      userId: row.user_id ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Lists all saved games ordered by most recently updated.
   * Returns game metadata without the full serialised game state,
   * but does include the `winner` field extracted from the state.
   * @returns Array of saved game metadata objects
   */
  async listGames(): Promise<(Omit<SavedGame, 'gameState'> & { winner?: string })[]> {
    const { results } = await this.db
      .prepare(
        'SELECT id, name, game_state, user_id, created_at, updated_at FROM saved_games ORDER BY updated_at DESC',
      )
      .all<SavedGameRow>();

    return results.map((row) => {
      let winner: string | undefined;
      try {
        const gs = JSON.parse(row.game_state) as Partial<GameState> & { winner?: string };
        winner = gs.winner ?? undefined;
      } catch {
        winner = undefined;
      }

      return {
        id: row.id,
        name: row.name,
        userId: row.user_id ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        winner,
      };
    });
  }

  /**
   * Deletes a saved game by ID.
   * @param id - Game ID to delete
   */
  async deleteGame(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM saved_games WHERE id = ?').bind(id).run();
  }

  // -------------------------------------------------------------------------
  // Game replays
  // -------------------------------------------------------------------------

  /**
   * Saves a game replay (array of game states) to the database.
   * @param id - Unique replay identifier
   * @param name - Display name for the replay
   * @param gameStates - Ordered array of game states representing the full replay
   * @param userId - Optional authenticated user ID who saved the replay
   */
  async saveReplay(id: string, name: string, gameStates: GameState[], userId?: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO game_replays (id, name, game_states, user_id, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
      .bind(id, name, JSON.stringify(gameStates), userId ?? null)
      .run();
  }

  /**
   * Loads a game replay by ID.
   * @param id - Replay ID to load
   * @returns The replay with all game states, or `null` if not found
   */
  async loadReplay(id: string): Promise<GameReplay | null> {
    const row = await this.db
      .prepare('SELECT * FROM game_replays WHERE id = ?')
      .bind(id)
      .first<GameReplayRow>();

    if (!row) return null;

    const gameStates = JSON.parse(row.game_states) as GameState[];
    return {
      id: row.id,
      name: row.name,
      gameStates,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Lists game replays with optional pagination and name search.
   *
   * D1 does not support spread params for dynamic queries, so separate
   * prepared statements are used for the search vs. no-search paths.
   *
   * @param options - Optional pagination / search parameters
   * @param options.limit - Maximum rows to return (default 10)
   * @param options.offset - Row offset for pagination (default 0)
   * @param options.search - Optional name substring filter (case-insensitive LIKE)
   * @returns Object containing the replay metadata array and the total matching count
   */
  async listReplays(
    options?: { limit?: number; offset?: number; search?: string },
  ): Promise<{ replays: Omit<GameReplay, 'gameStates'>[]; total: number }> {
    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;
    const search = options?.search ?? '';

    let rows: GameReplayMetaRow[];
    let total: number;

    if (search) {
      const pattern = `%${search}%`;
      const [dataResult, countResult] = await Promise.all([
        this.db
          .prepare(
            `SELECT id, name, created_at, updated_at FROM game_replays
             WHERE name LIKE ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
          )
          .bind(pattern, limit, offset)
          .all<GameReplayMetaRow>(),
        this.db
          .prepare('SELECT COUNT(*) as count FROM game_replays WHERE name LIKE ?')
          .bind(pattern)
          .first<CountRow>(),
      ]);
      rows = dataResult.results;
      total = countResult?.count ?? 0;
    } else {
      const [dataResult, countResult] = await Promise.all([
        this.db
          .prepare(
            'SELECT id, name, created_at, updated_at FROM game_replays ORDER BY updated_at DESC LIMIT ? OFFSET ?',
          )
          .bind(limit, offset)
          .all<GameReplayMetaRow>(),
        this.db
          .prepare('SELECT COUNT(*) as count FROM game_replays')
          .first<CountRow>(),
      ]);
      rows = dataResult.results;
      total = countResult?.count ?? 0;
    }

    return {
      replays: rows.map((row) => ({
        id: row.id,
        name: row.name,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      })),
      total,
    };
  }

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  /**
   * Creates a new user record from a Discord OAuth profile.
   * @param discordId - Discord snowflake user ID
   * @param username - Discord display name
   * @param avatarUrl - Optional Discord avatar URL
   * @returns The newly created user
   * @throws If the insert succeeds but the user cannot be found by Discord ID
   */
  async createUser(discordId: string, username: string, avatarUrl?: string): Promise<User> {
    const id = crypto.randomUUID();
    await this.db
      .prepare('INSERT INTO users (id, discord_id, username, avatar_url) VALUES (?, ?, ?, ?)')
      .bind(id, discordId, username, avatarUrl ?? null)
      .run();

    const user = await this.getUserByDiscordId(discordId);
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  /**
   * Retrieves a user by their Discord snowflake ID.
   * @param discordId - Discord user ID to look up
   * @returns The user record, or `null` if not found
   */
  async getUserByDiscordId(discordId: string): Promise<User | null> {
    const row = await this.db
      .prepare('SELECT * FROM users WHERE discord_id = ?')
      .bind(discordId)
      .first<UserRow>();

    if (!row) return null;
    return rowToUser(row);
  }

  /**
   * Updates the username and avatar for an existing user identified by Discord ID.
   * @param discordId - Discord user ID
   * @param username - Updated Discord display name
   * @param avatarUrl - Updated avatar URL (omit to clear)
   * @returns The updated user record, or `null` if the user was not found
   */
  async updateUser(discordId: string, username: string, avatarUrl?: string): Promise<User | null> {
    await this.db
      .prepare(
        `UPDATE users SET username = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
         WHERE discord_id = ?`,
      )
      .bind(username, avatarUrl ?? null, discordId)
      .run();

    return this.getUserByDiscordId(discordId);
  }

  // -------------------------------------------------------------------------
  // Player stats
  // -------------------------------------------------------------------------

  /**
   * Upserts player statistics after a game concludes.
   * Silently no-ops if the user ID does not exist in the `users` table.
   * @param userId - Internal database user ID
   * @param won - `true` if the player won, `false` if they lost
   */
  async updatePlayerStats(userId: string, won: boolean): Promise<void> {
    // Guard against foreign-key violation — D1 enforces FK constraints
    const userExists = await this.db
      .prepare('SELECT 1 FROM users WHERE id = ?')
      .bind(userId)
      .first<{ '1': number }>();

    if (!userExists) return;

    const winIncr = won ? 1 : 0;
    const lossIncr = won ? 0 : 1;

    await this.db
      .prepare(
        `INSERT INTO player_stats (user_id, games_played, wins, losses)
         VALUES (?, 1, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           games_played = games_played + 1,
           wins         = wins         + ?,
           losses       = losses       + ?`,
      )
      .bind(userId, winIncr, lossIncr, winIncr, lossIncr)
      .run();
  }

  /**
   * Retrieves player statistics for a given user.
   * @param userId - Internal database user ID
   * @returns Player stats including computed `winRate`, or `null` if no stats exist
   */
  async getPlayerStats(userId: string): Promise<PlayerStats | null> {
    const row = await this.db
      .prepare('SELECT * FROM player_stats WHERE user_id = ?')
      .bind(userId)
      .first<PlayerStatsRow>();

    if (!row) return null;

    return {
      userId: row.user_id,
      gamesPlayed: row.games_played,
      wins: row.wins,
      losses: row.losses,
      winRate: row.games_played > 0 ? row.wins / row.games_played : 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maps a raw D1 user row to the public `User` interface. */
function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    discordId: row.discord_id,
    username: row.username,
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
