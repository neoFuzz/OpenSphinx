/**
 * Game state management module using Zustand.
 * 
 * Provides centralized state management for game rooms, moves, save/load functionality,
 * and replays. Handles Socket.IO communication with the server for real-time gameplay.
 * 
 * @module state/game
 */

import { create } from 'zustand';
import type { GameState, Move } from '../../../shared/src/types';
import { socket } from '../socket';
import { SERVER_URL } from '../config/server';

/**
 * Saved game metadata
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
 * Replay metadata for completed games
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
 * Pagination metadata for paginated API responses
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
 * Game state management store
 */
interface GameStore {
    /** Current room ID if connected to a game */
    roomId?: string;
    /** Player's assigned color in the current game */
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
    /**
     * Create a new game room
     * @param options - Room configuration options
     * @param options.isPrivate - Whether the room is private
     * @param options.password - Optional password for room access
     * @param options.config - Game configuration (rules and setup)
     * @param onCreated - Callback invoked with room ID when created
     */
    createRoom: (options?: { isPrivate?: boolean; password?: string; config?: { rules: string; setup: string } }, onCreated?: (id: string) => void) => void;
    /**
     * Connect to an existing game room
     * @param roomId - Unique room identifier
     * @param name - Player's display name
     * @param password - Optional room password
     */
    connectRoom: (roomId: string, name: string, password?: string) => void;
    /**
     * Send a move to the server for the current game
     * @param move - Move object containing piece and action details
     */
    sendMove: (move: Move) => void;
    /**
     * Save the current game state to the server
     * @param name - Display name for the saved game
     * @param userId - Optional user ID for ownership
     */
    saveGame: (name: string, userId?: string) => void;
    /**
     * Load a previously saved game by ID
     * @param gameId - Unique identifier of the saved game
     */
    loadGame: (gameId: string) => void;
    /**
     * Fetch list of saved games from server via REST API
     */
    fetchSavedGames: () => void;
    /**
     * Delete a saved game from the server
     * @param gameId - Unique identifier of the game to delete
     */
    deleteSavedGame: (gameId: string) => void;
    /**
     * Fetch paginated list of replays from server
     * @param page - Page number (default: 1)
     * @param limit - Items per page (default: 10)
     * @param search - Optional search query
     */
    fetchReplays: (page?: number, limit?: number, search?: string) => void;
    /**
     * Show a modal dialog with title and message
     * @param title - Modal title
     * @param message - Modal message content
     */
    showModal: (title: string, message: string) => void;
    /**
     * Hide the currently displayed modal dialog
     */
    hideModal: () => void;
}

/** Flag to prevent duplicate socket listener binding */
let listenersBound = false;

/**
 * Game state store using Zustand.
 * 
 * Manages game rooms, moves, save/load functionality, and replays.
 * Handles Socket.IO communication with the server for real-time gameplay.
 * Provides methods for room management, game persistence, and user notifications.
 * 
 * @returns Zustand store with game state and actions
 * 
 * @example
 * ```tsx
 * const { roomId, state, connectRoom, sendMove } = useGame();
 * 
 * // Create a room
 * createRoom({ isPrivate: false }, (roomId) => console.log('Room created:', roomId));
 * 
 * // Connect to a room
 * connectRoom('ROOM123', 'PlayerName');
 * 
 * // Send a move
 * sendMove({ from: { row: 0, col: 0 }, action: 'move', to: { row: 1, col: 0 } });
 * ```
 */
export const useGame = create<GameStore>((set, get) => ({
    savedGames: [],
    replays: [],

    /**
     * Creates a new game room on the server.
     * Emits 'room:create' socket event and updates store with new room ID.
     */
    createRoom: (options, onCreated) => {
        console.log('createRoom called, socket connected:', socket.connected);
        socket.emit('room:create', options || {}, ({ roomId }: any) => {
            console.log('room:create response:', roomId);
            set({ roomId });
            onCreated?.(roomId);
        });
    },


    /**
     * Connects to an existing game room.
     * Sets up socket listeners on first call and emits 'room:join' event.
     * Updates store with room ID and assigned player color on success.
     */
    connectRoom: (roomId, name, password) => {
        // Bind socket listeners only once
        if (!listenersBound) {
            socket.on('connect', () => console.log('socket connected', socket.id));
            socket.on('room:state', (payload) => set({ state: payload.state }));
            socket.on('game:state', (payload) => set({ state: payload.state }));
            socket.on('game:end', (payload) => {
                get().showModal('Game Over', `Winner: ${payload.winner}`);
            });
            socket.on('game:saved', (payload) => {
                if (payload.success) {
                    get().showModal('Success', 'Game saved successfully!');
                    get().fetchSavedGames();
                } else {
                    get().showModal('Error', payload.error || 'Failed to save game');
                }
            });
            listenersBound = true;
        }

        // Get current user from auth state
        const userId = (window as any).authUser?.id;

        socket.emit('room:join', { roomId, name, password, userId }, (res: any) => {
            if (res?.ok) {
                set({ roomId, color: res.color });
            } else if (res?.error) {
                get().showModal('Error', res.error);
            }
        });
    },


    /**
     * Sends a move to the server for the current game.
     * Requires an active room connection.
     */
    sendMove: (move) => {
        const { roomId } = get();
        if (!roomId) return;
        socket.emit('game:move', { roomId, move });
    },

    /**
     * Saves the current game state to the server.
     * Emits 'game:save' socket event with room ID and game name.
     */
    saveGame: (name, userId) => {
        const { roomId } = get();
        if (!roomId) return;
        socket.emit('game:save', { roomId, name, userId });
    },

    /**
     * Loads a previously saved game from the server.
     * Updates store with new room ID and displays success/error modal.
     */
    loadGame: (gameId) => {
        socket.emit('game:load', { gameId }, (res: any) => {
            if (res?.roomId) {
                set({ roomId: res.roomId });
                get().showModal('Success', `Loaded game: ${res.name}`);
            } else {
                get().showModal('Error', res?.error || 'Failed to load game');
            }
        });
    },

    /**
     * Fetches all saved games from the server via REST API.
     * Updates store with retrieved games list.
     */
    fetchSavedGames: async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/games`);
            const games = await response.json();
            set({ savedGames: games });
        } catch (error) {
            console.error('Failed to fetch saved games:', error);
        }
    },

    /**
     * Deletes a saved game from the server.
     * Refreshes the saved games list on success.
     */
    deleteSavedGame: async (gameId) => {
        try {
            const response = await fetch(`${SERVER_URL}/api/games/${gameId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await get().fetchSavedGames();
        } catch (error) {
            get().showModal('Error', 'Failed to delete game');
        }
    },

    /**
     * Fetches paginated replays from the server.
     * Updates store with replays list and pagination metadata.
     */
    fetchReplays: async (page = 1, limit = 10, search = '') => {
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), search });
            const response = await fetch(`${SERVER_URL}/api/replays?${params}`);
            const data = await response.json();
            set({ replays: data.replays, replaysPagination: data.pagination });
        } catch (error) {
            console.error('Failed to fetch replays:', error);
        }
    },

    showModal: (title, message) => set({ modal: { title, message } }),
    hideModal: () => set({ modal: undefined }),
}));

/**
 * Initialize the game store by fetching saved games on app start.
 * This ensures the saved games list is populated when the app loads.
 */
useGame.getState().fetchSavedGames();
