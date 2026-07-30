import chalk from 'chalk';
import { api, apiPost, apiDelete } from '../client.js';
import { header, box, divider, link, statusColors, statusEmojis, formatSize, formatSpeed, progressBar } from '../styles.js';
import type { Download } from '../types.js';

export async function listDownloads(activeOnly = false): Promise<void> {
  const [data, config] = await Promise.all([
    api(activeOnly ? '/api/v1/downloads/active' : '/api/v1/downloads'),
    api('/api/v1/system/config'),
  ]);
  const downloads: Download[] = data.downloads || [];

  console.log();
  console.log(header(activeOnly ? 'Active Downloads' : 'Downloads'));
  console.log(chalk.gray(`📁 ${config.downloadDir}`));
  console.log();

  if (downloads.length === 0) {
    box('Status', chalk.gray('No downloads in queue.\nAdd one with: kelex download <url>'));
    return;
  }

  for (const d of downloads) {
    const color = statusColors[d.status] || chalk.white;
    const emoji = statusEmojis[d.status] || '•';
    const name = chalk.white(d.filename || d.url);
    const bar = progressBar(d.progress, 16);
    const percent = chalk.bold(`${d.progress.toFixed(1)}%`);

    const lines = [
      `${emoji} ${name}`,
      `   ${bar} ${percent}  ${formatSpeed(d.speed)}  ${formatSize(d.size)}`,
      `   ${color(d.status.toUpperCase())} · ${chalk.gray(d.id)}`,
    ];

    if (d.outputPath) {
      lines.push(`   💾 ${link(d.outputPath, `file://${d.outputPath}`)}`);
    }
    if (d.error) {
      lines.push(`   ⚠️  ${chalk.red(d.error)}`);
    }

    console.log(lines.join('\n'));
    console.log();
  }

  divider();
  console.log(chalk.gray(`Use "kelex info <id>" for full details.`));
  console.log();
}

export async function showStats(): Promise<void> {
  const stats = await api('/api/v1/downloads/stats');

  console.log();
  console.log(header('Download Stats'));
  console.log();

  const content = [
    `${chalk.cyan('Active:')}    ${stats.active}`,
    `${chalk.yellow('Paused:')}    ${stats.paused}`,
    `${chalk.gray('Queued:')}    ${stats.queued}`,
    `${chalk.green('Completed:')} ${stats.completed}`,
    `${chalk.red('Failed:')}     ${stats.failed}`,
    `${chalk.white('Total:')}     ${stats.total}`,
    '',
    `${chalk.cyan('Total Speed:')} ${formatSpeed(stats.totalSpeed)}`,
  ].join('\n');

  box('Overview', content);
  console.log();
}

export async function addDownload(
  url: string,
  type?: string,
  filename?: string,
  cookiesFromBrowser?: string,
): Promise<void> {
  const inferredType = type || inferType(url);
  const body: Record<string, string | undefined> = { url, type: inferredType };
  if (filename) body.filename = filename;
  if (cookiesFromBrowser) body.cookiesFromBrowser = cookiesFromBrowser;

  const download: Download = await apiPost('/api/v1/downloads', body);
  console.log();
  console.log(chalk.green(`✓ Added download ${chalk.bold(download.id)}`));
  console.log(chalk.gray(`  ${download.filename || url}`));
  if (download.outputPath) {
    console.log(chalk.gray(`  → ${download.outputPath}`));
  }
  console.log();
}

export async function pauseDownload(id: string): Promise<void> {
  await apiPost(`/api/v1/downloads/${id}/pause`);
  console.log(chalk.yellow(`⏸ Paused ${id}`));
}

export async function resumeDownload(id: string): Promise<void> {
  await apiPost(`/api/v1/downloads/${id}/resume`);
  console.log(chalk.cyan(`▶ Resumed ${id}`));
}

export async function cancelDownload(id: string): Promise<void> {
  await apiPost(`/api/v1/downloads/${id}/cancel`);
  console.log(chalk.red(`✕ Cancelled ${id}`));
}

export async function retryDownload(id: string): Promise<void> {
  await apiPost(`/api/v1/downloads/${id}/retry`);
  console.log(chalk.cyan(`↻ Retrying ${id}`));
}

export async function removeDownload(id: string): Promise<void> {
  await apiDelete(`/api/v1/downloads/${id}`);
  console.log(chalk.gray(`🗑 Removed ${id}`));
}

export function inferType(url: string): string {
  if (url.startsWith('magnet:')) return 'magnet';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/\.torrent$/i.test(url) || url.startsWith('torrent:')) return 'torrent';
  return 'http';
}
