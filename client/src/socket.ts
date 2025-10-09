/**
 * Socket.IO client configuration for real-time communication
 * 
 * Establishes WebSocket connection to the game server with:
 * - Credential support for authentication
 * - WebSocket-only transport for optimal performance
 * - Connection logging for debugging
 */

import { io } from 'socket.io-client';
import { SERVER_URL } from './config/server';

console.log('Attempting to connect to server:', SERVER_URL);

/**
 * Socket.IO client instance for real-time game communication
 * 
 * Configured with credentials and WebSocket transport for:
 * - Room management (create, join, leave)
 * - Game state synchronization
 * - Move transmission
 * - Save/load operations
 */
export const socket = io(SERVER_URL, {
  withCredentials: true,
  transports: ['websocket']
});

/** Log successful connection to server */
socket.on('connect', () => console.log('Connected to server:', SERVER_URL));
