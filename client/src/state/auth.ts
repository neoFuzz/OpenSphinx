import { create } from 'zustand';
import { SERVER_URL } from '../config/server';

interface User {
  id: string;
  discordId: string;
  username: string;
  avatarUrl?: string;
}

interface PlayerStats {
  userId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  stats: PlayerStats | null;
  login: () => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  fetchStats: () => Promise<void>;
}

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