import { io } from 'socket.io-client';
import { SERVER_URL } from './config/server';

console.log('Attempting to connect to server:', SERVER_URL);
export const socket = io(SERVER_URL, {
  withCredentials: true,
  transports: ['websocket']
});
socket.on('connect', () => console.log('Connected to server:', SERVER_URL));
