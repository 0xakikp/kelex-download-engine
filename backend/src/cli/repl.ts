import readline from 'node:readline';
import chalk from 'chalk';
import { isDebug } from './debug.js';
import { header } from './styles.js';
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
  showConfig,
  showDownloadInfo,
  openDownload,
  openDownloadDir,
} from './commands/index.js';

const COMMANDS = [
  'download', 'dl',
  'list', 'ls', 'active',
  'pause', 'resume', 'cancel', 'stop', 'retry', 'remove', 'rm', 'delete',
  'youtube info', 'youtube search', 'youtube download',
  'torrent add',
  'files', 'file delete',
  'stats', 'status', 's',
  'info',
  'config',
  'open',
  'open-dir', 'od',
  'watch',
  'clear',
  'help',
  'quit', 'exit',
];

function printHelp(): void {
  console.log();
  console.log(header('Available Commands'));
  console.log();
  const cmds = [
    ['download <url>', 'Add a new download'],
    ['list / ls', 'List all downloads'],
    ['active', 'List active downloads'],
    ['status / s', 'Show download statistics'],
    ['info <id>', 'Show download details and saved path'],
    ['config', 'Show configuration and download directory'],
    ['open <id>', 'Open a downloaded file'],
    ['open-dir [id] / od [id]', 'Open the download folder'],
    ['pause <id>', 'Pause a download'],
    ['resume <id>', 'Resume a download'],
    ['cancel / stop <id>', 'Cancel / stop a download'],
    ['retry <id>', 'Retry a failed download'],
    ['remove / rm / delete <id>', 'Remove / delete a download'],
    ['youtube info <url>', 'Show YouTube video info'],
    ['youtube search <q>', 'Search YouTube'],
    ['youtube download <url>', 'Add YouTube download'],
    ['torrent add <url>', 'Add torrent or magnet'],
    ['files', 'List downloaded files'],
    ['file delete <name>', 'Delete a downloaded file'],
    ['stats', 'Show download statistics'],
    ['watch', 'Live progress (dashboard above is always live)'],
    ['clear', 'Clear the screen'],
    ['help', 'Show this help'],
    ['quit / exit', 'Exit REPL'],
  ];
  for (const [cmd, desc] of cmds) {
    console.log(`  ${chalk.cyan(cmd.padEnd(24))} ${chalk.gray(desc)}`);
  }
  console.log();
}

export async function executeLine(line: string): Promise<boolean> {
  const parts = line.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return true;

  const [cmd, ...args] = parts;

  try {
    switch (cmd.toLowerCase()) {
      case 'download':
      case 'dl': {
        if (!args[0]) { console.log(chalk.yellow('Usage: download <url> [--cookies-from-browser <browser>]')); break; }
        const url = args[0];
        const cbIdx = args.indexOf('--cookies-from-browser');
        const cookies = cbIdx >= 0 ? args[cbIdx + 1] : undefined;
        await addDownload(url, undefined, undefined, cookies);
        break;
      }

      case 'list':
      case 'ls':
        await listDownloads();
        break;

      case 'active':
        await listDownloads(true);
        break;

      case 'pause':
        if (!args[0]) { console.log(chalk.yellow('Usage: pause <id>')); break; }
        await pauseDownload(args[0]);
        break;

      case 'resume':
        if (!args[0]) { console.log(chalk.yellow('Usage: resume <id>')); break; }
        await resumeDownload(args[0]);
        break;

      case 'cancel':
      case 'stop':
        if (!args[0]) { console.log(chalk.yellow('Usage: cancel <id>')); break; }
        await cancelDownload(args[0]);
        break;

      case 'retry':
        if (!args[0]) { console.log(chalk.yellow('Usage: retry <id>')); break; }
        await retryDownload(args[0]);
        break;

      case 'remove':
      case 'rm':
      case 'delete':
        if (!args[0]) { console.log(chalk.yellow('Usage: remove <id>')); break; }
        await removeDownload(args[0]);
        break;

      case 'youtube': {
        const sub = args[0]?.toLowerCase();
        if (sub === 'info') {
          if (!args[1]) { console.log(chalk.yellow('Usage: youtube info <url>')); break; }
          await youtubeInfo(args[1]);
        } else if (sub === 'search') {
          if (!args[1]) { console.log(chalk.yellow('Usage: youtube search <query>')); break; }
          await youtubeSearch(args.slice(1).join(' '));
        } else if (sub === 'download' || sub === 'dl') {
          if (!args[1]) { console.log(chalk.yellow('Usage: youtube download <url> [--cookies-from-browser <browser>]')); break; }
          const url = args[1];
          const cbIdx = args.indexOf('--cookies-from-browser');
          const cookies = cbIdx >= 0 ? args[cbIdx + 1] : undefined;
          await youtubeDownload(url, cookies);
        } else {
          console.log(chalk.yellow('Usage: youtube <info|search|download> ...'));
        }
        break;
      }

      case 'torrent': {
        const sub = args[0]?.toLowerCase();
        if (sub === 'add') {
          if (!args[1]) { console.log(chalk.yellow('Usage: torrent add <url>')); break; }
          await addTorrent(args[1]);
        } else {
          console.log(chalk.yellow('Usage: torrent add <url>'));
        }
        break;
      }

      case 'files':
        await listFiles();
        break;

      case 'file': {
        const sub = args[0]?.toLowerCase();
        if (sub === 'delete' || sub === 'rm') {
          if (!args[1]) { console.log(chalk.yellow('Usage: file delete <name>')); break; }
          await deleteFile(args[1]);
        } else {
          console.log(chalk.yellow('Usage: file delete <name>'));
        }
        break;
      }

      case 'stats':
        await showStats();
        break;

      case 'status':
      case 's':
        await showStats();
        break;

      case 'info':
        if (!args[0]) { console.log(chalk.yellow('Usage: info <id>')); break; }
        await showDownloadInfo(args[0]);
        break;

      case 'config':
        await showConfig();
        break;

      case 'open':
        if (!args[0]) { console.log(chalk.yellow('Usage: open <id>')); break; }
        await openDownload(args[0]);
        break;

      case 'open-dir':
      case 'od':
        await openDownloadDir(args[0]);
        break;

      case 'watch':
        console.log(chalk.gray('The dashboard above is live — it updates continuously.'));
        break;

      case 'clear':
        console.clear();
        break;

      case 'help':
      case '?':
        printHelp();
        break;

      case 'quit':
      case 'exit':
        return false;

      default:
        console.log(chalk.yellow(`Unknown command: ${cmd}. Type "help" for available commands.`));
    }
  } catch (err: any) {
    if (isDebug() && err.stack) {
      console.error(chalk.red(err.stack));
    } else {
      console.error(chalk.red(`Error: ${err.message}`));
    }
  }

  return true;
}

function startFallbackRepl(): void {
  console.log(header('Interactive Mode'));
  console.log(chalk.gray('Type a command and press Enter.'));
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('kelex ') + chalk.gray('❯ '),
    completer: (line: string) => {
      const hits = COMMANDS.filter(c => c.startsWith(line.toLowerCase()));
      return [hits.length ? hits : COMMANDS, line];
    },
  });

  rl.prompt();

  rl.on('line', async (line) => {
    rl.pause();
    const continueRepl = await executeLine(line);
    if (!continueRepl) {
      rl.close();
      return;
    }
    rl.prompt();
    rl.resume();
  });

  rl.on('close', () => {
    console.log(chalk.gray('\nGoodbye.'));
    process.exit(0);
  });
}

export async function startRepl(): Promise<void> {
  if (!process.stdin.isTTY) {
    startFallbackRepl();
    return;
  }
  // Unified interactive shell: live dashboard + boxed command output + prompt.
  const { startDashboardShell } = await import('./commands/dashboard-shell.js');
  await startDashboardShell();
}
