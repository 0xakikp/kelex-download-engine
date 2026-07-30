import chalk from 'chalk';
import { apiPost } from '../client.js';

export async function addTorrent(url: string): Promise<void> {
  const download = await apiPost('/api/v1/torrents/add', { url });
  console.log();
  console.log(chalk.green(`✓ Added torrent ${chalk.bold(download.id)}`));
  console.log(chalk.gray(`  ${download.filename || url}`));
  console.log();
}
