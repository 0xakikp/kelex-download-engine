import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { downloadManager } from '../services/download-manager.js';
import { searchPublicTorrents } from '../services/torrent-search.js';

const addSchema = z.object({
  magnet: z.string().min(1),
  filename: z.string().optional(),
});

export async function torrentRoutes(fastify: FastifyInstance) {
  fastify.post('/add', async (request, reply) => {
    const body = addSchema.parse(request.body);
    const download = downloadManager.create({
      url: body.magnet,
      type: 'magnet',
      filename: body.filename,
    });
    return reply.status(201).send(download);
  });

  fastify.get('/search', async (request) => {
    const { q } = request.query as { q: string };
    if (!q) return fastify.httpErrors.badRequest('Query required');
    const results = await searchPublicTorrents(q);
    return { results, query: q, total: results.length };
  });
}
