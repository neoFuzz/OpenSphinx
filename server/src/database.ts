import sqlite3 from 'sqlite3';
import { GameState, Move } from '../../shared/src/types';

export interface GameReplay {
  id: string;
  name: string;
  gameStates: GameState[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedGame {
  id: string;
  name: string;
  gameState: GameState;
  createdAt: Date;
  updatedAt: Date;
}

class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database('./games.db');
    this.init();
  }

  private init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS saved_games (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        game_state TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS game_replays (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        game_states TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  saveGame(id: string, name: string, gameState: GameState): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO saved_games (id, name, game_state, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run([id, name, JSON.stringify(gameState)], (err) => {
        if (err) reject(err);
        else resolve();
      });
      stmt.finalize();
    });
  }

  loadGame(id: string): Promise<SavedGame | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM saved_games WHERE id = ?',
        [id],
        (err, row: any) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else resolve({
            id: row.id,
            name: row.name,
            gameState: JSON.parse(row.game_state),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
          });
        }
      );
    });
  }

  listGames(): Promise<(Omit<SavedGame, 'gameState'> & { winner?: string })[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, name, game_state, created_at, updated_at FROM saved_games ORDER BY updated_at DESC',
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => {
            const gameState = JSON.parse(row.game_state);
            return {
              id: row.id,
              name: row.name,
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at),
              winner: gameState.winner
            };
          }));
        }
      );
    });
  }

  deleteGame(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM saved_games WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  saveReplay(id: string, name: string, gameStates: GameState[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO game_replays (id, name, game_states, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run([id, name, JSON.stringify(gameStates)], (err) => {
        if (err) reject(err);
        else resolve();
      });
      stmt.finalize();
    });
  }

  loadReplay(id: string): Promise<GameReplay | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM game_replays WHERE id = ?',
        [id],
        (err, row: any) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else resolve({
            id: row.id,
            name: row.name,
            gameStates: JSON.parse(row.game_states),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
          });
        }
      );
    });
  }

  listReplays(): Promise<Omit<GameReplay, 'gameStates'>[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, name, created_at, updated_at FROM game_replays ORDER BY updated_at DESC',
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => ({
            id: row.id,
            name: row.name,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
          })));
        }
      );
    });
  }
}

export const database = new Database();