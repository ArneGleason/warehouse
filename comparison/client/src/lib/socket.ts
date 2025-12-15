import { io } from 'socket.io-client';

// Connect to the backend server
// In production, this URL should be configurable
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3011';
export const socket = io(SERVER_URL, {
    autoConnect: false,
});
