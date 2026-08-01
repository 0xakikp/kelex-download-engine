import { spawn, ChildProcess } from 'child_process';
import { createWriteStream } from 'fs';
import { mkdir, unlink, access, readdir, readFile, writeFile, rename } from 'fs/promises';
import { dirname, join, basename, extname } from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { Download, DownloadCreateInput } from '../models/download.js';
import { broadcastProgress } from '../websocket/progress.js';
import { resolveBinary } from '../utils/dependencies.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || join(os.homedir(), 'kelex-downloads');
const DOWNLOAD_DIR = DEFAULT_DOWNLOAD_DIR;
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT) || 5;
const STATE_DIR = join(DOWNLOAD_DIR, '.kelex');
const STATE_FILE = join(STATE_DIR, 'state.json');

import { execSync } from 'child_process';

function getCategoryFolder(filename: string, type: string, category?: string): string {
  if (category && category !== 'General') return category;
  const ext = extname(filename).toLowerCase();

  if (type === 'torrent' || type === 'magnet' || ext === '.torrent') return 'Torrents';
  if (type === 'youtube' || ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv', '.m4v'].includes(ext)) return 'Videos';
  if (['.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg', '.opus'].includes(ext)) return 'Audio';
  if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar', '.7z', '.gz', '.iso', '.dmg'].includes(ext)) return 'Documents';

  return 'General';
}

async function tryExtractArchive(outputPath: string): Promise<string | null> {
  const ext = extname(outputPath).toLowerCase();
  if (ext !== '.zip' && ext !== '.gz' && ext !== '.tar.gz') return null;

  try {
    const dir = dirname(outputPath);
    const base = basename(outputPath, ext);
    const extractDir = join(dir, `${base}_extracted`);
    await mkdir(extractDir, { recursive: true });

    if (ext === '.zip') {
      execSync(`unzip -q ${JSON.stringify(outputPath)} -d ${JSON.stringify(extractDir)}`);
      logger.info({ outputPath, extractDir }, 'Auto-extracted zip archive');
      return extractDir;
    } else if (ext === '.gz' || ext === '.tar.gz') {
      execSync(`tar -xzf ${JSON.stringify(outputPath)} -C ${JSON.stringify(extractDir)}`);
      logger.info({ outputPath, extractDir }, 'Auto-extracted tar.gz archive');
      return extractDir;
    }
  } catch (err: any) {
    logger.warn({ outputPath, err: err.message }, 'Auto-extraction skipped or extractor tool unavailable');
  }

  return null;
}

class DownloadManager {
  private downloads: Map<string, Download> = new Map();
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private queue: string[] = [];
  private activeCount = 0;
  private loaded = false;
  private dirty = false;
  private speedLimitBps = 0; // 0 = unlimited

  constructor() {
    this.ensureDownloadDir();
    this.loadState();
    this.startQueueProcessor();
    this.startNetworkRecoveryWatcher();
    setInterval(() => this.flushState(), 1000);
  }

  private isOnline = true;

  private startNetworkRecoveryWatcher() {
    setInterval(async () => {
      try {
        const res = await fetch('https://1.1.1.1', { method: 'HEAD' });
        if (res.ok && !this.isOnline) {
          this.isOnline = true;
          logger.info('Network connection restored. Auto-resuming interrupted downloads...');
          this.resumeAllInterrupted();
        }
      } catch {
        if (this.isOnline) {
          this.isOnline = false;
          logger.warn('Network connection lost. Waiting for auto-recovery...');
        }
      }
    }, 5000);
  }

  private resumeAllInterrupted() {
    for (const d of this.downloads.values()) {
      if (d.status === 'paused' || (d.status === 'error' && d.error?.includes('fetch failed'))) {
        this.resume(d.id);
      }
    }
  }

  private async loadState() {
    try {
      const raw = await readFile(STATE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.downloads && Array.isArray(parsed.downloads)) {
        for (const d of parsed.downloads) {
          // Downloads that were active when the app crashed are recoverable,
          // so mark them paused so the user can resume them.
          if (d.status === 'downloading' || d.status === 'converting') {
            d.status = 'paused';
            d.speed = 0;
            d.eta = 'Paused';
          }
          if (d.status === 'queued') {
            this.queue.push(d.id);
          }
          this.downloads.set(d.id, d);
        }
        this.sortQueue();
        logger.info({ count: this.downloads.size }, 'Loaded persisted download state');
      }
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        logger.error({ err }, 'Failed to load download state');
      }
    } finally {
      this.loaded = true;
    }
  }

  private saveState() {
    this.dirty = true;
  }

  private async flushState() {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      await mkdir(STATE_DIR, { recursive: true });
      const tmp = `${STATE_FILE}.tmp`;
      const data = { downloads: this.getAll(), updatedAt: new Date().toISOString() };
      await writeFile(tmp, JSON.stringify(data, null, 2));
      await rename(tmp, STATE_FILE);
    } catch (err) {
      logger.error({ err }, 'Failed to save download state');
    }
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
    if (!this.loaded || this.activeCount >= MAX_CONCURRENT || this.queue.length === 0) return;
    const nextId = this.queue.shift();
    if (!nextId) return;
    const download = this.downloads.get(nextId);
    if (!download || download.status !== 'queued') return;
    this.startDownload(download);
  }

  create(input: DownloadCreateInput): Download {
    const id = uuidv4();
    let filename = input.filename || basename(input.url) || 'download';
    // For YouTube, use a safe default name if URL basename is just "watch" or empty
    if (input.type === 'youtube' && (!filename || filename === 'watch' || filename === 'watch_v')) {
      filename = 'youtube_video_' + id.slice(0, 8);
    }
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
      cookiesFromBrowser: input.cookiesFromBrowser || process.env.KELEX_DEFAULT_BROWSER,
    };

    this.downloads.set(id, download);
    this.queue.push(id);
    this.sortQueue();
    logger.info({ id, url: input.url }, 'Download created');
    this.broadcast(download);
    this.saveState();
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

    const categoryFolder = getCategoryFolder(download.filename, download.type, download.category);
    const categoryDir = join(DOWNLOAD_DIR, categoryFolder);
    await mkdir(categoryDir, { recursive: true });

    const outputPath = join(categoryDir, download.filename);
    download.outputPath = outputPath;
    download.category = categoryFolder;
    this.broadcast(download);

    try {
      if (download.type === 'youtube') {
        await this.downloadYouTube(download, outputPath);
      } else if (download.type === 'torrent' || download.type === 'magnet') {
        await this.downloadTorrent(download, outputPath);
      } else {
        await this.downloadHTTP(download, outputPath);
      }
      if ((download as any).status === 'completed' && download.outputPath) {
        await tryExtractArchive(download.outputPath);
      }
    } catch (err: any) {
      download.retries = (download.retries || 0) + 1;
      if (download.retries <= 3) {
        logger.warn({ id: download.id, err: err.message, retry: download.retries }, 'Download failed, auto-retrying');
        download.status = 'queued';
        download.error = `Failed (retrying ${download.retries}/3): ${err.message}`;
        this.queue.push(download.id);
        setTimeout(() => this.processQueue(), 5000); // Wait 5s before processing queue again
      } else {
        download.status = 'error';
        download.error = err.message || 'Download failed';
        logger.error({ id: download.id, err }, 'Download failed after max retries');
      }
    } finally {
      this.activeCount--;
      this.activeProcesses.delete(download.id);
      this.broadcast(download);
    }
  }

  setSpeedLimit(limitStr: string): { limitBps: number; message: string } {
    if (!limitStr || limitStr === '0' || limitStr === 'off' || limitStr === 'unlimited') {
      this.speedLimitBps = 0;
      return { limitBps: 0, message: 'Speed limit disabled (unlimited bandwidth)' };
    }
    const match = limitStr.match(/^(\d+(?:\.\d+)?)\s*([kKmMgG])?[bB]?$/);
    if (!match) {
      throw new Error('Invalid speed limit format. Use e.g. 5M, 500K, or off');
    }
    const num = parseFloat(match[1]);
    const unit = (match[2] || 'M').toUpperCase();
    let bps = num;
    if (unit === 'K') bps = num * 1024;
    else if (unit === 'M') bps = num * 1024 * 1024;
    else if (unit === 'G') bps = num * 1024 * 1024 * 1024;

    this.speedLimitBps = Math.round(bps);
    return { limitBps: this.speedLimitBps, message: `Speed limit set to ${limitStr.toUpperCase()} (${(this.speedLimitBps / (1024 * 1024)).toFixed(2)} MB/s)` };
  }

  getSpeedLimitBps(): number {
    return this.speedLimitBps;
  }

  private async downloadHTTP(download: Download, outputPath: string): Promise<void> {
    // Smart URL detection: if URL looks like a video site page (not a direct file),
    // try yt-dlp first since these are typically video pages that require extraction.
    const videoSitePatterns = [
      /youtube\.com\/watch/i,
      /youtu\.be\//i,
      /vimeo\.com/i,
      /dailymotion\.com/i,
      /pornhub\.com/i,
      /xvideos\.com/i,
      /xhamster\.com/i,
      /eporner\.com/i,
      /redtube\.com/i,
      /spankbang\.com/i,
      /xnxx\.com/i,
      /tiktok\.com/i,
      /twitter\.com\/.*\/status/i,
      /x\.com\/.*\/status/i,
      /instagram\.com\/(p|reel)\//i,
      /reddit\.com\/.*\/comments/i,
      /twitch\.tv/i,
    ];

    const isVideoSite = videoSitePatterns.some(p => p.test(download.url));
    const hasDirectFileExt = /\.(mp4|mkv|avi|mov|mp3|flac|wav|zip|rar|tar|gz|pdf|exe|dmg|iso|7z|apk|deb)(\?|$)/i.test(download.url);

    if (isVideoSite && !hasDirectFileExt) {
      logger.info({ id: download.id, url: download.url }, 'Detected video site URL — routing through yt-dlp for extraction');
      download.type = 'youtube'; // re-route
      await this.downloadYouTube(download, outputPath);
      return;
    }

    try {
      await this.downloadAria2HTTP(download, outputPath);
    } catch (err: any) {
      logger.warn({ id: download.id, err: err.message }, 'aria2c HTTP download unavailable or failed, attempting native HTTP fallback');
      await this.downloadNativeHTTP(download, outputPath);
    }
  }

  private async downloadAria2HTTP(download: Download, outputPath: string): Promise<void> {
    const binary = await resolveBinary('aria2c');
    return new Promise((resolve, reject) => {
      const args = [
        '-x', '4',
        '-s', '4',
        '--summary-interval', '1',
        '--console-log-level', 'warn',
        '--download-result', 'hide',
        '--continue', 'true',
        '--auto-file-renaming=false',
        '--file-allocation=none',
        '-d', dirname(outputPath),
        '-o', basename(outputPath),
        download.url,
      ];

      const proc = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      this.activeProcesses.set(download.id, proc);

      let stderrOutput = '';

      // Parse real progress from aria2c stdout/stderr
      proc.stdout?.on('data', (data) => {
        const line = data.toString();

        // aria2c progress: [#abc123 42MiB/120MiB(35%) CN:4 DL:5.2MiB ETA:15s]
        const progressMatch = line.match(/\((\d+)%\)/);
        const dlSpeedMatch = line.match(/DL:(\d+(?:\.\d+)?)(KiB|MiB|GiB)/);
        const sizeMatch = line.match(/([\d.]+)(KiB|MiB|GiB)\/([\d.]+)(KiB|MiB|GiB)/);
        const etaMatch = line.match(/ETA:(\S+)/);

        if (progressMatch) {
          download.progress = parseInt(progressMatch[1], 10);
        }

        if (dlSpeedMatch) {
          const num = parseFloat(dlSpeedMatch[1]);
          const unit = dlSpeedMatch[2];
          if (unit === 'MiB') download.speed = num;
          else if (unit === 'KiB') download.speed = num / 1024;
          else if (unit === 'GiB') download.speed = num * 1024;
        }

        if (sizeMatch) {
          const dlNum = parseFloat(sizeMatch[1]);
          const dlUnit = sizeMatch[2];
          const totalNum = parseFloat(sizeMatch[3]);
          const totalUnit = sizeMatch[4];
          download.downloaded = dlNum * (dlUnit === 'GiB' ? 1024 * 1024 * 1024 : dlUnit === 'MiB' ? 1024 * 1024 : 1024);
          download.size = totalNum * (totalUnit === 'GiB' ? 1024 * 1024 * 1024 : totalUnit === 'MiB' ? 1024 * 1024 : 1024);
        }

        if (etaMatch) {
          download.eta = etaMatch[1];
        }

        download.speedHistory.shift();
        download.speedHistory.push(download.speed);
        this.broadcast(download);
      });

      proc.stderr?.on('data', (data) => {
        const str = data.toString();
        stderrOutput += str;

        // Also parse progress from stderr (aria2c outputs to stderr sometimes)
        const match = str.match(/\((\d+)%\)/);
        if (match) {
          download.progress = parseInt(match[1], 10);
          this.broadcast(download);
        }
      });

      proc.on('close', async (code) => {
        const exists = await fileExists(outputPath);
        if (code === 0 && exists) {
          // Verify the downloaded file has actual content
          try {
            const { stat } = await import('fs/promises');
            const fileStat = await stat(outputPath);
            download.size = fileStat.size;
            download.downloaded = fileStat.size;

            if (fileStat.size < 1024) {
              // File is suspiciously small (< 1KB) — might be an error page
              const content = await readFile(outputPath, 'utf8').catch(() => '');
              if (content.includes('<html') || content.includes('<!DOCTYPE') || content.includes('<!doctype')) {
                await unlink(outputPath).catch(() => {});
                reject(new Error('Download returned an HTML page instead of a file. This URL may require yt-dlp. Try: youtube download <url>'));
                return;
              }
            }
          } catch {
            // stat failed, continue anyway
          }

          download.status = 'completed';
          download.progress = 100;
          download.completedAt = new Date().toISOString();
          download.speed = 0;
          download.eta = 'Done';
          resolve();
        } else {
          const cleanErr = stderrOutput.trim().split('\n').filter(Boolean).pop() || `aria2c exited with code ${code}`;
          reject(new Error(cleanErr));
        }
      });

      proc.on('error', (err: any) => {
        if (err.code === 'ENOENT') {
          reject(new Error('aria2c is not installed on this system. Run "brew install aria2c" to install it.'));
        } else {
          reject(err);
        }
      });
    });
  }

  private async downloadNativeHTTP(download: Download, outputPath: string): Promise<void> {
    logger.info({ id: download.id, url: download.url }, 'Starting native HTTP download fallback');

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    const res = await fetch(download.url, { redirect: 'follow', headers });
    if (!res.ok) {
      throw new Error(`HTTP download failed: ${res.status} ${res.statusText}`);
    }

    const contentLength = res.headers.get('content-length');
    if (contentLength) {
      download.size = parseInt(contentLength, 10);
    }

    if (!res.body) {
      throw new Error('Response body is empty');
    }

    const fileStream = createWriteStream(outputPath);
    let downloadedBytes = 0;
    let lastTime = Date.now();
    let lastBytes = 0;

    const nodeStream = Readable.fromWeb(res.body as any);

    nodeStream.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      download.downloaded = downloadedBytes;
      if (download.size > 0) {
        download.progress = Math.min(100, (downloadedBytes / download.size) * 100);
      }

      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      if (elapsed >= 0.5) {
        const speedBps = (downloadedBytes - lastBytes) / elapsed;
        download.speed = speedBps / (1024 * 1024);
        download.speedHistory.shift();
        download.speedHistory.push(download.speed);
        lastTime = now;
        lastBytes = downloadedBytes;
        this.broadcast(download);
      }
    });

    await finished(nodeStream.pipe(fileStream));

    // Set actual file size from bytes downloaded
    download.size = downloadedBytes;
    download.downloaded = downloadedBytes;

    // Verify the download isn't just an HTML error page
    if (downloadedBytes < 1024) {
      const content = await readFile(outputPath, 'utf8').catch(() => '');
      if (content.includes('<html') || content.includes('<!DOCTYPE') || content.includes('<!doctype')) {
        await unlink(outputPath).catch(() => {});
        throw new Error('Download returned an HTML page instead of a file. This URL may require yt-dlp. Try: youtube download <url>');
      }
    }

    download.status = 'completed';
    download.progress = 100;
    download.completedAt = new Date().toISOString();
    download.speed = 0;
    download.eta = 'Done';
    this.broadcast(download);
  }

  private async downloadYouTube(download: Download, outputPath: string): Promise<void> {
    const binary = await resolveBinary('yt-dlp');
    const format = download.format || 'mp4';
    const quality = download.quality || 'best';

    const args = [
      '-f', quality === 'best' ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best' : `bestvideo[height<=${quality}]+bestaudio/best`,
      '--merge-output-format', format,
      '-o', `${dirname(outputPath)}/%(title)s.%(ext)s`,
      '--newline',
      '--no-warnings',
      '--continue',
      '--socket-timeout', '30',
      '--retries', '10',
      '--fragment-retries', '10',
      '--user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    ];

    // Cookie handling: if cookiesFromBrowser is a browser name (chrome, brave, etc.),
    // use --cookies-from-browser. If it's a cookie string from the extension,
    // write a Netscape cookie jar file for yt-dlp.
    let cookieJarPath: string | null = null;
    if (download.cookiesFromBrowser) {
      const knownBrowsers = ['chrome', 'chromium', 'brave', 'firefox', 'edge', 'opera', 'safari', 'vivaldi'];
      if (knownBrowsers.includes(download.cookiesFromBrowser.toLowerCase())) {
        args.push('--cookies-from-browser', download.cookiesFromBrowser);
      } else if (download.cookiesFromBrowser.includes('=')) {
        // It's a cookie string like "name=val; name2=val2" from the browser extension
        try {
          const parsedUrl = new URL(download.url);
          const domain = parsedUrl.hostname;
          const cookiePairs = download.cookiesFromBrowser.split(';').map(s => s.trim()).filter(Boolean);

          // Write Netscape cookie jar format
          const lines = ['# Netscape HTTP Cookie File', '# https://curl.se/docs/http-cookies.html', ''];
          for (const pair of cookiePairs) {
            const eqIdx = pair.indexOf('=');
            if (eqIdx < 0) continue;
            const name = pair.slice(0, eqIdx);
            const value = pair.slice(eqIdx + 1);
            // domain, include_subdomains, path, secure, expiry, name, value
            lines.push(`.${domain}\tTRUE\t/\tFALSE\t0\t${name}\t${value}`);
          }

          cookieJarPath = join(DOWNLOAD_DIR, '.kelex', `cookies_${download.id}.txt`);
          await mkdir(join(DOWNLOAD_DIR, '.kelex'), { recursive: true });
          await writeFile(cookieJarPath, lines.join('\n'));
          args.push('--cookies', cookieJarPath);
          logger.info({ id: download.id, cookieCount: cookiePairs.length }, 'Wrote cookie jar from extension cookies');
        } catch (err: any) {
          logger.warn({ id: download.id, err: err.message }, 'Failed to write cookie jar, proceeding without cookies');
        }
      }
    }
    args.push(download.url);

    return new Promise((resolve, reject) => {
      const proc = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      this.activeProcesses.set(download.id, proc);

      let stderrOutput = '';
      proc.stderr?.on('data', (d) => { stderrOutput += d.toString(); });

      proc.stdout?.on('data', (data) => {
        const line = data.toString();
        
        // Capture actual actual filename/path from yt-dlp
        const destMatch = line.match(/\[download\] Destination:\s+(.+)/) || 
                          line.match(/\[download\]\s+(.+)\s+has already been downloaded/) ||
                          line.match(/\[Merger\] Merging formats into\s+"([^"]+)"/);
        
        if (destMatch) {
          const actualPath = destMatch[1];
          download.outputPath = actualPath;
          download.filename = basename(actualPath);
        }

        const progressMatch = line.match(/(\d+\.?\d*)%/);
        const speedMatch = line.match(/at\s+([\d.]+\s*[KMGT]?i?B\/s)/);
        const etaMatch = line.match(/ETA\s+(\d+:\d+)/);
        const seedsMatch = line.match(/Seeds?:\s*(\d+)/i);
        const leechersMatch = line.match(/Leechers?:\s*(\d+)/i);
        const peersMatch = line.match(/Peers?:\s*(\d+)/i);
        if (seedsMatch) download.seeds = parseInt(seedsMatch[1], 10);
        if (leechersMatch) download.leechers = parseInt(leechersMatch[1], 10);
        if (peersMatch) download.peers = parseInt(peersMatch[1], 10);

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

      proc.on('close', async (code) => {
        // Clean up temporary cookie jar file
        if (cookieJarPath) {
          await unlink(cookieJarPath).catch(() => {});
        }

        if (code === 0) {
          let exists = await fileExists(outputPath);
          if (!exists) {
            try {
              const files = await readdir(dirname(outputPath));
              const base = basename(outputPath, extname(outputPath));
              const matched = files.find((f: string) => f.startsWith(base) && f.endsWith('.' + format));
              if (matched) {
                download.outputPath = join(dirname(outputPath), matched);
                exists = true;
              }
            } catch { /* ignore */ }
          }

          // Also try to find any newly created file in the output directory
          if (!exists && download.outputPath) {
            exists = await fileExists(download.outputPath);
          }

          if (exists) {
            // Get actual file size
            try {
              const { stat } = await import('fs/promises');
              const finalPath = download.outputPath || outputPath;
              const fileStat = await stat(finalPath);
              download.size = fileStat.size;
              download.downloaded = fileStat.size;
            } catch { /* ignore */ }

            download.status = 'completed';
            download.progress = 100;
            download.completedAt = new Date().toISOString();
            download.speed = 0;
            download.eta = 'Done';
            resolve();
          } else {
            download.status = 'error';
            download.error = 'yt-dlp finished but output file is missing';
            reject(new Error('yt-dlp finished but output file is missing'));
          }
        } else {
          const lastErrLine = stderrOutput.trim().split('\n').filter(Boolean).pop() || `yt-dlp exited with code ${code}`;
          reject(new Error(lastErrLine));
        }
      });

      proc.on('error', (err: any) => {
        if (err.code === 'ENOENT') {
          reject(new Error('yt-dlp is not installed on this system. Run "brew install yt-dlp" to install it.'));
        } else {
          reject(err);
        }
      });
    });
  }

  private async downloadTorrent(download: Download, outputPath: string): Promise<void> {
    const binary = await resolveBinary('aria2c');
    return new Promise((resolve, reject) => {
      const args = [
        '--seed-time', '0',
        '--max-upload-limit', '1K',
        '--summary-interval', '1',
        '--continue', 'true',
        '--auto-file-renaming=false',
        '-d', dirname(outputPath),
        '-o', basename(outputPath),
        download.url,
      ];

      const proc = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
        const seedMatch = line.match(/(?:seeders?|seeds?):\s*(\d+)/i);
        const leechMatch = line.match(/(?:leechers?|peers?:)\s*(\d+)/i);
        if (seedMatch) download.seeds = parseInt(seedMatch[1], 10);
        if (leechMatch) download.leechers = parseInt(leechMatch[1], 10);
      });

      proc.on('close', async (code) => {
        clearInterval(interval);
        const exists = await fileExists(outputPath);
        if (code === 0 && exists) {
          download.status = 'completed';
          download.progress = 100;
          download.completedAt = new Date().toISOString();
          resolve();
        } else {
          if (!exists) {
            reject(new Error('aria2c torrent exited but output file was not created'));
          } else {
            reject(new Error(`aria2c torrent exited with code ${code}`));
          }
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
      this.saveState();
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
      this.saveState();
      return true;
    }
    download.status = 'queued';
    this.queue.push(id);
    this.sortQueue();
    this.broadcast(download);
    this.saveState();
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
    this.saveState();
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
      unlink(`${download.outputPath}.aria2`).catch(() => {});
      unlink(`${download.outputPath}.part`).catch(() => {});
      // yt-dlp may also write a fragment/template file with the video title
      unlink(`${download.outputPath}.part-Frag1`).catch(() => {});
    }
    this.saveState();
    return true;
  }

  retry(id: string): boolean {
    const download = this.downloads.get(id);
    if (!download) return false;
    download.status = 'queued';
    download.error = undefined;
    download.speed = 0;
    this.queue.push(id);
    this.sortQueue();
    this.broadcast(download);
    this.saveState();
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

  // Allow external routes to inject directly tracked downloads (e.g., converter)
  injectDownload(download: Download) {
    this.downloads.set(download.id, download);
    this.broadcast(download);
  }

  pauseAll() {
    for (const id of this.downloads.keys()) {
      this.pause(id);
    }
  }

  resumeAll() {
    for (const id of this.downloads.keys()) {
      this.resume(id);
    }
  }

  private broadcast(download: Download) {
    broadcastProgress(download);
    this.saveState();
  }
}

export const downloadManager = new DownloadManager();
