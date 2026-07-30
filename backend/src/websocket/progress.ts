import type { WebSocket } from 'ws';
import type { FastifyRequest } from 'fastify';
import type { Download } from '../models/download.js';

interface WSConnection {
  socket: WebSocket;
}

const clients: Set<WSConnection> = new Set();

export function wsHandler(socket: WebSocket, _request: FastifyRequest) {
  const client: WSConnection = { socket };
  clients.add(client);
  socket.onclose = () => clients.delete(client);
  socket.onerror = () => clients.delete(client);
}

export function broadcastProgress(download: Download) {
  const message = JSON.stringify({
    type: 'download.progress',
    data: download,
  });

  for (const client of Array.from(clients)) {
    if (client.socket.readyState === 1) {
      client.socket.send(message);
    }
  }
}

export function broadcastStats(stats: Record<string, unknown>) {
  const message = JSON.stringify({
    type: 'stats.update',
    data: stats,
  });

  for (const client of Array.from(clients)) {
    if (client.socket.readyState === 1) {
      client.socket.send(message);
    }
  }
}
