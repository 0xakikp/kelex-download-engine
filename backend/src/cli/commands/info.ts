import chalk from 'chalk';
import { api } from '../client.js';
import { header, box, statusColors, statusEmojis, formatSize, formatSpeed, progressBar } from '../styles.js';
import type { Download } from '../types.js';

export async function showDownloadInfo(id: string): Promise<void> {
  const download: Download = await api(`/api/v1/downloads/${id}`);
  const color = statusColors[download.status] || chalk.white;
  const emoji = statusEmojis[download.status] || '•';

  console.log();
  console.log(header('Download Details'));
  console.log();

  const content = [
    `${chalk.gray('ID:')}         ${chalk.cyan(download.id)}`,
    `${chalk.gray('Name:')}       ${download.filename}`,
    `${chalk.gray('URL:')}        ${chalk.gray(download.url)}`,
    `${chalk.gray('Type:')}       ${download.type}`,
    ...(download.cookiesFromBrowser ? [`${chalk.gray('Cookies:')}    ${chalk.cyan(download.cookiesFromBrowser)}`] : []),
    `${chalk.gray('Status:')}     ${emoji} ${color(download.status.toUpperCase())}`,
    '',
    `${chalk.gray('Progress:')}   ${progressBar(download.progress, 20)} ${chalk.bold(`${download.progress.toFixed(1)}%`)}`,
    `${chalk.gray('Size:')}       ${formatSize(download.size)}`,
    `${chalk.gray('Downloaded:')} ${formatSize(download.downloaded)}`,
    `${chalk.gray('Speed:')}      ${formatSpeed(download.speed)}`,
    `${chalk.gray('ETA:')}        ${download.eta || '-'}`,
    `${chalk.gray('Priority:')}   ${download.priority}`,
    `${chalk.gray('Category:')}   ${download.category}`,
    `${chalk.gray('Created:')}    ${new Date(download.createdAt).toLocaleString()}`,
  ];

  if (download.seeds != null || download.leechers != null) {
    content.push('', `${chalk.gray('Peers:')}      🌱 ${download.seeds ?? '-'} seeds · 🧲 ${download.leechers ?? '-'} leechers`);
  }

  if (download.outputPath) {
    content.push('', `💾 ${chalk.cyan(download.outputPath)}`);
  } else {
    content.push('', chalk.gray('💾 Not saved yet'));
  }

  if (download.error) {
    content.push('', `⚠️  ${chalk.red(download.error)}`);
  }

  box(download.filename, content.join('\n'));
  console.log();
}
