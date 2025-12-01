import { io } from 'socket.io-client';

// Connect to the backend server
// In production, this URL should be configurable
export const socket = io('http://localhost:3001', {
    autoConnect: false,
});
