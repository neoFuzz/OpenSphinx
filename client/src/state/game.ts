
import { create } from 'zustand';
import type { GameState, Move } from '../../../shared/src/types';
import { socket } from '../socket';

interface GameStore {
    roomId?: string;
    color?: 'RED' | 'SILVER';
    state?: GameState;
    modal?: { title: string; message: string };
    connectRoom: (roomId: string, name: string) => void;
    sendMove: (move: Move) => void;
    createRoom: (onCreated?: (id: string) => void) => void;
    showModal: (title: string, message: string) => void;
    hideModal: () => void;
}

let listenersBound = false;

export const useGame = create<GameStore>((set, get) => ({
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

    showModal: (title, message) => set({ modal: { title, message } }),
    hideModal: () => set({ modal: undefined }),
}));
