import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { database } from './database';

/** JWT secret key from environment variables */
const JWT_SECRET = process.env.JWT_SECRET!;

/** Extended Express Request interface with optional user information */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    discordId: string;
    username: string;
    avatarUrl?: string;
  };
}

/**
 * Middleware that requires valid JWT authentication
 * Verifies JWT token from cookies and attaches user to request
 * @param req - Express request object with potential user data
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await database.getUserByDiscordId(decoded.discordId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware that optionally authenticates users
 * Attaches user to request if valid token exists, but continues without error if not
 * @param req - Express request object with potential user data
 * @param res - Express response object
 * @param next - Express next function
 */
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.auth_token;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await database.getUserByDiscordId(decoded.discordId);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Ignore invalid tokens for optional auth
    }
  }

  next();
};