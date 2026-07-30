import chalk from 'chalk';
import { api, apiPost } from '../client.js';
import { header, box, formatSize } from '../styles.js';
import type { YouTubeInfo, YouTubeSearchResult } from '../types.js';

function formatDuration(seconds?: number): string {
  if (seconds === undefined) return '?';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}:${s.toString().padStart(2, '0')}`;
  const h = Math.floor(m / 60);
  return `${h}:${(m % 60).toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export async function youtubeInfo(url: string): Promise<void> {
  const info: YouTubeInfo = await api(`/api/v1/youtube/info?url=${encodeURIComponent(url)}`);

  console.log();
  console.log(header('YouTube Info'));
  console.log();

  box(info.title, [
    `${chalk.gray('Uploader:')} ${info.uploader}`,
    info.duration ? `${chalk.gray('Duration:')} ${formatDuration(info.duration)}` : '',
  ].filter(Boolean).join('\n'));

  console.log();
  console.log(chalk.bold('Available formats:'));
  console.log(chalk.gray('ID        Ext  Resolution  Size      Codec'));
  console.log(chalk.gray('─'.repeat(70)));
  for (const f of info.formats.slice(0, 20)) {
    const id = f.formatId.padEnd(9);
    const ext = (f.ext || '-').padEnd(4);
    const res = (f.resolution || '-').padEnd(11);
    const size = formatSize(f.filesize || 0).padEnd(9);
    const codec = `${f.vcodec || ''}/${f.acodec || ''}`.replace(/^\/$/, '-');
    console.log(`${id} ${ext}  ${res} ${size} ${codec}`);
  }
  console.log();
}

export async function youtubeSearch(query: string): Promise<void> {
  const data = await api(`/api/v1/youtube/search?q=${encodeURIComponent(query)}`);
  const results: YouTubeSearchResult[] = data.results || [];

  console.log();
  console.log(header(`YouTube Search: ${query}`));
  console.log();

  if (results.length === 0) {
    box('No results', data.error ? chalk.yellow(data.error) : chalk.gray('No videos found.'));
    return;
  }

  for (const r of results) {
    console.log(`🎬 ${chalk.bold(r.title)}`);
    console.log(`   ${chalk.gray(r.uploader)} · ${formatDuration(r.duration)} · ${r.viewCount?.toLocaleString() || '?'} views`);
    console.log(`   ${chalk.cyan(r.url)}`);
    console.log();
  }
}

export async function youtubeDownload(
  url: string,
  cookiesFromBrowser?: string,
  quality?: string,
  format?: string,
): Promise<void> {
  const body: Record<string, string | undefined> = { url, quality, format };
  if (cookiesFromBrowser) body.cookiesFromBrowser = cookiesFromBrowser;
  const download = await apiPost('/api/v1/youtube/download', body);
  console.log();
  console.log(chalk.green(`✓ Added YouTube download ${chalk.bold(download.id)}`));
  console.log(chalk.gray(`  ${download.filename || url}`));
  console.log();
}
