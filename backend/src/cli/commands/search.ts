import chalk from 'chalk';
import { api } from '../client.js';
import { header, box } from '../styles.js';

export async function searchTorrentsCLI(query: string): Promise<void> {
  console.log();
  console.log(header(`Torrent Search: "${query}"`));
  console.log(chalk.gray('Querying public torrent trackers...'));
  console.log();

  const data = await api(`/api/v1/torrents/search?q=${encodeURIComponent(query)}`);
  const results = data.results || [];

  if (results.length === 0) {
    box('No Torrents Found', chalk.gray(`No torrent results found for "${query}". Try alternative keywords.`));
    return;
  }

  console.log(chalk.bold('ID  Seed  Leech  Size       Title'));
  console.log(chalk.gray('─'.repeat(80)));
  results.forEach((r: any, idx: number) => {
    const num = String(idx + 1).padEnd(3);
    const seeds = chalk.green(String(r.seeds).padStart(4));
    const leech = chalk.yellow(String(r.leechers).padStart(5));
    const size = (r.size || '-').padEnd(10);
    const title = r.title.length > 50 ? r.title.slice(0, 47) + '...' : r.title;
    console.log(`${num} ${seeds}  ${leech}  ${size} ${chalk.white(title)}`);
  });
  console.log();
  console.log(chalk.gray('To download a result, copy its magnet link or run: kelex torrent <magnet>'));
  console.log();
}
