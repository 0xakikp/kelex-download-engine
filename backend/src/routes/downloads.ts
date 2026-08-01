import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { downloadManager } from '../services/download-manager.js';
import { convertMedia } from '../services/converter.js';

const createSchema = z.object({
  url: z.string(),
  filename: z.string().optional(),
  type: z.enum(['http', 'youtube', 'torrent', 'magnet', 'convert']).optional(),
  priority: z.enum(['highest', 'high', 'normal', 'low', 'lowest']).optional(),
  category: z.string().optional(),
  quality: z.string().optional(),
  format: z.string().optional(),
  cookiesFromBrowser: z.string().optional(),
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
    
    // Split input URL string by newlines or spaces to support batch downloads
    const urls = body.url.split(/[\r\n\s]+/).map(u => u.trim()).filter(u => {
      if (u.startsWith('magnet:')) return true;
      try {
        new URL(u);
        return true;
      } catch {
        return false;
      }
    });

    if (urls.length === 0) {
      return reply.status(400).send({ error: 'No valid URLs provided' });
    }

    if (urls.length === 1) {
      const download = downloadManager.create({ ...body, url: urls[0] });
      return reply.status(201).send(download);
    }

    // Batch creation
    const created = urls.map(url => downloadManager.create({ ...body, url }));
    return reply.status(201).send({ success: true, count: created.length, downloads: created });
  });

  fastify.post('/pause-all', async () => {
    downloadManager.pauseAll();
    return { success: true };
  });

  fastify.post('/resume-all', async () => {
    downloadManager.resumeAll();
    return { success: true };
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
    if (!ok) return fastify.httpErrors.badRequest('Cannot retry download');
    return { success: true };
  });

  fastify.post('/:id/convert', async (request) => {
    const { id } = request.params as { id: string };
    const { format = 'mp3' } = (request.body || {}) as { format?: string };
    const download = downloadManager.get(id);
    if (!download || !download.outputPath) {
      return fastify.httpErrors.notFound('Completed download file not found');
    }
    const result = await convertMedia(download.outputPath, format);
    return result;
  });
}
