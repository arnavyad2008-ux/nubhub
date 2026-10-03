import { io, Socket } from 'socket.io-client';

// Use same host or port 3001
const SOCKET_URL = window.location.port === '5173' ? 'http://localhost:3001' : '/';

export const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('[NubHub Real-Time] Connected to WebSocket event gateway:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[NubHub Real-Time] Disconnected from event gateway');
});
