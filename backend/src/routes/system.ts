import type { FastifyInstance } from 'fastify';
import { execSync } from 'child_process';
import { statfs } from 'fs/promises';
import os from 'os';

export async function systemRoutes(fastify: FastifyInstance) {
  fastify.get('/system/info', async () => {
    const totalMem = execSync('free -m | awk \'/Mem:/ {print $2}\'').toString().trim();
    const usedMem = execSync('free -m | awk \'/Mem:/ {print $3}\'').toString().trim();
    const loadAvg = execSync('cat /proc/loadavg').toString().trim().split(' ')[0];
    const uptime = execSync('cat /proc/uptime').toString().trim().split(' ')[0];
    const disk = await statfs('/opt/kelex-downloads').catch(() => null);

    return {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: Math.floor(parseFloat(uptime)),
      memory: {
        total: parseInt(totalMem, 10),
        used: parseInt(usedMem, 10),
        free: parseInt(totalMem, 10) - parseInt(usedMem, 10),
      },
      cpu: {
        loadAverage: parseFloat(loadAvg),
        count: os.cpus().length,
      },
      disk: disk ? {
        total: disk.bsize * disk.blocks,
        free: disk.bsize * disk.bfree,
        used: disk.bsize * (disk.blocks - disk.bfree),
      } : null,
    };
  });

  fastify.get('/system/health', async () => {
    const checks = {
      aria2c: false,
      ytDlp: false,
      ffmpeg: false,
    };

    try {
      execSync('which aria2c');
      checks.aria2c = true;
    } catch { /* no-op */ }

    try {
      execSync('which yt-dlp');
      checks.ytDlp = true;
    } catch { /* no-op */ }

    try {
      execSync('which ffmpeg');
      checks.ffmpeg = true;
    } catch { /* no-op */ }

    return { status: 'ok', tools: checks };
  });
}
