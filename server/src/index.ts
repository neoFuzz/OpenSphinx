
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { createRoomsManager } from './rooms';
import { database } from './database';
import { logger } from '../../shared/src/logger';

const app = express();
app.use(helmet({ hidePoweredBy: true }));
app.use(cors({ origin: true, credentials: true }));
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

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

const rooms = createRoomsManager(io);

io.on('connection', (socket) => {
  socket.on('room:create', (_: unknown, ack?: Function) => ack?.(rooms.createRoom()));
  socket.on('room:join', ({ roomId, name }: { roomId: string; name: string }, ack?: Function) => rooms.joinRoom(socket, roomId, name, ack));
  socket.on('game:move', (payload: any) => rooms.handleMove(socket, payload));
  socket.on('game:save', (payload: { roomId: string; name: string }) => rooms.saveGame(socket, payload));
  socket.on('game:load', (payload: { gameId: string }, ack?: Function) => rooms.loadGame(socket, payload, ack));
  socket.on('disconnect', () => rooms.leaveAll(socket));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => logger.info(`Server listening on ${PORT}`));
