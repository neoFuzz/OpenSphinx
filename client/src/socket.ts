
import { io } from 'socket.io-client';
const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
console.log('Attempting to connect to server:', serverUrl);
export const socket = io(serverUrl, {
  withCredentials: true,
  transports: ['websocket']
});
socket.on('connect', () => console.log('Connected to server:', serverUrl));
