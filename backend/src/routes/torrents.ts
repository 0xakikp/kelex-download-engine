import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { downloadManager } from '../services/download-manager.js';

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

    // Search via 1337x.to HTML scraping (no API key needed)
    try {
      const searchUrl = `https://1337x.to/search/${encodeURIComponent(q)}/1/`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      if (!res.ok) throw new Error(`1337x returned ${res.status}`);

      const html = await res.text();
      const results: any[] = [];

      // Parse torrent rows from 1337x HTML
      const rowRegex = /<tr>\s*<td class="coll-1 name">[\s\S]*?<a href="([^"]+)">([^<]+)<\/a>[\s\S]*?<td class="coll-2 seeds">(\d+)<\/td>\s*<td class="coll-3 leeches">(\d+)<\/td>[\s\S]*?<td class="coll-4 size">([^<]+)<\/td>/gi;
      let match;
      let count = 0;

      while ((match = rowRegex.exec(html)) !== null && count < 20) {
        const [, path, name, seeders, leechers, size] = match;
        results.push({
          id: `1337x_${count}`,
          name: name.trim(),
          magnet: null,
          detailUrl: `https://1337x.to${path}`,
          seeders: parseInt(seeders, 10),
          leechers: parseInt(leechers, 10),
          size: size.trim(),
          source: '1337x',
        });
        count++;
      }

      return { results, query: q, source: '1337x', total: results.length };
    } catch (err: any) {
      fastify.log.warn({ err: err.message }, 'Torrent search failed');
      return { results: [], query: q, source: 'none', error: 'Search temporarily unavailable. You can still paste magnet links directly.', total: 0 };
    }
  });
}
