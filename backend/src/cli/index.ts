#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureBackend, stopBackend } from './client.js';
import { startRepl } from './repl.js';
import { printAnimatedBanner } from './intro.js';
import { setDebug } from './debug.js';
import {
  listDownloads,
  showStats,
  addDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  retryDownload,
  removeDownload,
  youtubeInfo,
  youtubeSearch,
  youtubeDownload,
  addTorrent,
  listFiles,
  deleteFile,
  watchDownloads,
  showStatus,
  showConfig,
  startDashboardShell,
  showDownloadInfo,
  openDownload,
  openDownloadDir,
  installExtension,
  setSpeedLimit,
  changeTheme,
  searchTorrentsCLI,
  convertMediaCLI,
} from './commands/index.js';

const program = new Command();

program
  .name('kelex')
  .description('Kelex Download Engine - terminal-first download manager')
  .version('2.0.0')
  .option('-p, --port <port>', 'backend port', '3001')
  .option('-h, --host <host>', 'backend host', '127.0.0.1')
  .option('-d, --debug', 'show debug output', false);

program
  .command('download <url>')
  .alias('dl')
  .description('Add a new download')
  .option('-t, --type <type>', 'download type (http, youtube, magnet, torrent)')
  .option('-n, --filename <name>', 'custom filename')
  .option('--cookies-from-browser <browser>', 'browser to load cookies from (chrome, firefox, safari, edge, brave)')
  .action(async (url, options) => {
    await ensureBackend();
    await addDownload(url, options.type, options.filename, options.cookiesFromBrowser);
  });

program
  .command('list')
  .alias('ls')
  .description('List all downloads')
  .action(async () => {
    await ensureBackend();
    await listDownloads();
  });

program
  .command('active')
  .description('List active downloads')
  .action(async () => {
    await ensureBackend();
    await listDownloads(true);
  });

program
  .command('pause <id>')
  .description('Pause a download')
  .action(async (id) => {
    await ensureBackend();
    await pauseDownload(id);
  });

program
  .command('resume <id>')
  .description('Resume a download')
  .action(async (id) => {
    await ensureBackend();
    await resumeDownload(id);
  });

program
  .command('cancel <id>')
  .alias('stop')
  .description('Cancel / stop a download')
  .action(async (id) => {
    await ensureBackend();
    await cancelDownload(id);
  });

program
  .command('retry <id>')
  .description('Retry a failed download')
  .action(async (id) => {
    await ensureBackend();
    await retryDownload(id);
  });

program
  .command('remove <id>')
  .aliases(['rm', 'delete'])
  .description('Remove / delete a download')
  .action(async (id) => {
    await ensureBackend();
    await removeDownload(id);
  });

const youtube = program.command('youtube').description('YouTube commands');

youtube
  .command('info <url>')
  .description('Show YouTube video info and formats')
  .action(async (url) => {
    await ensureBackend();
    await youtubeInfo(url);
  });

youtube
  .command('search <query...>')
  .description('Search YouTube')
  .action(async (query) => {
    await ensureBackend();
    await youtubeSearch(query.join(' '));
  });

youtube
  .command('download <url>')
  .alias('dl')
  .description('Add a YouTube download')
  .option('--cookies-from-browser <browser>', 'browser to load cookies from (chrome, firefox, safari, edge, brave)')
  .action(async (url, options) => {
    await ensureBackend();
    await youtubeDownload(url, options.cookiesFromBrowser);
  });

program
  .command('torrent <url>')
  .description('Add a torrent or magnet link')
  .action(async (url) => {
    await ensureBackend();
    await addTorrent(url);
  });

program
  .command('files')
  .description('List downloaded files')
  .action(async () => {
    await ensureBackend();
    await listFiles();
  });

program
  .command('file-delete <name>')
  .description('Delete a downloaded file')
  .action(async (name) => {
    await ensureBackend();
    await deleteFile(name);
  });

program
  .command('stats')
  .description('Show download statistics')
  .action(async () => {
    await ensureBackend();
    await showStats();
  });

program
  .command('info <id>')
  .description('Show detailed info for a download including saved path')
  .action(async (id) => {
    await ensureBackend();
    await showDownloadInfo(id);
  });

program
  .command('config')
  .description('Show configuration including download directory')
  .action(async () => {
    await ensureBackend();
    await showConfig();
  });

program
  .command('open <id>')
  .description('Open a downloaded file in the default app')
  .action(async (id) => {
    await ensureBackend();
    await openDownload(id);
  });

program
  .command('open-dir [id]')
  .alias('od')
  .description('Open the download directory (or a specific download\'s folder)')
  .action(async (id) => {
    await ensureBackend();
    await openDownloadDir(id);
  });

program
  .command('status')
  .alias('s')
  .description('Show live status dashboard of all downloads')
  .action(async () => {
    await ensureBackend();
    await showStatus();
  });

program
  .command('cli')
  .alias('shell')
  .alias('repl')
  .alias('dashboard')
  .description('Open interactive Kelex CLI workspace')
  .action(async () => {
    await printAnimatedBanner();
    await ensureBackend();
    await startRepl();
  });

program
  .command('watch')
  .description('Watch live download progress')
  .action(async () => {
    await ensureBackend();
    await watchDownloads();
  });

const extCmd = program.command('extension').description('Browser extension management');

extCmd
  .command('install [browser]')
  .alias('open')
  .description('Auto-load Kelex extension in Brave/Chrome/Edge (e.g. kelex extension install brave)')
  .action(async (browser) => {
    await installExtension(browser);
  });

program
  .command('limit <speed>')
  .description('Set global download speed limit (e.g. kelex limit 5M, 500K, or off)')
  .action(async (speed) => {
    await ensureBackend();
    await setSpeedLimit(speed);
  });

program
  .command('theme [name]')
  .description('Switch UI color theme (cyber, dracula, matrix, nord, sunset)')
  .action(async (name) => {
    await changeTheme(name);
  });

program
  .command('search <query>')
  .description('Search public torrents directly from terminal')
  .action(async (query) => {
    await ensureBackend();
    await searchTorrentsCLI(query);
  });

program
  .command('convert <id> [format]')
  .description('Convert completed video download to MP3 audio or 720p/1080p MP4')
  .action(async (id, format) => {
    await ensureBackend();
    await convertMediaCLI(id, format || 'mp3');
  });

const server = program.command('server').description('Backend server management');

server
  .command('start')
  .description('Start the backend server')
  .action(async () => {
    await ensureBackend();
    console.log(chalk.gray('Backend is running. Use "kelex server stop" to stop it.'));
  });

server
  .command('stop')
  .description('Stop the backend server')
  .action(async () => {
    stopBackend();
    console.log(chalk.gray('Backend stop signal sent.'));
  });

async function main() {
  program.hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.debug) {
      setDebug(true);
    }
    if (opts.port) process.env.KELEX_PORT = opts.port;
    if (opts.host) process.env.KELEX_HOST = opts.host;
  });

  const args = process.argv.slice(2);

  // Show banner for interactive mode
  const isInteractive = args.length === 0;
  if (isInteractive) {
    await printAnimatedBanner();
  }

  if (args.length === 0 || (args.length === 1 && (args[0] === '--help' || args[0] === '-h'))) {
    if (args.length === 0) {
      await ensureBackend();
      await startDashboardShell();
      return;
    }
  }

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  if (process.argv.includes('--debug') || process.argv.includes('-d')) {
    console.error(chalk.red(err.stack || err.message));
  } else {
    console.error(chalk.red(`Error: ${err.message}`));
    console.error(chalk.gray('Run with --debug for more details.'));
  }
  process.exit(1);
});
