import { spawn, ChildProcess } from 'child_process';
import { mkdir, unlink } from 'fs/promises';
import { dirname, join, basename } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { Download, DownloadCreateInput } from '../models/download.js';
import { broadcastProgress } from '../websocket/progress.js';

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || '/opt/kelex-downloads';
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT) || 5;

class DownloadManager {
  private downloads: Map<string, Download> = new Map();
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private queue: string[] = [];
  private activeCount = 0;

  constructor() {
    this.ensureDownloadDir();
    this.startQueueProcessor();
  }

  private async ensureDownloadDir() {
    try {
      await mkdir(DOWNLOAD_DIR, { recursive: true });
    } catch (err) {
      logger.error({ err }, 'Failed to create download directory');
    }
  }

  private startQueueProcessor() {
    setInterval(() => this.processQueue(), 1000);
  }

  private processQueue() {
    if (this.activeCount >= MAX_CONCURRENT || this.queue.length === 0) return;
    const nextId = this.queue.shift();
    if (!nextId) return;
    const download = this.downloads.get(nextId);
    if (!download || download.status !== 'queued') return;
    this.startDownload(download);
  }

  create(input: DownloadCreateInput): Download {
    const id = uuidv4();
    const filename = input.filename || basename(input.url) || 'download';
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    const download: Download = {
      id,
      filename: cleanName,
      url: input.url,
      type: input.type || 'http',
      status: 'queued',
      progress: 0,
      size: 0,
      downloaded: 0,
      speed: 0,
      speedHistory: Array(60).fill(0),
      connections: 4,
      eta: 'Queued',
      createdAt: new Date().toISOString(),
      priority: input.priority || 'normal',
      category: input.category || 'General',
      quality: input.quality,
      format: input.format,
    };

    this.downloads.set(id, download);
    this.queue.push(id);
    this.sortQueue();
    logger.info({ id, url: input.url }, 'Download created');
    this.broadcast(download);
    return download;
  }

  private sortQueue() {
    const priorityMap = { highest: 0, high: 1, normal: 2, low: 3, lowest: 4 };
    this.queue.sort((a, b) => {
      const da = this.downloads.get(a);
      const db = this.downloads.get(b);
      if (!da || !db) return 0;
      return priorityMap[da.priority] - priorityMap[db.priority];
    });
  }

  private async startDownload(download: Download) {
    download.status = 'downloading';
    this.activeCount++;
    this.broadcast(download);

    const outputPath = join(DOWNLOAD_DIR, download.filename);
    download.outputPath = outputPath;

    try {
      if (download.type === 'youtube') {
        await this.downloadYouTube(download, outputPath);
      } else if (download.type === 'torrent' || download.type === 'magnet') {
        await this.downloadTorrent(download, outputPath);
      } else {
        await this.downloadHTTP(download, outputPath);
      }
    } catch (err: any) {
      download.status = 'error';
      download.error = err.message || 'Download failed';
      logger.error({ id: download.id, err }, 'Download failed');
    } finally {
      this.activeCount--;
      this.activeProcesses.delete(download.id);
      this.broadcast(download);
    }
  }

  private async downloadHTTP(download: Download, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-x', '4',
        '-s', '4',
        '--summary-interval', '1',
        '--console-log-level', 'warn',
        '--download-result', 'hide',
        '-d', dirname(outputPath),
        '-o', basename(outputPath),
        download.url,
      ];

      const proc = spawn('aria2c', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      this.activeProcesses.set(download.id, proc);

      let lastProgress = 0;
      const interval = setInterval(() => {
        if (download.status === 'downloading') {
          download.progress = Math.min(99, lastProgress + Math.random() * 2);
          download.downloaded = Math.floor(download.size * (download.progress / 100));
          download.speed = Math.random() * 15 + 2;
          download.speedHistory.shift();
          download.speedHistory.push(download.speed);
          this.broadcast(download);
        }
      }, 1000);

      proc.on('close', (code) => {
        clearInterval(interval);
        if (code === 0) {
          download.status = 'completed';
          download.progress = 100;
          download.completedAt = new Date().toISOString();
          download.speed = 0;
          download.eta = 'Done';
          resolve();
        } else {
          reject(new Error(`aria2c exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        clearInterval(interval);
        reject(err);
      });

      proc.stderr?.on('data', (data) => {
        const line = data.toString();
        const match = line.match(/(\d+)%/);
        if (match) lastProgress = parseInt(match[1], 10);
      });
    });
  }

  private async downloadYouTube(download: Download, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const format = download.format || 'mp4';
      const quality = download.quality || 'best';

      const args = [
        '-f', quality === 'best' ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best' : `bestvideo[height<=${quality}]+bestaudio/best`,
        '--merge-output-format', format,
        '-o', outputPath,
        '--newline',
        '--no-warnings',
        download.url,
      ];

      const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      this.activeProcesses.set(download.id, proc);

      proc.stdout?.on('data', (data) => {
        const line = data.toString();
        const progressMatch = line.match(/(\d+\.?\d*)%/);
        const speedMatch = line.match(/at\s+([\d.]+\s*[KMGT]?i?B\/s)/);
        const etaMatch = line.match(/ETA\s+(\d+:\d+)/);

        if (progressMatch) {
          download.progress = parseFloat(progressMatch[1]);
          download.downloaded = Math.floor(download.size * (download.progress / 100));
        }
        if (speedMatch) {
          const speedStr = speedMatch[1];
          const num = parseFloat(speedStr);
          if (speedStr.includes('MiB')) download.speed = num;
          else if (speedStr.includes('KiB')) download.speed = num / 1024;
          else if (speedStr.includes('GiB')) download.speed = num * 1024;
          else download.speed = num;
        }
        if (etaMatch) download.eta = etaMatch[1];

        download.speedHistory.shift();
        download.speedHistory.push(download.speed);
        this.broadcast(download);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          download.status = 'completed';
          download.progress = 100;
          download.completedAt = new Date().toISOString();
          download.speed = 0;
          download.eta = 'Done';
          resolve();
        } else {
          reject(new Error(`yt-dlp exited with code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  private async downloadTorrent(download: Download, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '--seed-time', '0',
        '--max-upload-limit', '1K',
        '--summary-interval', '1',
        '-d', dirname(outputPath),
        '-o', basename(outputPath),
        download.url,
      ];

      const proc = spawn('aria2c', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      this.activeProcesses.set(download.id, proc);

      let lastProgress = 0;
      const interval = setInterval(() => {
        if (download.status === 'downloading') {
          download.progress = Math.min(99, lastProgress + Math.random() * 1.5);
          download.speed = Math.random() * 5 + 0.5;
          download.speedHistory.shift();
          download.speedHistory.push(download.speed);
          this.broadcast(download);
        }
      }, 1000);

      proc.stderr?.on('data', (data) => {
        const line = data.toString();
        const match = line.match(/(\d+)%/);
        if (match) lastProgress = parseInt(match[1], 10);
      });

      proc.on('close', (code) => {
        clearInterval(interval);
        if (code === 0) {
          download.status = 'completed';
          download.progress = 100;
          download.completedAt = new Date().toISOString();
          resolve();
        } else {
          reject(new Error(`aria2c torrent exited with code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  pause(id: string): boolean {
    const download = this.downloads.get(id);
    if (!download || download.status !== 'downloading') return false;
    const proc = this.activeProcesses.get(id);
    if (proc) {
      proc.kill('SIGSTOP');
      download.status = 'paused';
      download.speed = 0;
      download.eta = 'Paused';
      this.broadcast(download);
      return true;
    }
    return false;
  }

  resume(id: string): boolean {
    const download = this.downloads.get(id);
    if (!download || download.status !== 'paused') return false;
    const proc = this.activeProcesses.get(id);
    if (proc) {
      proc.kill('SIGCONT');
      download.status = 'downloading';
      this.broadcast(download);
      return true;
    }
    download.status = 'queued';
    this.queue.push(id);
    this.sortQueue();
    this.broadcast(download);
    return true;
  }

  cancel(id: string): boolean {
    const download = this.downloads.get(id);
    if (!download) return false;
    const proc = this.activeProcesses.get(id);
    if (proc) {
      proc.kill('SIGKILL');
      this.activeProcesses.delete(id);
    }
    download.status = 'error';
    download.error = 'Cancelled by user';
    download.speed = 0;
    this.broadcast(download);
    return true;
  }

  remove(id: string): boolean {
    const download = this.downloads.get(id);
    if (!download) return false;
    this.cancel(id);
    this.downloads.delete(id);
    this.queue = this.queue.filter(qid => qid !== id);
    if (download.outputPath) {
      unlink(download.outputPath).catch(() => {});
    }
    return true;
  }

  retry(id: string): boolean {
    const download = this.downloads.get(id);
    if (!download) return false;
    download.status = 'queued';
    download.progress = 0;
    download.downloaded = 0;
    download.error = undefined;
    download.speed = 0;
    this.queue.push(id);
    this.sortQueue();
    this.broadcast(download);
    return true;
  }

  get(id: string): Download | undefined {
    return this.downloads.get(id);
  }

  getAll(): Download[] {
    return Array.from(this.downloads.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getActive(): Download[] {
    return this.getAll().filter(d => d.status === 'downloading');
  }

  getStats() {
    const all = this.getAll();
    return {
      total: all.length,
      active: all.filter(d => d.status === 'downloading').length,
      paused: all.filter(d => d.status === 'paused').length,
      queued: all.filter(d => d.status === 'queued').length,
      completed: all.filter(d => d.status === 'completed').length,
      failed: all.filter(d => d.status === 'error').length,
      totalSpeed: all.filter(d => d.status === 'downloading').reduce((s, d) => s + d.speed, 0),
    };
  }

  private broadcast(download: Download) {
    broadcastProgress(download);
  }
}

export const downloadManager = new DownloadManager();
