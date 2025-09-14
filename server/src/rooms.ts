
import { Server, Socket } from 'socket.io';
import { GameState, Move, GameConfig } from '../../shared/src/types';
import { applyMove, createInitialState } from '../../shared/src/engine';
import { database } from './database';
import { logger } from '../../shared/src/logger';

interface Room {
  id: string;
  players: { socketId: string; name: string; color: 'RED'|'SILVER' }[];
  state: GameState;
  spectators: Set<string>;
  savedName?: string;
  gameStates: GameState[];
  isPrivate?: boolean;
  password?: string;
  config: GameConfig;
}

const makeId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export function createRoomsManager(io: Server) {
  const rooms = new Map<string, Room>();
  const socketToRooms = new Map<string, Set<string>>();

  function createRoom(options?: { isPrivate?: boolean; password?: string; config?: GameConfig }): { roomId: string } {
    const roomId = makeId();
    const config: GameConfig = options?.config || { rules: 'CLASSIC', setup: 'CLASSIC' };
    const initialState = createInitialState(config);
    rooms.set(roomId, {
      id: roomId,
      players: [],
      spectators: new Set(),
      state: initialState,
      gameStates: [initialState],
      isPrivate: options?.isPrivate,
      password: options?.password,
      config,
    });
    logger.info('Room created', { 
      gameId: roomId, 
      isPrivate: !!options?.isPrivate,
      passwordProtected: !!(options?.isPrivate && options?.password),
      rules: config.rules,
      setup: config.setup
    });
    return { roomId };
  }

  function joinRoom(socket: Socket, roomId: string, name: string, password?: string, ack?: Function) {
    const room = rooms.get(roomId);
    if (!room) {
      logger.warn('Join room failed - room not found', { gameId: roomId, playerName: name });
      return ack?.({ error: 'Room not found' });
    }

    if (room.isPrivate) {
      if (!room.password || room.password !== password) {
        logger.warn('Join room failed - incorrect password', { gameId: roomId, playerName: name, providedPassword: !!password });
        return ack?.({ error: 'Incorrect password' });
      }
    }

    const current = room.players.map(p => p.socketId);
    if (current.includes(socket.id)) return ack?.({ ok: true, color: room.players.find(p=>p.socketId===socket.id)?.color });

    if (room.players.length < 2) {
      const color: 'RED'|'SILVER' = room.players.length === 0 ? 'RED' : 'SILVER';
      room.players.push({ socketId: socket.id, name, color });
      socket.join(roomId);
      addSocketRoom(socket.id, roomId);
      io.to(roomId).emit('room:state', publicState(room));
      logger.info('Player joined room', { gameId: roomId, playerName: name, color });
      ack?.({ ok: true, color });
    } else {
      // spectator
      room.spectators.add(socket.id);
      socket.join(roomId);
      addSocketRoom(socket.id, roomId);
      socket.emit('room:state', publicState(room));
      logger.info('Spectator joined room', { gameId: roomId, playerName: name });
      ack?.({ ok: true, spectator: true });
    }
  }

  function publicState(room: Room) {
    return {
      roomId: room.id,
      players: room.players.map(p => ({ name: p.name, color: p.color })),
      state: room.state,
      config: room.config,
    };
  }

  function handleMove(socket: Socket, payload: { roomId: string; move: Move }) {
    const room = rooms.get(payload.roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return; // spectators can't move

    if (room.state.turn !== player.color) return;

    const next = applyMove(room.state, payload.move, room.id);
    room.state = next;
    room.gameStates.push(next);
    
    logger.info('Move applied', { gameId: room.id, player: player.color, moveType: payload.move.type });
    
    io.to(room.id).emit('game:state', { state: next, ack: payload.move.clientMoveId });

    if (next.winner) {
      logger.info('Game ended', { gameId: room.id, winner: next.winner });
      io.to(room.id).emit('game:end', { winner: next.winner });
      
      // Auto-save completed game and replay
      const gameName = `Game ${room.id} - ${next.winner} wins`;
      database.saveGame(room.id, gameName, next).catch(error => 
        logger.error('Auto-save failed', { gameId: room.id, error })
      );
      database.saveReplay(room.id, gameName, room.gameStates).catch(error => 
        logger.error('Auto-save replay failed', { gameId: room.id, error })
      );
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
      logger.info('Game saved', { gameId: room.id, saveName: payload.name });
      socket.emit('game:saved', { success: true });
    } catch (error) {
      logger.error('Game save failed', { gameId: room.id, saveName: payload.name, error });
      socket.emit('game:saved', { success: false, error: 'Failed to save game' });
    }
  }

  async function loadGame(socket: Socket, payload: { gameId: string }, ack?: Function) {
    try {
      const savedGame = await database.loadGame(payload.gameId);
      if (!savedGame) {
        logger.warn('Game load failed - not found', { gameId: payload.gameId });
        return ack?.({ error: 'Game not found' });
      }

      const roomId = makeId();
      rooms.set(roomId, {
        id: roomId,
        players: [],
        spectators: new Set(),
        state: savedGame.gameState,
        gameStates: [savedGame.gameState],
        config: savedGame.gameState.config || { rules: 'CLASSIC', setup: 'CLASSIC' },
      });

      logger.info('Game loaded', { gameId: roomId, originalGameId: payload.gameId, saveName: savedGame.name });
      ack?.({ roomId, name: savedGame.name });
    } catch (error) {
      logger.error('Game load failed', { gameId: payload.gameId, error });
      ack?.({ error: 'Failed to load game' });
    }
  }

  function listRooms() {
    return Array.from(rooms.values())
      .filter(room => !room.isPrivate) // Only show public rooms in the list
      .map(room => ({
        id: room.id,
        playerCount: room.players.length,
        spectatorCount: room.spectators.size,
        hasWinner: !!room.state.winner,
        turn: room.state.turn,
        config: room.config
      }));
  }

  return { createRoom, joinRoom, handleMove, leaveAll, saveGame, loadGame, listRooms };
}
