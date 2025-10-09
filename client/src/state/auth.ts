import { create } from 'zustand';
import { SERVER_URL } from '../config/server';

/**
 * User account information from Discord authentication
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
 * Player game statistics
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
 * Authentication state and actions
 */
interface AuthState {
  /** Currently authenticated user, null if not logged in */
  user: User | null;
  /** Whether authentication check is in progress */
  loading: boolean;
  /** Player statistics, null if not loaded */
  stats: PlayerStats | null;
  /** Initiate Discord OAuth login */
  login: () => void;
  /** Log out the current user */
  logout: () => void;
  /** Check current authentication status */
  checkAuth: () => Promise<void>;
  /** Fetch player statistics */
  fetchStats: () => Promise<void>;
}

/**
 * Authentication store using Zustand
 * 
 * Manages user authentication state, Discord OAuth integration,
 * and player statistics. Provides methods for login, logout,
 * and fetching user data from the server.
 */
export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  stats: null,

  login: () => {
    window.location.href = `${SERVER_URL}/auth/discord`;
  },

  logout: async () => {
    try {
      await fetch(`${SERVER_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      set({ user: null });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },

  checkAuth: async () => {
    try {
      const response = await fetch(`${SERVER_URL}/auth/me`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        set({ user: data.user, loading: false });
        (window as any).authUser = data.user;
        get().fetchStats();
      } else {
        set({ user: null, loading: false });
        (window as any).authUser = null;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ user: null, loading: false });
      (window as any).authUser = null;
    }
  },

  fetchStats: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/stats/${user.id}`);

      if (response.ok) {
        const stats = await response.json();
        set({ stats });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }
}));