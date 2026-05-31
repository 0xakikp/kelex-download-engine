import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { downloadManager } from '../services/download-manager.js';

const createSchema = z.object({
  url: z.string().url(),
  filename: z.string().optional(),
  type: z.enum(['http', 'youtube', 'torrent', 'magnet', 'convert']).optional(),
  priority: z.enum(['highest', 'high', 'normal', 'low', 'lowest']).optional(),
  category: z.string().optional(),
  quality: z.string().optional(),
  format: z.string().optional(),
});

export async function downloadRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    return { downloads: downloadManager.getAll(), stats: downloadManager.getStats() };
  });

  fastify.get('/stats', async () => {
    return downloadManager.getStats();
  });

  fastify.get('/active', async () => {
    return { downloads: downloadManager.getActive() };
  });

  fastify.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const download = downloadManager.get(id);
    if (!download) return fastify.httpErrors.notFound('Download not found');
    return download;
  });

  fastify.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body);
    const download = downloadManager.create(body);
    return reply.status(201).send(download);
  });

  fastify.post('/:id/pause', async (request) => {
    const { id } = request.params as { id: string };
    const ok = downloadManager.pause(id);
    if (!ok) return fastify.httpErrors.badRequest('Cannot pause download');
    return { success: true };
  });

  fastify.post('/:id/resume', async (request) => {
    const { id } = request.params as { id: string };
    const ok = downloadManager.resume(id);
    if (!ok) return fastify.httpErrors.badRequest('Cannot resume download');
    return { success: true };
  });

  fastify.post('/:id/cancel', async (request) => {
    const { id } = request.params as { id: string };
    const ok = downloadManager.cancel(id);
    if (!ok) return fastify.httpErrors.notFound('Download not found');
    return { success: true };
  });

  fastify.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const ok = downloadManager.remove(id);
    if (!ok) return fastify.httpErrors.notFound('Download not found');
    return { success: true };
  });

  fastify.post('/:id/retry', async (request) => {
    const { id } = request.params as { id: string };
    const ok = downloadManager.retry(id);
    if (!ok) return fastify.httpErrors.notFound('Download not found');
    return { success: true };
  });
}
