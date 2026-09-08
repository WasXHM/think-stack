import { Server as SocketServer } from 'socket.io';

function socketCors(allowedOrigins) {
  const origins = String(allowedOrigins ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? { cors: { origin: origins } } : {};
}

export function createSocketServer(
  httpServer,
  { allowedOrigins = process.env.SOCKET_ALLOWED_ORIGINS } = {},
) {
  const io = new SocketServer(httpServer, {
    path: '/socket.io',
    serveClient: false,
    ...socketCors(allowedOrigins),
  });

  io.on('connection', (socket) => {
    socket.emit('server:ready', { connectedAt: new Date().toISOString() });

    socket.on('echo', (payload, acknowledge) => {
      const response = {
        payload: payload ?? null,
        receivedAt: new Date().toISOString(),
      };

      if (typeof acknowledge === 'function') {
        acknowledge(response);
      } else {
        socket.emit('echo', response);
      }
    });
  });

  return io;
}
