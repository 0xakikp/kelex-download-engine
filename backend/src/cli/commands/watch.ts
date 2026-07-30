import WebSocket from 'ws';
import chalk from 'chalk';
import readline from 'node:readline';
import { API_BASE } from '../client.js';
import { header, statusColors, statusEmojis, formatSize, formatSpeed, progressBar } from '../styles.js';
import type { Download } from '../types.js';

function render(downloads: Download[]) {
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);

  console.log();
  console.log(header('Download Monitor'));
  console.log(chalk.gray('Press Ctrl+C to exit'));
  console.log();

  if (downloads.length === 0) {
    console.log(chalk.gray('No active downloads.'));
    return;
  }

  console.log(chalk.bold('ID      Status        Progress  Speed      ETA    Size       Name'));
  console.log(chalk.gray('─'.repeat(95)));
  for (const d of downloads) {
    const color = statusColors[d.status] || chalk.white;
    const emoji = statusEmojis[d.status] || '•';
    const bar = progressBar(d.progress, 20);
    const id = d.id.padEnd(7);
    const status = color(`${emoji} ${d.status.padEnd(11)}`);
    const progress = `${d.progress.toFixed(1)}%`.padEnd(8);
    const speed = formatSpeed(d.speed).padEnd(10);
    const eta = (d.eta || '-').padEnd(6);
    const size = formatSize(d.size).padEnd(10);
    const name = d.filename || d.url;
    console.log(`${id} ${status} ${bar} ${progress} ${speed} ${eta} ${size} ${chalk.white(name)}`);
  }
}

export async function watchDownloads(): Promise<void> {
  const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws/progress';
  const ws = new WebSocket(wsUrl);
  const downloads = new Map<string, Download>();

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log(chalk.gray('Watching for updates...'));
    });

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'download.progress') {
          const d: Download = msg.data;
          downloads.set(d.id, d);
          render(Array.from(downloads.values()));
        }
      } catch {
        // ignore malformed
      }
    });

    ws.on('error', (err: Error) => {
      console.error(chalk.red('WebSocket error:'), err.message);
      reject(err);
    });

    ws.on('close', () => {
      resolve();
      process.exit(0);
    });

    process.once('SIGINT', () => {
      ws.close();
      resolve();
      process.exit(0);
    });
  });
}
