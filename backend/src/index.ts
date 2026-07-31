import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import websocket from '@fastify/websocket';
import sensible from '@fastify/sensible';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { downloadRoutes } from './routes/downloads.js';
import { youtubeRoutes } from './routes/youtube.js';
import { torrentRoutes } from './routes/torrents.js';
import { convertRoutes } from './routes/converter.js';
import { systemRoutes } from './routes/system.js';
import { fileRoutes } from './routes/files.js';
import { wsHandler } from './websocket/progress.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '127.0.0.1';

const app = Fastify({
  logger: true,
  trustProxy: true,
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(sensible);
await app.register(websocket);

await app.register(staticPlugin, {
  root: join(__dirname, '../public'),
  prefix: '/app',
});

// WebSocket for real-time progress
await app.register(async function (fastify) {
  fastify.get('/ws/progress', { websocket: true }, wsHandler);
});

// API routes
await app.register(downloadRoutes, { prefix: '/api/v1/downloads' });
await app.register(youtubeRoutes, { prefix: '/api/v1/youtube' });
await app.register(torrentRoutes, { prefix: '/api/v1/torrents' });
await app.register(convertRoutes, { prefix: '/api/v1/convert' });
await app.register(systemRoutes, { prefix: '/api/v1' });
await app.register(fileRoutes, { prefix: '/api/v1/files' });

// Health check
app.get('/health', async () => ({ status: 'ok', version: '2.0.0' }));
app.get('/api/v1/health', async () => ({ status: 'ok', version: '2.0.0' }));

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`🚀 Kelex Backend running on http://${HOST}:${PORT}`);
} catch (err: any) {
  if (err.code === 'EPERM' || err.code === 'EADDRINUSE') {
    try {
      await app.listen({ port: PORT, host: '127.0.0.1' });
      console.log(`🚀 Kelex Backend running on http://127.0.0.1:${PORT}`);
    } catch (err2) {
      const fallbackPort = PORT + 1;
      await app.listen({ port: fallbackPort, host: '127.0.0.1' });
      console.log(`🚀 Kelex Backend running on http://127.0.0.1:${fallbackPort}`);
    }
  } else {
    app.log.error(err);
    process.exit(1);
  }
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => {
    app.log.info(`${signal} received, shutting down gracefully...`);
    try {
      await app.close();
    } catch (err) {
      app.log.error(err);
    }
    process.exit(0);
  });
});
