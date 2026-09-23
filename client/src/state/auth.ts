/**
 * Authentication state management using Zustand.
 *
 * Manages Discord OAuth login/logout, JWT session checks, and player stats.
 * After a successful auth check the module also fetches a fresh CSRF token and
 * stores it in the game store so mutating actions (move, save, delete) can
 * include it without a separate round-trip.
 *
 * @module state/auth
 */

import { create } from 'zustand';
import { SERVER_URL } from '../config/server';

/**
 * User account information from Discord authentication.
 */
interface User {
  /** Unique user identifier */
  id: string;
  /** Discord user ID */
  discordId: string;
  /** Discord username */
  username: string;
  /** Discord avatar URL */
  avatarUrl?: string;
}

/**
 * Player game statistics.
 */
interface PlayerStats {
  /** User ID these stats belong to */
  userId: string;
  /** Total number of games played */
  gamesPlayed: number;
  /** Number of games won */
  wins: number;
  /** Number of games lost */
  losses: number;
  /** Win rate as a decimal (0.0 to 1.0) */
  winRate: number;
}

/**
 * Authentication state and actions.
 */
interface AuthState {
  /** Currently authenticated user, null if not logged in */
  user: User | null;
  /** Whether an authentication check is in progress */
  loading: boolean;
  /** Player statistics, null if not loaded */
  stats: PlayerStats | null;
  /** Initiate Discord OAuth login */
  login: () => void;
  /** Log out the current user */
  logout: () => void;
  /** Check current authentication status and refresh CSRF token */
  checkAuth: () => Promise<void>;
  /** Fetch player statistics */
  fetchStats: () => Promise<void>;
}

/**
 * Authentication store using Zustand.
 *
 * Manages user authentication state, Discord OAuth integration, and player
 * statistics.  On a successful `checkAuth()` call the store also pushes a
 * fresh CSRF token into the game store — this avoids a circular import by
 * lazily calling `useGame.getState()` inside the async function rather than
 * at module initialisation time.
 */
export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  stats: null,

  /**
   * Redirects the browser to the Discord OAuth authorisation page.
   */
  login: () => {
    window.location.href = `${SERVER_URL}/auth/discord`;
  },

  /**
   * Clears the server-side session cookie and resets local auth state.
   */
  logout: async () => {
    try {
      await fetch(`${SERVER_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      set({ user: null });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },

  /**
   * Verifies the current session via `GET /auth/me`.
   * On success, fetches player stats and a fresh CSRF token for the game store.
   */
  checkAuth: async () => {
    try {
      const response = await fetch(`${SERVER_URL}/auth/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = (await response.json()) as { user: User };
        set({ user: data.user, loading: false });
        // Expose user on window for legacy code paths that read it directly
        (window as Record<string, unknown>).authUser = data.user;
        get().fetchStats();
      } else {
        set({ user: null, loading: false });
        (window as Record<string, unknown>).authUser = null;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ user: null, loading: false });
      (window as Record<string, unknown>).authUser = null;
    }

    // Fetch a CSRF token regardless of auth outcome — unauthenticated users
    // still need CSRF protection for join/move actions.
    // Imported lazily to avoid a circular module dependency at initialisation.
    try {
      const csrfRes = await fetch(`${SERVER_URL}/api/csrf-token`, {
        credentials: 'include',
      });
      if (csrfRes.ok) {
        const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
        // Lazy import breaks the auth ↔ game circular dependency
        const { useGame } = await import('./game');
        useGame.getState().setCsrfToken(csrfToken);
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  },

  /**
   * Fetches player statistics for the current user from `GET /api/stats/:userId`.
   */
  fetchStats: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/stats/${user.id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const stats = (await response.json()) as PlayerStats;
        set({ stats });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },
}));
