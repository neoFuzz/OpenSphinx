
import { Server, Socket } from 'socket.io';
import { GameState, Move } from '../../shared/src/types';
import { applyMove, createInitialState } from '../../shared/src/engine';
import { database } from './database';

interface Room {
  id: string;
  players: { socketId: string; name: string; color: 'RED'|'SILVER' }[];
  state: GameState;
  spectators: Set<string>;
  savedName?: string;
}

const makeId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export function createRoomsManager(io: Server) {
  const rooms = new Map<string, Room>();
  const socketToRooms = new Map<string, Set<string>>();

  function createRoom(): { roomId: string } {
    const roomId = makeId();
    rooms.set(roomId, {
      id: roomId,
      players: [],
      spectators: new Set(),
      state: createInitialState(),
    });
    return { roomId };
  }

  function joinRoom(socket: Socket, roomId: string, name: string, ack?: Function) {
    const room = rooms.get(roomId);
    if (!room) return ack?.({ error: 'Room not found' });

    const current = room.players.map(p => p.socketId);
    if (current.includes(socket.id)) return ack?.({ ok: true, color: room.players.find(p=>p.socketId===socket.id)?.color });

    if (room.players.length < 2) {
      const color: 'RED'|'SILVER' = room.players.length === 0 ? 'RED' : 'SILVER';
      room.players.push({ socketId: socket.id, name, color });
      socket.join(roomId);
      addSocketRoom(socket.id, roomId);
      io.to(roomId).emit('room:state', publicState(room));
      ack?.({ ok: true, color });
    } else {
      // spectator
      room.spectators.add(socket.id);
      socket.join(roomId);
      addSocketRoom(socket.id, roomId);
      socket.emit('room:state', publicState(room));
      ack?.({ ok: true, spectator: true });
    }
  }

  function publicState(room: Room) {
    return {
      roomId: room.id,
      players: room.players.map(p => ({ name: p.name, color: p.color })),
      state: room.state,
    };
  }

  function handleMove(socket: Socket, payload: { roomId: string; move: Move }) {
    const room = rooms.get(payload.roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return; // spectators can't move

    if (room.state.turn !== player.color) return;

    const next = applyMove(room.state, payload.move);
    room.state = next;
    
    io.to(room.id).emit('game:state', { state: next, ack: payload.move.clientMoveId });

    if (next.winner) {
      io.to(room.id).emit('game:end', { winner: next.winner });
    }
  }

  function leaveAll(socket: Socket) {
    const set = socketToRooms.get(socket.id);
    if (!set) return;
    for (const roomId of set) {
      const room = rooms.get(roomId);
      if (!room) continue;
      room.players = room.players.filter(p => p.socketId !== socket.id);
      room.spectators.delete(socket.id);
      if (room.players.length === 0 && room.spectators.size === 0) {
        rooms.delete(roomId);
      } else {
        io.to(roomId).emit('room:state', publicState(room));
      }
    }
    socketToRooms.delete(socket.id);
  }

  function addSocketRoom(socketId: string, roomId: string) {
    const set = socketToRooms.get(socketId) ?? new Set<string>();
    set.add(roomId);
    socketToRooms.set(socketId, set);
  }

  async function saveGame(socket: Socket, payload: { roomId: string; name: string }) {
    const room = rooms.get(payload.roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    try {
      await database.saveGame(payload.roomId, payload.name, room.state);
      socket.emit('game:saved', { success: true });
    } catch (error) {
      socket.emit('game:saved', { success: false, error: 'Failed to save game' });
    }
  }

  async function loadGame(socket: Socket, payload: { gameId: string }, ack?: Function) {
    try {
      const savedGame = await database.loadGame(payload.gameId);
      if (!savedGame) {
        return ack?.({ error: 'Game not found' });
      }

      const roomId = makeId();
      rooms.set(roomId, {
        id: roomId,
        players: [],
        spectators: new Set(),
        state: savedGame.gameState,
      });

      ack?.({ roomId, name: savedGame.name });
    } catch (error) {
      ack?.({ error: 'Failed to load game' });
    }
  }

  return { createRoom, joinRoom, handleMove, leaveAll, saveGame, loadGame };
}
