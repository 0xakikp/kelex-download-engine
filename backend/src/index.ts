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
import { wsHandler } from './websocket/progress.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = Fastify({
  logger: true,
  trustProxy: true,
});

await app.register(cors, {
  origin: NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:5173'] : true,
  credentials: true,
});

await app.register(sensible);
await app.register(websocket);

// Serve static frontend in production
if (NODE_ENV === 'production') {
  await app.register(staticPlugin, {
    root: join(__dirname, '../../dist'),
    prefix: '/',
  });
  app.setNotFoundHandler(async (_request, reply) => {
    return reply.sendFile('index.html');
  });
}

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

// Health check
app.get('/health', async () => ({ status: 'ok', version: '2.0.0' }));

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`🚀 Kelex Backend running on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
