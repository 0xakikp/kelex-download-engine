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
