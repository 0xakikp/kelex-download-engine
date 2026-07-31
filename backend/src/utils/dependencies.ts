import { execSync } from 'child_process';
import { access, chmod, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import { logger } from './logger.js';

const BIN_DIR = join(os.homedir(), '.kelex', 'bin');

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

import { existsSync } from 'fs';

export function findSystemBinary(name: string): string | null {
  const commonPaths = [
    `/opt/homebrew/bin/${name}`,
    `/usr/local/bin/${name}`,
    `/usr/bin/${name}`,
    join(os.homedir(), '.local', 'bin', name),
  ];
  for (const p of commonPaths) {
    if (existsSync(p)) return p;
  }

  try {
    const cmd = process.platform === 'win32' ? `where ${name}` : `which ${name}`;
    const path = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split('\n')[0];
    if (path && existsSync(path)) return path;
  } catch {
    // not in system PATH
  }
  return null;
}

export async function resolveBinary(name: 'yt-dlp' | 'aria2c' | 'ffmpeg'): Promise<string> {
  // 1. Check system PATH
  const sysPath = findSystemBinary(name);
  if (sysPath) return sysPath;

  // 2. Check ~/.kelex/bin/
  const localPath = join(BIN_DIR, process.platform === 'win32' ? `${name}.exe` : name);
  if (await fileExists(localPath)) {
    return localPath;
  }

  // 3. Auto-download yt-dlp if missing
  if (name === 'yt-dlp') {
    try {
      return await downloadYtDlp(localPath);
    } catch (err: any) {
      logger.error({ err }, 'Failed to auto-download yt-dlp');
    }
  }

  // 4. Return binary name (will fail gracefully with clean error message if binary missing and no fallback)
  return name;
}

async function downloadYtDlp(targetPath: string): Promise<string> {
  logger.info({ targetPath }, 'yt-dlp not found. Auto-downloading latest yt-dlp binary...');

  await mkdir(BIN_DIR, { recursive: true });

  let downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  if (process.platform === 'darwin') {
    downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
  } else if (process.platform === 'win32') {
    downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  }

  const res = await fetch(downloadUrl, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Failed to auto-download yt-dlp: HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(targetPath, buffer);

  if (process.platform !== 'win32') {
    await chmod(targetPath, 0o755);
  }

  logger.info({ targetPath }, 'yt-dlp successfully auto-installed to ~/.kelex/bin/yt-dlp');
  return targetPath;
}
