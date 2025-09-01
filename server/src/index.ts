
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createRoomsManager } from './rooms';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

const rooms = createRoomsManager(io);

io.on('connection', (socket) => {
  socket.on('room:create', (_: unknown, ack?: Function) => ack?.(rooms.createRoom()));
  socket.on('room:join', ({ roomId, name }: { roomId: string; name: string }, ack?: Function) => rooms.joinRoom(socket, roomId, name, ack));
  socket.on('game:move', (payload: any) => rooms.handleMove(socket, payload));
  socket.on('disconnect', () => rooms.leaveAll(socket));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
