import { spawn } from 'node:child_process';
import chalk from 'chalk';
import { api } from '../client.js';
import { link } from '../styles.js';
import type { Download } from '../types.js';

function getOpenCommand(): string {
  switch (process.platform) {
    case 'darwin': return 'open';
    case 'win32': return 'start';
    default: return 'xdg-open';
  }
}

export async function openDownload(id: string): Promise<void> {
  const download: Download = await api(`/api/v1/downloads/${id}`);
  const target = download.outputPath;

  if (!target) {
    console.log(chalk.yellow(`Download ${id} has not been saved yet.`));
    return;
  }

  console.log(`Opening ${link(target, `file://${target}`)}...`);
  spawn(getOpenCommand(), [target], { detached: true, stdio: 'ignore' }).unref();
}

export async function openDownloadDir(id?: string): Promise<void> {
  let target: string | undefined;

  if (id) {
    const download: Download = await api(`/api/v1/downloads/${id}`);
    target = download.outputPath ? download.outputPath.replace(/\/[^/]+$/, '') : undefined;
  }

  if (!target) {
    const config = await api('/api/v1/system/config');
    target = config.downloadDir as string;
  }

  if (!target) {
    console.log(chalk.yellow('Could not determine download directory.'));
    return;
  }

  console.log(`Opening ${link(target, `file://${target}`)}...`);
  const child = spawn(getOpenCommand(), [target], { detached: true, stdio: 'ignore' });
  child.unref();
}
