import { io } from 'socket.io-client';

import { socketPath } from '../config.js';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io({
      path: socketPath,
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket() {
  const client = getSocket();
  if (!client.connected) {
    client.connect();
  }
  return client;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}
