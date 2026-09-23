-- =============================================================================
-- OpenSphinx D1 Schema — Cloudflare Migration
-- =============================================================================
-- This file defines the Cloudflare D1 (SQLite-compatible) database schema.
-- The table definitions are identical to the existing better-sqlite3 schema
-- defined in server/src/database.ts and serve as the authoritative source
-- of truth for the D1 database used by the Cloudflare Worker backend.
--
-- Apply with:  wrangler d1 execute <DB_NAME> --file=schema.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  game_state TEXT NOT NULL,
  user_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS game_replays (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  game_states TEXT NOT NULL,
  user_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS player_stats (
  user_id TEXT PRIMARY KEY,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_games_user_id ON saved_games (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_games_updated_at ON saved_games (updated_at);
CREATE INDEX IF NOT EXISTS idx_game_replays_user_id ON game_replays (user_id);
CREATE INDEX IF NOT EXISTS idx_game_replays_updated_at ON game_replays (updated_at);
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users (discord_id);
