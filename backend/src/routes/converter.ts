import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { downloadManager } from '../services/download-manager.js';
import { broadcastProgress } from '../websocket/progress.js';
import type { Download } from '../models/download.js';

const convertSchema = z.object({
  inputPath: z.string(),
  outputFormat: z.string(),
  quality: z.string().optional(),
  videoCodec: z.string().optional(),
  audioCodec: z.string().optional(),
  resolution: z.string().optional(),
});

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || '/opt/kelex-downloads';

export async function convertRoutes(fastify: FastifyInstance) {
  fastify.post('/', async (request, reply) => {
    const body = convertSchema.parse(request.body);
    const id = uuidv4();
    const outName = basename(body.inputPath, extname(body.inputPath)) + '.' + body.outputFormat;
    const outputPath = join(DOWNLOAD_DIR, 'converted', outName);
    await mkdir(join(DOWNLOAD_DIR, 'converted'), { recursive: true });

    const download: Download = {
      id,
      filename: outName,
      url: body.inputPath,
      type: 'convert',
      status: 'converting',
      progress: 0,
      size: 0,
      downloaded: 0,
      speed: 0,
      speedHistory: Array(60).fill(0),
      connections: 1,
      eta: 'Converting...',
      createdAt: new Date().toISOString(),
      priority: 'normal',
      category: 'Conversion',
      format: body.outputFormat,
      outputPath,
    };

    downloadManager.create({
      url: body.inputPath,
      type: 'convert',
      filename: outName,
    });

    const args = ['-i', body.inputPath];
    if (body.resolution) args.push('-vf', `scale=${body.resolution}`);
    if (body.videoCodec) args.push('-c:v', body.videoCodec);
    if (body.audioCodec) args.push('-c:a', body.audioCodec);
    if (body.quality) {
      const crf = body.quality === 'high' ? '18' : body.quality === 'medium' ? '23' : '28';
      args.push('-crf', crf);
    }
    args.push('-progress', 'pipe:1', '-y', outputPath);

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout?.on('data', (data) => {
      const line = data.toString();
      const timeMatch = line.match(/out_time_us=(\d+)/);
      const progressMatch = line.match(/progress=(\w+)/);
      if (timeMatch) {
        const timeUs = parseInt(timeMatch[1], 10);
        download.progress = Math.min(99, (timeUs / 1_000_000 / 60) * 100);
        broadcastProgress(download);
      }
      if (progressMatch && progressMatch[1] === 'end') {
        download.status = 'completed';
        download.progress = 100;
        download.completedAt = new Date().toISOString();
        broadcastProgress(download);
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        download.status = 'completed';
        download.progress = 100;
        download.completedAt = new Date().toISOString();
      } else {
        download.status = 'error';
        download.error = `ffmpeg exited with code ${code}`;
      }
      broadcastProgress(download);
    });

    return reply.status(201).send(download);
  });
}
