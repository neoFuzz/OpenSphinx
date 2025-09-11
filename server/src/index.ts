
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { createRoomsManager } from './rooms';
import { database } from './database';
import { logger } from '../../shared/src/logger';

const CLIENT_URLS = process.env.CLIENT_URLS?.split(',') || ['http://localhost:5173'];

const app = express();
app.use(helmet({ hidePoweredBy: true }));
app.use(cors({ 
  origin: CLIENT_URLS, 
  credentials: true 
}));
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true }));

// Game management endpoints
app.get('/api/games', async (_req, res) => {
  try {
    const games = await database.listGames();
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
    logger.error('Failed to fetch games', { error });
  }
});

app.delete('/api/games/:id', async (req, res) => {
  try {
    await database.deleteGame(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete game' });
    logger.error('Failed to delete game', { error });
  }
});

app.get('/api/replays', async (_req, res) => {
  try {
    const replays = await database.listReplays();
    res.json(replays);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch replays' });
    logger.error('Failed to fetch replays', { error });
  }
});

app.get('/api/replays/:id', async (req, res) => {
  try {
    const replay = await database.loadReplay(req.params.id);
    if (!replay) {
      res.status(404).json({ error: 'Replay not found' });
    } else {
      res.json(replay);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load replay' });
    logger.error('Failed to load replay', { error });
  }
});

const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: CLIENT_URLS, 
    credentials: true 
  } 
});

const rooms = createRoomsManager(io);

// Create a default room on startup
rooms.createRoom();

app.get('/api/rooms', (_req, res) => {
  try {
    const roomList = rooms.listRooms();
    res.json(roomList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
    logger.error('Failed to fetch rooms', { error });
  }
});

io.on('connection', (socket) => {
  socket.on('room:create', (options: { isPrivate?: boolean; password?: string }, ack?: Function) => ack?.(rooms.createRoom(options)));
  socket.on('room:join', ({ roomId, name, password }: { roomId: string; name: string; password?: string }, ack?: Function) => rooms.joinRoom(socket, roomId, name, password, ack));
  socket.on('game:move', (payload: any) => rooms.handleMove(socket, payload));
  socket.on('game:save', (payload: { roomId: string; name: string }) => rooms.saveGame(socket, payload));
  socket.on('game:load', (payload: { gameId: string }, ack?: Function) => rooms.loadGame(socket, payload, ack));
  socket.on('disconnect', () => rooms.leaveAll(socket));
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => logger.info(`Server listening on ${HOST}:${PORT}`));
