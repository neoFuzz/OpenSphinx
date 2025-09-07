
import { create } from 'zustand';
import type { GameState, Move } from '../../../shared/src/types';
import { socket } from '../socket';

interface SavedGame {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

interface GameStore {
    roomId?: string;
    color?: 'RED' | 'SILVER';
    state?: GameState;
    modal?: { title: string; message: string };
    savedGames: SavedGame[];
    connectRoom: (roomId: string, name: string) => void;
    sendMove: (move: Move) => void;
    createRoom: (onCreated?: (id: string) => void) => void;
    saveGame: (name: string) => void;
    loadGame: (gameId: string) => void;
    fetchSavedGames: () => void;
    deleteSavedGame: (gameId: string) => void;
    showModal: (title: string, message: string) => void;
    hideModal: () => void;
}

let listenersBound = false;

export const useGame = create<GameStore>((set, get) => ({
    savedGames: [],

    createRoom: (onCreated) => {
        socket.emit('room:create', null, ({ roomId }: any) => {
            set({ roomId });
            onCreated?.(roomId);
        });
    },


    connectRoom: (roomId, name) => {
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

        socket.emit('room:join', { roomId, name }, (res: any) => {
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

    saveGame: (name) => {
        const { roomId } = get();
        if (!roomId) return;
        socket.emit('game:save', { roomId, name });
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
            const response = await fetch('http://localhost:3001/api/games');
            const games = await response.json();
            set({ savedGames: games });
        } catch (error) {
            console.error('Failed to fetch saved games:', error);
        }
    },

    deleteSavedGame: async (gameId) => {
        try {
            await fetch(`http://localhost:3001/api/games/${gameId}`, { method: 'DELETE' });
            get().fetchSavedGames();
        } catch (error) {
            get().showModal('Error', 'Failed to delete game');
        }
    },

    showModal: (title, message) => set({ modal: { title, message } }),
    hideModal: () => set({ modal: undefined }),
}));

// Fetch saved games on app start
useGame.getState().fetchSavedGames();
