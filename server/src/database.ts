import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { GameState, Move } from '../../shared/src/types';

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

/** Manages SQLite database operations for the game */
class DatabaseManager {
  private db: Database.Database;

  /** Creates a new DatabaseManager instance and initializes the database */
  constructor() {
    this.db = new Database('./games.db');
    this.init();
  }

  /** Initializes database tables and performs migrations */
  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        discord_id TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS saved_games (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        game_state TEXT NOT NULL,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_replays (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        game_states TEXT NOT NULL,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_stats (
        user_id TEXT PRIMARY KEY,
        games_played INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Migration: Add user_id column if it doesn't exist
    try {
      this.db.exec('ALTER TABLE saved_games ADD COLUMN user_id TEXT');
    } catch (e) {
      // Column already exists, ignore error
    }

    try {
      this.db.exec('ALTER TABLE game_replays ADD COLUMN user_id TEXT');
    } catch (e) {
      // Column already exists, ignore error
    }
  }

  /**
   * Saves a game state to the database
   * @param id - Unique game identifier
   * @param name - Display name for the saved game
   * @param gameState - Current game state to save
   * @param userId - Optional user ID who saved the game
   */
  saveGame(id: string, name: string, gameState: GameState, userId?: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO saved_games (id, name, game_state, user_id, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(id, name, JSON.stringify(gameState), userId || null);
    return Promise.resolve();
  }

  /**
   * Loads a saved game by ID
   * @param id - Game ID to load
   * @returns Promise resolving to SavedGame or null if not found
   */
  loadGame(id: string): Promise<SavedGame | null> {
    const row = this.db.prepare('SELECT * FROM saved_games WHERE id = ?').get(id) as any;
    if (!row) return Promise.resolve(null);
    try {
      const gameState = JSON.parse(row.game_state);
      return Promise.resolve({
        id: row.id,
        name: row.name,
        gameState,
        userId: row.user_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      });
    } catch (error) {
      throw new Error('Invalid game state data');
    }
  }

  /**
   * Lists all saved games with metadata
   * @returns Promise resolving to array of saved games without full game state
   */
  listGames(): Promise<(Omit<SavedGame, 'gameState'> & { winner?: string })[]> {
    const rows = this.db.prepare('SELECT id, name, game_state, user_id, created_at, updated_at FROM saved_games ORDER BY updated_at DESC').all() as any[];
    return Promise.resolve(rows.map(row => {
      try {
        const gameState = JSON.parse(row.game_state);
        return {
          id: row.id,
          name: row.name,
          userId: row.user_id,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          winner: gameState.winner
        };
      } catch (error) {
        return {
          id: row.id,
          name: row.name,
          userId: row.user_id,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          winner: undefined
        };
      }
    }));
  }

  /**
   * Deletes a saved game by ID
   * @param id - Game ID to delete
   */
  deleteGame(id: string): Promise<void> {
    this.db.prepare('DELETE FROM saved_games WHERE id = ?').run(id);
    return Promise.resolve();
  }

  /**
   * Saves a game replay with multiple states
   * @param id - Unique replay identifier
   * @param name - Display name for the replay
   * @param gameStates - Array of game states representing the replay
   * @param userId - Optional user ID who saved the replay
   */
  saveReplay(id: string, name: string, gameStates: GameState[], userId?: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO game_replays (id, name, game_states, user_id, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(id, name, JSON.stringify(gameStates), userId || null);
    return Promise.resolve();
  }

  /**
   * Loads a game replay by ID
   * @param id - Replay ID to load
   * @returns Promise resolving to GameReplay or null if not found
   */
  loadReplay(id: string): Promise<GameReplay | null> {
    const row = this.db.prepare('SELECT * FROM game_replays WHERE id = ?').get(id) as any;
    if (!row) return Promise.resolve(null);
    try {
      const gameStates = JSON.parse(row.game_states);
      return Promise.resolve({
        id: row.id,
        name: row.name,
        gameStates,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      });
    } catch (error) {
      throw new Error('Invalid game states data');
    }
  }

  /**
   * Lists all game replays with metadata
   * @returns Promise resolving to array of replays without full game states
   */
  listReplays(options?: { limit?: number; offset?: number; search?: string }): Promise<{ replays: Omit<GameReplay, 'gameStates'>[]; total: number }> {
    const { limit = 10, offset = 0, search = '' } = options || {};

    let query = 'SELECT id, name, created_at, updated_at FROM game_replays';
    let countQuery = 'SELECT COUNT(*) as count FROM game_replays';
    const params: any[] = [];

    if (search) {
      query += ' WHERE name LIKE ?';
      countQuery += ' WHERE name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';

    const rows = this.db.prepare(query).all(...params, limit, offset) as any[];
    const countRow = this.db.prepare(countQuery).get(...params) as any;

    return Promise.resolve({
      replays: rows.map(row => ({
        id: row.id,
        name: row.name,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      })),
      total: countRow.count
    });
  }

  /**
   * Creates a new user in the database
   * @param discordId - Discord user ID
   * @param username - Discord username
   * @param avatarUrl - Optional Discord avatar URL
   * @returns Promise resolving to created User
   */
  async createUser(discordId: string, username: string, avatarUrl?: string): Promise<User> {
    const id = randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO users (id, discord_id, username, avatar_url)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, discordId, username, avatarUrl || null);
    const user = await this.getUserByDiscordId(discordId);
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  /**
   * Retrieves a user by Discord ID
   * @param discordId - Discord user ID to search for
   * @returns Promise resolving to User or null if not found
   */
  getUserByDiscordId(discordId: string): Promise<User | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId) as any;
    if (!row) return Promise.resolve(null);
    return Promise.resolve({
      id: row.id,
      discordId: row.discord_id,
      username: row.username,
      avatarUrl: row.avatar_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }

  /**
   * Updates user information
   * @param discordId - Discord user ID
   * @param username - New username
   * @param avatarUrl - New avatar URL
   * @returns Promise resolving to updated User or null
   */
  updateUser(discordId: string, username: string, avatarUrl?: string): Promise<User | null> {
    const stmt = this.db.prepare(`
      UPDATE users SET username = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE discord_id = ?
    `);
    stmt.run(username, avatarUrl || null, discordId);
    return this.getUserByDiscordId(discordId);
  }

  /**
   * Updates player statistics after a game
   * @param userId - User ID to update stats for
   * @param won - Whether the player won the game
   */
  updatePlayerStats(userId: string, won: boolean): Promise<void> {
    // Check if user exists first to avoid foreign key constraint error
    const userExists = this.db.prepare('SELECT 1 FROM users WHERE id = ?').get(userId);
    if (!userExists) {
      return Promise.resolve();
    }

    const stmt = this.db.prepare(`
      INSERT INTO player_stats (user_id, games_played, wins, losses)
      VALUES (?, 1, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        games_played = games_played + 1,
        wins = wins + ?,
        losses = losses + ?
    `);
    stmt.run(userId, won ? 1 : 0, won ? 0 : 1, won ? 1 : 0, won ? 0 : 1);
    return Promise.resolve();
  }

  /**
   * Retrieves player statistics
   * @param userId - User ID to get stats for
   * @returns Promise resolving to PlayerStats or null if not found
   */
  getPlayerStats(userId: string): Promise<PlayerStats | null> {
    const row = this.db.prepare('SELECT * FROM player_stats WHERE user_id = ?').get(userId) as any;
    if (!row) return Promise.resolve(null);
    return Promise.resolve({
      userId: row.user_id,
      gamesPlayed: row.games_played,
      wins: row.wins,
      losses: row.losses,
      winRate: row.games_played > 0 ? row.wins / row.games_played : 0
    });
  }
}

/** Singleton database manager instance */
export const database = new DatabaseManager();