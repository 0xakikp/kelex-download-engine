import readline from 'node:readline';
import chalk from 'chalk';
import { isDebug } from './debug.js';
import { api } from './client.js';
import { header } from './styles.js';
import { printBanner, printBox, gradientText } from './intro.js';
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
    ['status / s', 'Live status dashboard (run outside REPL)'],
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
    ['watch', 'Watch live progress (run outside REPL)'],
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
        console.log(chalk.gray('Tip: run `kelex status` outside the REPL for the full-screen dashboard.'));
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
        console.log(chalk.gray('Tip: run `kelex watch` outside the REPL for the full-screen watcher.'));
        break;

      case 'clear':
        console.clear();
        printBanner();
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

  const [stats, config] = await Promise.all([
    api('/api/v1/downloads/stats').catch(() => ({} as any)),
    api('/api/v1/system/config').catch(() => ({ downloadDir: '/opt/kelex-downloads', host: '127.0.0.1', port: '3001' })),
  ]);

  console.clear();
  printBanner();

  const statusContent = [
    `${gradientText('Backend:')} ${chalk.cyan(`http://${config.host}:${config.port}`)}`,
    `${gradientText('Download dir:')} ${chalk.cyan(config.downloadDir)}`,
    `${gradientText('Queue:')} ${chalk.white(stats.total ?? 0)} total · ${chalk.cyan(stats.active ?? 0)} active · ${chalk.green(stats.completed ?? 0)} completed · ${chalk.red(stats.failed ?? 0)} failed`,
    '',
    `${chalk.gray('Type a command and press Enter · Try: download <url> · list · help')}`,
    `${chalk.gray('Press Ctrl+C or type quit / exit to leave')}`,
  ].join('\n');
  printBox(gradientText('Kelex Command Shell'), statusContent, '#AF52DE');

  let input = '';
  const history: string[] = [];
  let historyIndex = -1;
  let savedInput = '';
  const promptText = gradientText('kelex') + chalk.cyan(' ❯ ');
  const PROMPT_VISIBLE_LEN = 8; // 'kelex ❯ '

  function getTerminalWidth(): number {
    return process.stdout.columns || 80;
  }

  // Single-line prompt redrawn with carriage-return + erase-line.
  // Far more terminal-compatible than multi-line cursor movement.
  function drawPrompt(): void {
    const width = getTerminalWidth();
    const available = Math.max(1, width - PROMPT_VISIBLE_LEN - 1);
    const visible =
      input.length > available ? '…' + input.slice(-(available - 1)) : input;
    process.stdout.write('\r\x1b[2K' + promptText + visible);
  }

  function shutdown(): void {
    process.stdout.write('\r\x1b[2K');
    console.log(chalk.gray('Goodbye.'));
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.exit(0);
  }

  drawPrompt();

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  let processing = false;
  let buffered = '';

  function consumeEscape(seq: string): number {
    // CSI sequences start with \x1b[ and end in 0x40-0x7E.
    if (seq.length >= 3 && seq[1] === '[') {
      let j = 2;
      while (j < seq.length) {
        const code = seq.charCodeAt(j);
        if (code >= 0x40 && code <= 0x7e) return j + 1;
        j++;
      }
    }
    // Non-CSI escape sequences usually end after one more char.
    return seq.length >= 2 ? 2 : 1;
  }

  async function handleInput(data: string): Promise<void> {
    if (processing) {
      buffered += data;
      return;
    }

    for (let i = 0; i < data.length; i++) {
      const key = data[i];
      const seq = data.slice(i);

      if (key === '\x1b') {
        const consumed = consumeEscape(seq);
        const code = seq.slice(0, consumed);
        i += consumed - 1;

        if (code === '\x1b[A') { // up
          if (historyIndex === -1) savedInput = input;
          if (historyIndex < history.length - 1) {
            historyIndex++;
            input = history[history.length - 1 - historyIndex];
            drawPrompt();
          }
        } else if (code === '\x1b[B') { // down
          if (historyIndex > 0) {
            historyIndex--;
            input = history[history.length - 1 - historyIndex];
          } else if (historyIndex === 0) {
            historyIndex = -1;
            input = savedInput;
          }
          drawPrompt();
        }
        // left/right/home/end ignored
        continue;
      }

      if (key === '\r' || key === '\n') {
        const line = input.trim();
        if (line) {
          history.push(line);
          historyIndex = -1;
          savedInput = '';
        }
        input = '';
        process.stdout.write('\r\x1b[2K');
        if (line) {
          process.stdout.write(chalk.gray('› ') + chalk.white(line) + '\n');
          processing = true;
          const continueRepl = await executeLine(line);
          processing = false;
          if (!continueRepl) {
            shutdown();
            return;
          }
          // Flush any input that arrived while the command ran.
          if (buffered) {
            const b = buffered;
            buffered = '';
            await handleInput(b);
          }
        }
        drawPrompt();
        continue;
      }

      if (key === '\x7f' || key === '\b') { // backspace
        input = input.slice(0, -1);
        drawPrompt();
        continue;
      }

      if (key === '\x03') { // ctrl+c
        shutdown();
        return;
      }

      if (key === '\x04') { // ctrl+d
        if (input === '') {
          shutdown();
          return;
        }
        input = input.slice(0, -1);
        drawPrompt();
        continue;
      }

      if (key === '\x0c') { // ctrl+l
        console.clear();
        printBanner();
        drawPrompt();
        continue;
      }

      if (key >= ' ' && key <= '~') {
        input += key;
        drawPrompt();
        continue;
      }

      // Ignore other control characters
    }
  }

  process.stdin.on('data', (data: string) => {
    handleInput(data).catch(() => {});
  });

  process.stdout.on('resize', () => {
    drawPrompt();
  });
}
