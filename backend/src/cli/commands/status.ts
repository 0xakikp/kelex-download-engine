import WebSocket from 'ws';
import chalk from 'chalk';
import readline from 'node:readline';
import { API_BASE, api } from '../client.js';
import { header, statusColors, statusEmojis, formatSize, formatSpeed, progressBar } from '../styles.js';
import type { Download } from '../types.js';

const GRAPH_BARS = 40;
const graphHistory: number[] = [];

function render(downloads: Download[], downloadDir?: string) {
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);

  console.log();
  console.log(header('Live Status'));
  if (downloadDir) {
    console.log(chalk.gray(`📁 ${downloadDir}`));
  }
  console.log(chalk.gray('Press Ctrl+C to exit'));
  console.log(chalk.gray('Tip: run `kelex repl` to type interactive commands'));
  console.log();

  const active = downloads.filter(d => d.status === 'downloading');
  const paused = downloads.filter(d => d.status === 'paused');
  const queued = downloads.filter(d => d.status === 'queued');
  const completed = downloads.filter(d => d.status === 'completed');
  const failed = downloads.filter(d => d.status === 'error');

  console.log(
    `${chalk.cyan('⬇️ Active')} ${active.length}  ` +
    `${chalk.yellow('⏸ Paused')} ${paused.length}  ` +
    `${chalk.gray('⏳ Queued')} ${queued.length}  ` +
    `${chalk.green('✅ Completed')} ${completed.length}  ` +
    `${chalk.red('❌ Failed')} ${failed.length}  ` +
    `${chalk.white('📦 Total')} ${downloads.length}`
  );
  console.log();

  if (downloads.length === 0) {
    console.log(chalk.gray('No downloads.'));
    return;
  }

  const totalSpeed = active.reduce((s, d) => s + d.speed, 0);
  graphHistory.push(totalSpeed);
  if (graphHistory.length > GRAPH_BARS) graphHistory.shift();
  const maxSpeed = Math.max(...graphHistory, 1);

  console.log(chalk.bold(`⚡ Total bandwidth: ${formatSpeed(totalSpeed)}`));
  console.log(
    graphHistory
      .map((s) => {
        const h = Math.round((s / maxSpeed) * 6);
        const levels = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        return levels[h];
      })
      .join('')
  );
  console.log();

  for (const d of downloads) {
    const color = statusColors[d.status] || chalk.white;
    const emoji = statusEmojis[d.status] || '•';
    const bar = progressBar(d.progress, 24);
    const percent = chalk.bold(`${d.progress.toFixed(1)}%`);
    const name = chalk.white(d.filename || d.url);

    const peerInfo =
      d.seeds != null || d.leechers != null
        ? ` · 🌱 ${d.seeds ?? '-'} / 🧲 ${d.leechers ?? '-'}`
        : '';

    console.log(`${emoji} ${name}`);
    console.log(`   ${bar} ${percent}  ${formatSpeed(d.speed)}  ${formatSize(d.size)}`);
    console.log(`   ${color(d.status.toUpperCase())} · ${chalk.gray(d.id)}${peerInfo}`);
    if (d.outputPath) {
      console.log(`   💾 ${chalk.gray(d.outputPath)}`);
    }
    if (d.error) {
      console.log(`   ⚠️  ${chalk.red(d.error)}`);
    }
    console.log();
  }

  console.log(chalk.gray('Run `kelex repl` for an interactive command shell'));
}

export async function showStatus(): Promise<void> {
  const [initial, config] = await Promise.all([
    api('/api/v1/downloads'),
    api('/api/v1/system/config'),
  ]);
  const downloads = new Map<string, Download>();
  for (const d of initial.downloads || []) {
    downloads.set(d.id, d);
  }
  render(Array.from(downloads.values()), config.downloadDir);

  const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws/progress';
  const ws = new WebSocket(wsUrl);

  return new Promise((resolve, reject) => {
    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'download.progress') {
          const d: Download = msg.data;
          downloads.set(d.id, d);
          render(Array.from(downloads.values()), config.downloadDir);
        }
      } catch {
        // ignore malformed
      }
    });

    ws.on('error', (err: Error) => {
      reject(err);
    });

    ws.on('close', () => {
      resolve();
      console.log(chalk.gray('\nDashboard closed. Run `kelex repl` to type interactive commands.'));
      process.exit(0);
    });

    process.once('SIGINT', () => {
      ws.close();
      resolve();
      console.log(chalk.gray('\nDashboard closed. Run `kelex repl` to type interactive commands.'));
      process.exit(0);
    });
  });
}
