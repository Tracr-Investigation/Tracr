import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let socket: Socket | null = null;

export function connectSocket(): Socket {
    const token = localStorage.getItem('token');

    if (socket?.connected) {
        return socket;
    }

    socket = io(API_URL, {
        path: '/socket.io',
        auth: { token },
        transports: ['polling', 'websocket'],
    });

    return socket;
}

export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function getSocket(): Socket | null {
    return socket;
}
