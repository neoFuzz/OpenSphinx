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
    /** Connect to an existing game room */
    connectRoom: (roomId: string, name: string, password?: string) => void;
    /** Send a move to the server */
    sendMove: (move: Move) => void;
    /** Create a new game room */
    createRoom: (options?: { isPrivate?: boolean; password?: string; config?: { rules: string; setup: string } }, onCreated?: (id: string) => void) => void;
    /** Save the current game state */
    saveGame: (name: string, userId?: string) => void;
    /** Load a previously saved game */
    loadGame: (gameId: string) => void;
    /** Fetch list of saved games from server */
    fetchSavedGames: () => void;
    /** Delete a saved game */
    deleteSavedGame: (gameId: string) => void;
    /** Fetch list of replays from server */
    fetchReplays: () => void;
    /** Show a modal dialog with title and message */
    showModal: (title: string, message: string) => void;
    /** Hide the current modal dialog */
    hideModal: () => void;
}

/** Flag to prevent duplicate socket listener binding */
let listenersBound = false;

/**
 * Game state store using Zustand
 * 
 * Manages game rooms, moves, save/load functionality, and replays.
 * Handles Socket.IO communication with the server for real-time gameplay.
 * Provides methods for room management, game persistence, and user notifications.
 */
export const useGame = create<GameStore>((set, get) => ({
    savedGames: [],
    replays: [],

    createRoom: (options, onCreated) => {
        console.log('createRoom called, socket connected:', socket.connected);
        socket.emit('room:create', options || {}, ({ roomId }: any) => {
            console.log('room:create response:', roomId);
            set({ roomId });
            onCreated?.(roomId);
        });
    },


    connectRoom: (roomId, name, password) => {
        if (!listenersBound) {
            socket.on('connect', () => console.log('socket connected', socket.id));
            socket.on('room:state', (payload) => set({ state: payload.state }));
            socket.on('game:state', (payload) => set({ state: payload.state }));
            socket.on('game:end', (payload) => get().showModal('Game Over', `Winner: ${payload.winner}`));
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


    sendMove: (move) => {
        const { roomId } = get();
        if (!roomId) return;
        socket.emit('game:move', { roomId, move });
    },

    saveGame: (name, userId) => {
        const { roomId } = get();
        if (!roomId) return;
        socket.emit('game:save', { roomId, name, userId });
    },

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

    fetchSavedGames: async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/games`);
            const games = await response.json();
            set({ savedGames: games });
        } catch (error) {
            console.error('Failed to fetch saved games:', error);
        }
    },

    deleteSavedGame: async (gameId) => {
        try {
            const response = await fetch(`${SERVER_URL}/api/games/${gameId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await get().fetchSavedGames();
        } catch (error) {
            get().showModal('Error', 'Failed to delete game');
        }
    },

    fetchReplays: async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/replays`);
            const replays = await response.json();
            set({ replays });
        } catch (error) {
            console.error('Failed to fetch replays:', error);
        }
    },

    showModal: (title, message) => set({ modal: { title, message } }),
    hideModal: () => set({ modal: undefined }),
}));

/**
 * Initialize the game store by fetching saved games on app start
 */
useGame.getState().fetchSavedGames();
