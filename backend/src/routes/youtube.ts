import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { spawn } from 'child_process';
import { downloadManager } from '../services/download-manager.js';

const downloadSchema = z.object({
  url: z.string().url(),
  quality: z.string().optional(),
  format: z.string().optional(),
});

export async function youtubeRoutes(fastify: FastifyInstance) {
  // Get info for a specific URL
  fastify.get('/info', async (request) => {
    const { url } = request.query as { url: string };
    if (!url) return fastify.httpErrors.badRequest('URL required');

    return new Promise((resolve, reject) => {
      const proc = spawn('yt-dlp', [
        '--dump-json',
        '--no-download',
        '--no-warnings',
        url,
      ], { stdio: ['ignore', 'pipe', 'pipe'] });

      let output = '';
      proc.stdout?.on('data', (d) => { output += d; });
      proc.on('close', (code) => {
        if (code !== 0) {
          reject(fastify.httpErrors.badRequest('Failed to fetch video info'));
          return;
        }
        try {
          const info = JSON.parse(output);
          resolve({
            id: info.id,
            title: info.title,
            uploader: info.uploader,
            duration: info.duration,
            thumbnail: info.thumbnail,
            formats: info.formats?.map((f: any) => ({
              formatId: f.format_id,
              ext: f.ext,
              resolution: f.resolution,
              fps: f.fps,
              filesize: f.filesize,
              vcodec: f.vcodec,
              acodec: f.acodec,
            })),
          });
        } catch {
          reject(fastify.httpErrors.internalServerError('Failed to parse video info'));
        }
      });
    });
  });

  // Search YouTube by query text
  fastify.get('/search', async (request) => {
    const { q } = request.query as { q: string };
    if (!q) return fastify.httpErrors.badRequest('Query required');

    return new Promise((resolve, reject) => {
      const proc = spawn('yt-dlp', [
        '--dump-json',
        '--no-download',
        '--no-warnings',
        '--playlist-items', '10',
        '--extractor-args', 'youtube:player_client=web',
        `ytsearch10:${q}`,
      ], { stdio: ['ignore', 'pipe', 'pipe'] });

      let output = '';
      let stderr = '';
      proc.stdout?.on('data', (d) => { output += d; });
      proc.stderr?.on('data', (d) => { stderr += d; });

      proc.on('close', (code) => {
        if (code !== 0) {
          // If yt-dlp failed, return empty results with the error so frontend can handle gracefully
          fastify.log.warn({ err: stderr.trim() }, 'YouTube search failed');
          resolve({ results: [], query: q, total: 0, error: 'YouTube search requires authentication. Use the URL tab to paste a direct YouTube link.' });
          return;
        }
        try {
          const lines = output.trim().split('\n').filter(Boolean);
          const results = lines.map((line) => {
            const info = JSON.parse(line);
            return {
              id: info.id,
              title: info.title,
              uploader: info.uploader,
              duration: info.duration,
              thumbnail: info.thumbnail,
              viewCount: info.view_count,
              url: `https://www.youtube.com/watch?v=${info.id}`,
            };
          });
          resolve({ results, query: q, total: results.length });
        } catch {
          reject(fastify.httpErrors.internalServerError('Failed to parse search results'));
        }
      });
    });
  });

  fastify.post('/download', async (request, reply) => {
    const body = downloadSchema.parse(request.body);
    const download = downloadManager.create({
      url: body.url,
      type: 'youtube',
      quality: body.quality,
      format: body.format,
    });
    return reply.status(201).send(download);
  });
}
