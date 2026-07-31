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

export interface Theme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  gradient: string[];
}

export const themes: Record<string, Theme> = {
  cyber: {
    name: 'Cyber Neon (Default)',
    primary: '#0A84FF',
    secondary: '#AF52DE',
    accent: '#30D158',
    gradient: ['#0A84FF', '#AF52DE'],
  },
  dracula: {
    name: 'Dracula Dark',
    primary: '#BD93F9',
    secondary: '#FF79C6',
    accent: '#8BE9FD',
    gradient: ['#BD93F9', '#FF79C6'],
  },
  matrix: {
    name: 'Matrix Hacker',
    primary: '#00FF66',
    secondary: '#50FA7B',
    accent: '#00E676',
    gradient: ['#00FF66', '#50FA7B'],
  },
  nord: {
    name: 'Nordic Frost',
    primary: '#88C0D0',
    secondary: '#81A1C1',
    accent: '#A3BE8C',
    gradient: ['#88C0D0', '#81A1C1'],
  },
  sunset: {
    name: 'Vibrant Sunset',
    primary: '#FF5E36',
    secondary: '#FFB340',
    accent: '#FFD600',
    gradient: ['#FF5E36', '#FFB340'],
  },
};

let currentTheme: Theme = themes.cyber;

export function setTheme(name: string): Theme {
  const key = name.toLowerCase();
  if (themes[key]) {
    currentTheme = themes[key];
  }
  return currentTheme;
}

export function getTheme(): Theme {
  return currentTheme;
}

export function statusColor(status: string): typeof chalk {
  return statusColors[status] || chalk.cyan;
}

export function gradientText(text: string, colors: string[] = currentTheme.gradient): string {
  return gradient(colors)(text);
}

export function header(text: string): string {
  return gradient(currentTheme.gradient)(text);
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
