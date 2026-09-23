/**
 * Game state management module using Zustand.
 *
 * Provides centralised state management for game rooms, moves, save/load
 * functionality, and replays.  Real-time server push now arrives over an SSE
 * stream (`EventSource`); client-to-server actions use plain HTTP POST via
 * `postToRoom` and `fetch`.
 *
 * @module state/game
 */

import { create } from 'zustand';
import type { GameState, Move } from '../../../shared/src/types';
import { SERVER_URL } from '../config/server';
import { connectToRoom, getClientId, postToRoom } from '../sse';

/**
 * Saved game metadata returned by `/api/games`.
 */
interface SavedGame {
  /** Unique game identifier */
  id: string;
  /** Display name of the saved game */
  name: string;
  /** Timestamp when the game was created */
  createdAt: string;
  /** Timestamp when the game was last updated */
  updatedAt: string;
  /** Winner of the game, if finished */
  winner?: string;
}

/**
 * Replay metadata for completed games.
 */
interface ReplayItem {
  /** Unique replay identifier */
  id: string;
  /** Display name of the replay */
  name: string;
  /** Timestamp when the replay was created */
  createdAt: string;
  /** Timestamp when the replay was last updated */
  updatedAt: string;
}

/**
 * Pagination metadata for paginated API responses.
 */
interface Pagination {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages available */
  totalPages: number;
}

/**
 * A player entry inside the `room:state` event payload.
 */
interface RoomPlayer {
  /** Display name */
  name: string;
  /** Assigned board colour */
  color: 'RED' | 'SILVER';
  /** Client identifier (matches `getClientId()` for the local player) */
  clientId?: string;
}

/**
 * Payload emitted by the server on the `room:state` SSE event.
 */
interface RoomStatePayload {
  roomId: string;
  players: RoomPlayer[];
  spectatorCount: number;
  state: GameState;
  config: unknown;
  isPrivate: boolean;
}

/**
 * Payload emitted by the server on the `game:state` SSE event.
 */
interface GameStatePayload {
  state: GameState;
  ack?: string;
}

/**
 * Payload emitted by the server on the `game:end` SSE event.
 */
interface GameEndPayload {
  winner: string;
}

/**
 * Payload emitted by the server on the `game:saved` SSE event.
 */
interface GameSavedPayload {
  success: boolean;
  error?: string;
}

/**
 * Response body from `POST /api/rooms/:id/join`.
 */
interface JoinResponse {
  ok: boolean;
  color?: 'RED' | 'SILVER';
  error?: string;
}

/**
 * Response body from `POST /api/rooms/load`.
 */
interface LoadResponse {
  roomId?: string;
  name?: string;
  error?: string;
}

/**
 * Game state management store.
 */
interface GameStore {
  /** Current room ID if connected to a game */
  roomId?: string;
  /** Player's assigned colour in the current game */
  color?: 'RED' | 'SILVER';
  /** Current game state with board and turn information */
  state?: GameState;
  /** Modal dialog state for user notifications */
  modal?: { title: string; message: string };
  /** List of saved games */
  savedGames: SavedGame[];
  /** List of available replays */
  replays: ReplayItem[];
  /** Pagination info for replays */
  replaysPagination?: Pagination;
  /** Renderer mode for 3D view */
  renderMode: 'webgl' | 'webgpu';
  /** CSRF token fetched from `/api/csrf-token` */
  csrfToken: string | null;
  /** Stable client identifier for SSE / action attribution */
  clientId: string;

  /** Set renderer mode */
  setRenderMode: (mode: 'webgl' | 'webgpu') => void;
  /** Store a freshly-issued CSRF token */
  setCsrfToken: (token: string) => void;

  /**
   * Create a new game room via `POST /api/rooms`.
   *
   * @param options - Optional room configuration.
   * @param onCreated - Callback invoked with the new room ID.
   */
  createRoom: (
    options?: { isPrivate?: boolean; password?: string; config?: { rules: string; setup: string } },
    onCreated?: (id: string) => void
  ) => void;

  /**
   * Open an SSE stream for the room and join as a player.
   *
   * @param roomId - Room to join.
   * @param name - Display name.
   * @param password - Optional room password.
   */
  connectRoom: (roomId: string, name: string, password?: string) => void;

  /**
   * Send a move to the server for the current game.
   *
   * @param move - Move to apply.
   */
  sendMove: (move: Move) => void;

  /**
   * Save the current game state to the server.
   *
   * @param name - Display name for the saved game.
   */
  saveGame: (name: string) => void;

  /**
   * Load a previously saved game by ID.
   *
   * @param gameId - Unique identifier of the saved game.
   */
  loadGame: (gameId: string) => void;

  /** Fetch the list of saved games from `GET /api/games`. */
  fetchSavedGames: () => void;

  /**
   * Delete a saved game from the server.
   *
   * @param gameId - Unique identifier of the game to delete.
   */
  deleteSavedGame: (gameId: string) => void;

  /**
   * Fetch a paginated list of replays from `GET /api/replays`.
   *
   * @param page - Page number (default: 1).
   * @param limit - Items per page (default: 10).
   * @param search - Optional search query.
   */
  fetchReplays: (page?: number, limit?: number, search?: string) => void;

  /**
   * Show a modal dialog.
   *
   * @param title - Modal title.
   * @param message - Modal body text.
   */
  showModal: (title: string, message: string) => void;

  /** Hide the currently displayed modal dialog. */
  hideModal: () => void;
}

/**
 * Game state store using Zustand.
 *
 * All server communication now uses:
 * - `EventSource` (SSE) for server-to-client push events
 * - `fetch` / `postToRoom` for client-to-server actions
 *
 * @example
 * ```tsx
 * const { roomId, state, connectRoom, sendMove } = useGame();
 * connectRoom('ROOM123', 'PlayerName');
 * sendMove({ type: 'MOVE', from: { r: 0, c: 0 }, to: { r: 1, c: 0 } });
 * ```
 */
export const useGame = create<GameStore>((set, get) => ({
  savedGames: [],
  replays: [],
  renderMode: 'webgl',
  csrfToken: null,
  clientId: getClientId(),

  setRenderMode: (mode) => set({ renderMode: mode }),
  setCsrfToken: (token) => set({ csrfToken: token }),

  /**
   * Creates a new game room via REST and calls `onCreated` with the room ID.
   */
  createRoom: async (options, onCreated) => {
    try {
      const { csrfToken } = get();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const response = await fetch(`${SERVER_URL}/api/rooms`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(options ?? {}),
      });
      const data = (await response.json()) as { roomId?: string; error?: string };
      if (data.roomId) {
        set({ roomId: data.roomId });
        onCreated?.(data.roomId);
      } else {
        get().showModal('Error', data.error ?? 'Failed to create room');
      }
    } catch (error) {
      console.error('createRoom failed:', error);
      get().showModal('Error', 'Failed to create room');
    }
  },

  /**
   * Opens an SSE stream for the room, registers event listeners, then POSTs
   * the join action so the server adds this client to the room.
   */
  connectRoom: (roomId, name, password) => {
    const es = connectToRoom(roomId);
    set({ roomId });

    es.addEventListener('room:state', (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as RoomStatePayload;
      // Determine this client's colour from the player list
      const clientId = getClientId();
      const self = payload.players.find((p) => p.clientId === clientId);
      set({ state: payload.state, color: self?.color });
    });

    es.addEventListener('game:state', (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as GameStatePayload;
      set({ state: payload.state });
    });

    es.addEventListener('game:end', (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as GameEndPayload;
      get().showModal('Game Over', `Winner: ${payload.winner}`);
    });

    es.addEventListener('game:saved', (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as GameSavedPayload;
      if (payload.success) {
        get().showModal('Success', 'Game saved successfully!');
        get().fetchSavedGames();
      } else {
        get().showModal('Error', payload.error ?? 'Failed to save game');
      }
    });

    // Join the room — fire-and-forget; errors surfaced via modal
    const { csrfToken } = get();
    const token = csrfToken ?? '';
    postToRoom(roomId, 'join', { name, password }, token)
      .then((res) => {
        const result = res as JoinResponse;
        if (result.ok && result.color) {
          set({ color: result.color });
        } else if (result.error) {
          get().showModal('Error', result.error);
        }
      })
      .catch((err: unknown) => {
        console.error('join failed:', err);
        get().showModal('Error', 'Failed to join room');
      });
  },

  /**
   * Sends a move to the server via `POST /api/rooms/:id/move`.
   */
  sendMove: (move) => {
    const { roomId, csrfToken } = get();
    if (!roomId) return;
    postToRoom(roomId, 'move', { move }, csrfToken ?? '').catch((err: unknown) => {
      console.error('sendMove failed:', err);
    });
  },

  /**
   * Saves the current game state via `POST /api/rooms/:id/save`.
   */
  saveGame: (name) => {
    const { roomId, csrfToken } = get();
    if (!roomId) return;
    postToRoom(roomId, 'save', { name }, csrfToken ?? '').catch((err: unknown) => {
      console.error('saveGame failed:', err);
    });
  },

  /**
   * Loads a saved game via `POST /api/rooms/load` and updates the room ID.
   */
  loadGame: async (gameId) => {
    try {
      const { csrfToken } = get();
      const response = await fetch(`${SERVER_URL}/api/rooms/load`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken ?? '',
        },
        body: JSON.stringify({ gameId }),
      });
      const data = (await response.json()) as LoadResponse;
      if (data.roomId) {
        set({ roomId: data.roomId });
        get().showModal('Success', `Loaded game: ${data.name ?? gameId}`);
      } else {
        get().showModal('Error', data.error ?? 'Failed to load game');
      }
    } catch (error) {
      console.error('loadGame failed:', error);
      get().showModal('Error', 'Failed to load game');
    }
  },

  /**
   * Fetches all saved games from `GET /api/games`.
   */
  fetchSavedGames: async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/games`, { credentials: 'include' });
      const games = (await response.json()) as SavedGame[];
      set({ savedGames: games });
    } catch (error) {
      console.error('Failed to fetch saved games:', error);
    }
  },

  /**
   * Deletes a saved game via `DELETE /api/games/:id` then refreshes the list.
   */
  deleteSavedGame: async (gameId) => {
    try {
      const { csrfToken } = get();
      const response = await fetch(`${SERVER_URL}/api/games/${gameId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken ?? '' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await get().fetchSavedGames();
    } catch (error) {
      console.error('deleteSavedGame failed:', error);
      get().showModal('Error', 'Failed to delete game');
    }
  },

  /**
   * Fetches paginated replays from `GET /api/replays`.
   */
  fetchReplays: async (page = 1, limit = 10, search = '') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
      });
      const response = await fetch(`${SERVER_URL}/api/replays?${params}`, {
        credentials: 'include',
      });
      const data = (await response.json()) as { replays: ReplayItem[]; pagination: Pagination };
      set({ replays: data.replays, replaysPagination: data.pagination });
    } catch (error) {
      console.error('Failed to fetch replays:', error);
    }
  },

  showModal: (title, message) => set({ modal: { title, message } }),
  hideModal: () => set({ modal: undefined }),
}));

/**
 * Prefetch saved games when the module loads so the list is ready on first render.
 */
useGame.getState().fetchSavedGames();
