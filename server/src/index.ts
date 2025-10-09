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
import jwt from 'jsonwebtoken';
import fs from 'fs';

const isValidHostname = (hostname: string): boolean => {
  const allowedDomain = process.env.ALLOWED_DOMAIN || '.';
  return hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith(allowedDomain);
};

const validateClientUrls = (urls: string[]): string[] => {
  return urls.filter(url => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol) && isValidHostname(parsed.hostname);
    } catch (error) {
      logger.warn(`Invalid client URL: ${url}`, error)
      return false;
    }
  });
};

const CLIENT_URLS = validateClientUrls(process.env.CLIENT_URLS?.split(',') || ['http://localhost:5173']);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

console.log("Running in production mode:", IS_PRODUCTION)
console.log('*** Start up information ***');
logger.info('NODE_ENV:', process.env.NODE_ENV);
logger.info('ALLOWED_DOMAIN:', process.env.ALLOWED_DOMAIN);
logger.info('CLIENT_URLS from env:', process.env.CLIENT_URLS);
logger.info('Validated CLIENT_URLS:', CLIENT_URLS);

const app = express();

// Trust proxy for production deployments
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

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

app.get('/api/user/active-games', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const activeGames = rooms.getUserActiveGames(req.user!.id);
    res.json({ activeGames });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active games' });
    logger.error('Failed to fetch user active games', { error });
  }
});

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split('auth_token=')[1]?.split(';')[0];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.data.userId = decoded.userId;
      socket.data.discordId = decoded.discordId;
    } catch (error) {
      // Invalid token, continue as guest
    }
  }
  next();
});

io.on('connection', (socket) => {
  socket.on('room:create', (options: { isPrivate?: boolean; password?: string; config?: GameConfig }, ack?: Function) => ack?.(rooms.createRoom(options)));
  socket.on('room:join', ({ roomId, name, password }: { roomId: string; name: string; password?: string }, ack?: Function) => {
    const userId = socket.data.userId;
    rooms.joinRoom(socket, roomId, name, password, userId, ack);
  });
  socket.on('game:move', (payload: any) => rooms.handleMove(socket, payload));
  socket.on('game:save', (payload: { roomId: string; name: string }) => {
    const userId = socket.data.userId;
    rooms.saveGame(socket, { ...payload, userId });
  });
  socket.on('game:load', (payload: { gameId: string }, ack?: Function) => rooms.loadGame(socket, payload, ack));
  socket.on('disconnect', () => rooms.leaveAll(socket));
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => logger.info(`Server listening on ${HOST}:${PORT}`));
