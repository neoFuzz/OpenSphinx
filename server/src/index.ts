require('dotenv').config();
import express from 'express';
import http from 'http';
import https from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import csrf from '@dr.pogodin/csurf';
import { createRoomsManager } from './rooms';
import { database } from './database';
import { logger } from '../../shared/src/logger';
import { GameConfig } from '../../shared/src/types';
import authRoutes from './auth';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from './middleware';
import fs from 'fs';

const CLIENT_URLS = process.env.CLIENT_URLS?.split(',') || ['http://localhost:5173'];
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const app = express();

// Security middleware
app.use(helmet({
  hidePoweredBy: true,
  hsts: IS_PRODUCTION ? { maxAge: 31536000, includeSubDomains: true } : false
}));

app.use(cors({ 
  origin: CLIENT_URLS, 
  credentials: true 
}));

app.use(cookieParser());
app.use(express.json());

// CSRF protection
const csrfProtection = csrf({
  cookie: true
});

app.use('/api/games', csrfProtection);
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per window
  message: { error: 'Too many authentication attempts' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});

// Game management endpoints (before rate limiter)
app.get('/api/games', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const games = await database.listGames();
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
    logger.error('Failed to fetch games', { error });
  }
});



app.get('/api/stats/:userId', async (req, res) => {
  try {
    const stats = await database.getPlayerStats(req.params.userId);
    res.json(stats || { userId: req.params.userId, gamesPlayed: 0, wins: 0, losses: 0, winRate: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
    logger.error('Failed to fetch stats', { error });
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

app.use('/api', apiLimiter);
app.use('/auth', authLimiter, authRoutes);
app.get('/health', (_req, res) => res.json({ ok: true }));

app.delete('/api/games/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await database.deleteGame(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete game' });
    logger.error('Failed to delete game', { error });
  }
});

// HTTPS setup for production
let server;
if (IS_PRODUCTION && process.env.SSL_KEY && process.env.SSL_CERT) {
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY),
    cert: fs.readFileSync(process.env.SSL_CERT)
  };
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}
const io = new Server(server, { 
  cors: { 
    origin: CLIENT_URLS, 
    credentials: true 
  }
});

const rooms = createRoomsManager(io);

// Create a default room on startup with classic setup and khet 2.0 rules
rooms.createRoom({ config: { rules: 'KHET_2_0', setup: 'CLASSIC' } });

// Add rooms endpoint after rooms is created
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
  socket.on('room:create', (options: { isPrivate?: boolean; password?: string; config?: GameConfig }, ack?: Function) => ack?.(rooms.createRoom(options)));
  socket.on('room:join', ({ roomId, name, password, userId }: { roomId: string; name: string; password?: string; userId?: string }, ack?: Function) => rooms.joinRoom(socket, roomId, name, password, userId, ack));
  socket.on('game:move', (payload: any) => rooms.handleMove(socket, payload));
  socket.on('game:save', (payload: { roomId: string; name: string }) => rooms.saveGame(socket, payload));
  socket.on('game:load', (payload: { gameId: string }, ack?: Function) => rooms.loadGame(socket, payload, ack));
  socket.on('disconnect', () => rooms.leaveAll(socket));
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => logger.info(`Server listening on ${HOST}:${PORT}`));
