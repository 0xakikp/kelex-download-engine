import { apiPost } from '../client.js';
import { renderDownloadCard } from './downloads.js';

export async function addTorrent(url: string): Promise<void> {
  const download = await apiPost('/api/v1/torrents/add', { url });
  console.log();
  renderDownloadCard(download, '✓ Torrent Added');
  console.log();
}
