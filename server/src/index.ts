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
import { all } from 'axios';
import { getBadges, generateBadgeSvg } from '../../shared/src/badges';

/**
 * Validates if a hostname is allowed based on environment configuration
 * @param hostname - Hostname to validate
 * @returns True if hostname is allowed
 */
const isValidHostname = (hostname: string): boolean => {
  const allowedDomain = process.env.ALLOWED_DOMAIN || '.';
  return hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith(allowedDomain);
};

/**
 * Validates and filters client URLs based on protocol and hostname
 * @param urls - Array of client URLs to validate
 * @returns Filtered array of valid URLs
 */
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

/** Validated client URLs for CORS */
const CLIENT_URLS = validateClientUrls(process.env.CLIENT_URLS?.split(',') || ['http://localhost:5173']);
/** Production environment flag */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

console.log("Running in production mode:", IS_PRODUCTION)
console.log('*** Start up information ***');
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`ALLOWED_DOMAIN: ${process.env.ALLOWED_DOMAIN}`);
logger.info(`CLIENT_URLS from env: ${process.env.CLIENT_URLS}`);
logger.info('Validated CLIENT_URLS:', CLIENT_URLS);

/** Express application instance */
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

/** CSRF protection middleware */
const csrfProtection = csrf({
  cookie: true
});

app.use('/api/games', csrfProtection);
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

/** Rate limiter for authentication endpoints */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per window
  message: { error: 'Too many authentication attempts' },
  standardHeaders: true,
  legacyHeaders: false
});

/** General API rate limiter */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * GET /api/games - Lists all saved games
 * @route GET /api/games
 */
app.get('/api/games', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const games = await database.listGames();
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
    logger.error('Failed to fetch games', { error });
  }
});



/**
 * GET /api/stats/:userId - Gets player statistics
 * @route GET /api/stats/:userId
 */
app.get('/api/stats/:userId', async (req, res) => {
  try {
    const stats = await database.getPlayerStats(req.params.userId);
    res.json(stats || { userId: req.params.userId, gamesPlayed: 0, wins: 0, losses: 0, winRate: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
    logger.error('Failed to fetch stats', { error });
  }
});

/**
 * GET /api/replays - Lists all game replays
 * @route GET /api/replays
 */
app.get('/api/replays', async (_req, res) => {
  try {
    const replays = await database.listReplays();
    res.json(replays);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch replays' });
    logger.error('Failed to fetch replays', { error });
  }
});

/**
 * GET /api/replays/:id - Gets specific replay by ID
 * @route GET /api/replays/:id
 */
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

/**
 * GET /api/badge/status - Generates server status badge SVG
 * @route GET /api/badge/status
 */
app.get('/api/badge/status', (_req, res) => {
  const statusBadge = {
    label: 'Server',
    message: 'Online',
    color: '#4c1'
  };
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(generateBadgeSvg(statusBadge));
});

/**
 * GET /api/badge/client-status - Checks client status and generates badge
 * @route GET /api/badge/client-status
 */
app.get('/api/badge/client-status', async (_req, res) => {
  const clientUrl = CLIENT_URLS[0] || 'https://opensphinx.pages.dev';
  let statusBadge;
  try {
    const response = await fetch(clientUrl, { method: 'HEAD' });
    statusBadge = {
      label: 'Client',
      message: response.ok ? 'Online' : 'Offline',
      color: response.ok ? '#4c1' : '#e05d44'
    };
  } catch {
    statusBadge = { label: 'Client', message: 'Offline', color: '#e05d44' };
  }
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(generateBadgeSvg(statusBadge));
});

/**
 * DELETE /api/games/:id - Deletes a saved game
 * @route DELETE /api/games/:id
 */
app.delete('/api/games/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await database.deleteGame(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete game' });
    logger.error('Failed to delete game', { error });
  }
});

/** HTTP/HTTPS server instance */
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
/** Socket.IO server instance */
const io = new Server(server, {
  cors: {
    origin: CLIENT_URLS,
    credentials: true
  }
});

/** Rooms manager instance */
const rooms = createRoomsManager(io);

// Create a default room on startup with classic setup and khet 2.0 rules
rooms.createRoom({ config: { rules: 'KHET_2_0', setup: 'CLASSIC' } });

/**
 * GET /api/rooms - Lists all public rooms
 * @route GET /api/rooms
 */
app.get('/api/rooms', (_req, res) => {
  try {
    const roomList = rooms.listRooms();
    res.json(roomList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
    logger.error('Failed to fetch rooms', { error });
  }
});

/**
 * GET /api/user/active-games - Gets user's active games
 * @route GET /api/user/active-games
 */
app.get('/api/user/active-games', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const activeGames = rooms.getUserActiveGames(req.user!.id);
    res.json({ activeGames });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active games' });
    logger.error('Failed to fetch user active games', { error });
  }
});

/**
 * Socket.IO authentication middleware
 * Extracts JWT token and sets user data on socket
 */
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

/**
 * Socket.IO connection handler
 * Sets up event listeners for game actions
 */
io.on('connection', (socket) => {
  socket.on('room:create',
    (options: { isPrivate?: boolean; password?: string; config?: GameConfig }, ack?: Function) =>
      ack?.(rooms.createRoom(options)));
  socket.on('room:join', ({ roomId, name, password }: {
    roomId: string; name: string; password?: string
  }, ack?: Function) => {
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

/** Server port from environment or default */
const PORT = Number(process.env.PORT) || 3001;
/** Server host from environment or default */
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => logger.info(`Server listening on ${HOST}:${PORT}`));
