import sqlite3 from 'sqlite3';
import { GameState } from '../../shared/src/types';

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

  listGames(): Promise<Omit<SavedGame, 'gameState'>[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, name, created_at, updated_at FROM saved_games ORDER BY updated_at DESC',
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

  deleteGame(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM saved_games WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export const database = new Database();