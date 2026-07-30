import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';

export const statusColors: Record<string, typeof chalk> = {
  downloading: chalk.cyan,
  paused: chalk.yellow,
  queued: chalk.gray,
  completed: chalk.green,
  error: chalk.red,
  converting: chalk.magenta,
  seeding: chalk.blue,
};

export const statusEmojis: Record<string, string> = {
  downloading: '⬇️',
  paused: '⏸️',
  queued: '⏳',
  completed: '✅',
  error: '❌',
  converting: '🔄',
  seeding: '🌱',
};

export function formatSize(bytes: number): string {
  if (bytes === 0 || Number.isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function formatSpeed(mbps: number): string {
  if (mbps < 1) return `${(mbps * 1024).toFixed(0)} KB/s`;
  return `${mbps.toFixed(1)} MB/s`;
}

export function progressBar(percent: number, width = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  if (percent >= 100) return chalk.green(bar);
  if (percent >= 50) return chalk.cyan(bar);
  if (percent > 0) return chalk.yellow(bar);
  return chalk.gray(bar);
}

export function gradientText(text: string, colors: string[] = ['#0A84FF', '#AF52DE']): string {
  return gradient(colors)(text);
}

export function header(text: string): string {
  return gradient(['#0A84FF', '#AF52DE'])(text);
}

export function link(text: string, url: string, color?: string): string {
  const styled = color ? chalk.hex(color)(text) : chalk.cyan(text);
  const open = '\u001B]8;;' + url + '\u0007';
  const close = '\u001B]8;;\u0007';
  return open + styled + close;
}

export function box(title: string, content: string, color = '#0A84FF'): void {
  console.log(
    boxen(content, {
      title: chalk.bold(title),
      titleAlignment: 'left',
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderStyle: 'round',
      borderColor: color as any,
      dimBorder: false,
    })
  );
}

export function divider(color = '#1E1E1E'): void {
  const width = process.stdout.columns || 80;
  console.log(chalk.hex(color)('─'.repeat(width)));
}
