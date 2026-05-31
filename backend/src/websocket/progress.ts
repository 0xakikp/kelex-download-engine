import type { Download } from '../models/download.js';

interface WSConnection {
  socket: WebSocket;
}

const clients: Set<WSConnection> = new Set();

export function wsHandler(connection: WSConnection) {
  clients.add(connection);
  connection.socket.onclose = () => clients.delete(connection);
  connection.socket.onerror = () => clients.delete(connection);
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
