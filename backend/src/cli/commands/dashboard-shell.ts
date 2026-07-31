import WebSocket from 'ws';
import chalk from 'chalk';
import boxen from 'boxen';
import { API_BASE, api, ensureBackend } from '../client.js';
import { gradientText, formatSpeed } from '../styles.js';
import { executeLine } from '../repl.js';
import type { Download } from '../types.js';

const GRAPH_BARS = 30;
const graphHistory: number[] = [];
const PROMPT_VISIBLE_LEN = 8; // 'kelex ❯ '

// ── ANSI-aware line truncation ──────────────────────────────────────────────

/** Truncate a string to maxWidth visible characters, preserving ANSI codes. */
function truncateLine(str: string, maxWidth: number): string {
  if (maxWidth <= 0) return '\x1b[0m';
  let visible = 0;
  let i = 0;
  while (i < str.length && visible < maxWidth) {
    if (str[i] === '\x1b') {
      if (str[i + 1] === '[') {
        let j = i + 2;
        while (j < str.length) {
          const c = str.charCodeAt(j);
          if (c >= 0x40 && c <= 0x7e) break;
          j++;
        }
        i = j + 1;
        continue;
      }
      if (str[i + 1] === ']') {
        let j = i + 2;
        while (j < str.length && str[j] !== '\x07') j++;
        i = j + 1;
        continue;
      }
      i += 2;
      continue;
    }
    visible++;
    i++;
  }
  if (i >= str.length) return str;
  return str.slice(0, i) + '\x1b[0m';
}

// ── Dashboard Shell ─────────────────────────────────────────────────────────
// Architecture: normal screen buffer (scrollback works, mouse scroll works).
// Only the bottom 2 lines (status bar + prompt) repaint in-place.
// Command output prints directly to stdout and scrolls up naturally.

export async function startDashboardShell(): Promise<void> {
  await ensureBackend();

  const [initial, config] = await Promise.all([
    api('/api/v1/downloads'),
    api('/api/v1/system/config'),
  ]);

  const downloads = new Map<string, Download>();
  for (const d of initial.downloads || []) {
    downloads.set(d.id, d);
  }

  let input = '';
  const history: string[] = [];
  let historyIndex = -1;
  let savedInput = '';
  const promptText = gradientText('kelex') + chalk.cyan(' ❯ ');
  let processing = false;
  let buffered = '';
  let bottomDrawn = false;
  let renderInterval: ReturnType<typeof setInterval>;

  // Save originals before patching (needed for cleanup and raw writes).
  const _origStdoutWrite = process.stdout.write.bind(process.stdout);
  const _origStderrWrite = process.stderr.write.bind(process.stderr);

  /** Write directly to stdout, bypassing the \n→\r\n patch. */
  function rawWrite(str: string): void {
    _origStdoutWrite(str);
  }

  function getTerminalWidth(): number {
    return process.stdout.columns || 80;
  }

  /** Compact single-line status bar (like Gemini CLI's token/cost bar). */
  function renderStatusBar(): string {
    const all = Array.from(downloads.values());
    const active = all.filter(d => d.status === 'downloading');
    const paused = all.filter(d => d.status === 'paused');
    const queued = all.filter(d => d.status === 'queued');
    const completed = all.filter(d => d.status === 'completed');
    const failed = all.filter(d => d.status === 'error');

    const totalSpeed = active.reduce((s, d) => s + d.speed, 0);
    const maxSpeed = Math.max(...graphHistory, 1);
    const sparkline = graphHistory
      .map(s => {
        const h = Math.round((s / maxSpeed) * 6);
        return ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'][h];
      })
      .join('');

    const counts = [
      chalk.cyan(`\u2b07${active.length}`),
      chalk.yellow(`\u23f8${paused.length}`),
      chalk.gray(`\u23f3${queued.length}`),
      chalk.green(`\u2713${completed.length}`),
      chalk.red(`\u2717${failed.length}`),
    ].join(' ');

    return gradientText('KELEX') +
      chalk.gray(' \u00b7 ') + chalk.cyan(`:${config.port}`) +
      chalk.gray(' \u00b7 \ud83d\udcc1 ') + chalk.cyan(config.downloadDir) +
      chalk.gray('  ') + counts +
      chalk.gray('  ') + chalk.bold(`\u26a1${formatSpeed(totalSpeed)}`) +
      ' ' + chalk.cyan(sparkline);
  }

  function promptLine(): string {
    const width = getTerminalWidth();
    const available = Math.max(1, width - PROMPT_VISIBLE_LEN - 1);
    const visible =
      input.length > available ? '\u2026' + input.slice(-(available - 1)) : input;
    return promptText + visible;
  }

  /** Erase the 2-line bottom area (status bar + prompt). */
  function eraseBottom(): void {
    if (!bottomDrawn) return;
    rawWrite(
      '\r\x1b[K' +     // clear prompt line
      '\x1b[A\x1b[K' + // move up, clear status line
      '\r'
    );
    bottomDrawn = false;
  }

  /** Draw the 2-line bottom area at current cursor position. */
  function drawBottom(): void {
    const w = getTerminalWidth();
    rawWrite(
      truncateLine(renderStatusBar(), w) + '\x1b[K\r\n' +
      truncateLine(promptLine(), w) + '\x1b[K'
    );
    bottomDrawn = true;
  }

  /** Refresh the bottom area (erase + redraw). Skipped during command execution. */
  function refreshBottom(): void {
    if (processing) return;
    eraseBottom();
    drawBottom();
  }

  function shutdown(): void {
    clearInterval(renderInterval);
    eraseBottom();
    // Restore original write functions before final output.
    process.stdout.write = _origStdoutWrite;
    process.stderr.write = _origStderrWrite;
    console.log(chalk.gray('Goodbye. Backend keeps running \u2014 `kelex list` anytime.'));
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.exit(0);
  }

  async function runCommand(line: string): Promise<boolean> {
    if (line.trim() === 'clear') {
      rawWrite('\x1b[2J\x1b[H');
      bottomDrawn = false;
      drawBottom();
      return true;
    }

    eraseBottom();

    // Command header
    console.log(chalk.gray(`\n\u203a ${line}`));

    // Execute — output goes directly to stdout, scrolls naturally.
    let continueShell = true;
    try {
      continueShell = await executeLine(line);
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`));
    }

    console.log(); // spacer
    drawBottom();
    return continueShell;
  }

  function consumeEscape(seq: string): number {
    if (seq.length >= 3 && seq[1] === '[') {
      let j = 2;
      while (j < seq.length) {
        const code = seq.charCodeAt(j);
        if (code >= 0x40 && code <= 0x7e) return j + 1;
        j++;
      }
    }
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

        if (code === '\x1b[A') { // up arrow
          if (historyIndex === -1) savedInput = input;
          if (historyIndex < history.length - 1) {
            historyIndex++;
            input = history[history.length - 1 - historyIndex];
          }
          refreshBottom();
        } else if (code === '\x1b[B') { // down arrow
          if (historyIndex > 0) {
            historyIndex--;
            input = history[history.length - 1 - historyIndex];
          } else if (historyIndex === 0) {
            historyIndex = -1;
            input = savedInput;
          }
          refreshBottom();
        }
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
        if (line) {
          processing = true;
          const continueShell = await runCommand(line);
          processing = false;
          if (!continueShell) {
            shutdown();
            return;
          }
          if (buffered) {
            const b = buffered;
            buffered = '';
            await handleInput(b);
          }
        } else {
          refreshBottom();
        }
        continue;
      }

      if (key === '\x7f' || key === '\b') { // backspace
        input = input.slice(0, -1);
        refreshBottom();
        continue;
      }

      if (key === '\x03') { // Ctrl+C
        shutdown();
        return;
      }

      if (key === '\x04') { // Ctrl+D
        if (input === '') {
          shutdown();
          return;
        }
        input = input.slice(0, -1);
        refreshBottom();
        continue;
      }

      if (key === '\x0c') { // Ctrl+L — clear screen
        rawWrite('\x1b[2J\x1b[H');
        bottomDrawn = false;
        drawBottom();
        continue;
      }

      if (key >= ' ' && key <= '~') {
        input += key;
        refreshBottom();
        continue;
      }
    }
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  // Enable raw mode for custom key handling (history, no echo).
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  // Raw mode disables output post-processing (ONLCR) so \n no longer
  // auto-produces \r\n. Patch stdout/stderr to restore this, otherwise
  // console.log output from commands staircases across the screen.
  process.stdout.write = ((data: any, enc?: any, cb?: any) => {
    if (typeof data === 'string') data = data.replace(/(?<!\r)\n/g, '\r\n');
    return _origStdoutWrite(data, enc, cb);
  }) as any;
  process.stderr.write = ((data: any, enc?: any, cb?: any) => {
    if (typeof data === 'string') data = data.replace(/(?<!\r)\n/g, '\r\n');
    return _origStderrWrite(data, enc, cb);
  }) as any;

  // Welcome Card (Kimi CLI / Claude Code / Gemini CLI style)
  const welcomeCard = boxen(
    [
      chalk.bold.cyan('Welcome to Kelex Download Engine!'),
      `${chalk.gray('Directory:')} ${chalk.cyan(config.downloadDir)}`,
      `${chalk.gray('Backend:')}   ${chalk.cyan(`http://${config.host}:${config.port}`)}`,
      '',
      chalk.bold.yellow('⚡ COMMAND CHEAT SHEET:'),
      `  ${chalk.cyan('• Download:')}   ${chalk.white('download <url>')}  \u00b7  ${chalk.white('youtube download <url>')}  \u00b7  ${chalk.white('torrent add <magnet>')}`,
      `  ${chalk.cyan('• Search & Pro:')}${chalk.white('search <query>')}  \u00b7  ${chalk.white('convert <id> <format>')}  \u00b7  ${chalk.white('limit <speed>')}`,
      `  ${chalk.cyan('• Manage:')}     ${chalk.white('status')}  \u00b7  ${chalk.white('list')}  \u00b7  ${chalk.white('pause <id>')}  \u00b7  ${chalk.white('resume <id>')}  \u00b7  ${chalk.white('open <id>')}`,
      `  ${chalk.cyan('• Options:')}    ${chalk.white('theme <name>')}  \u00b7  ${chalk.white('extension install')}  \u00b7  ${chalk.white('help')}  \u00b7  ${chalk.white('exit')}`,
    ].join('\n'),
    {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      margin: { top: 0, bottom: 1 },
      borderStyle: 'round',
      borderColor: '#0A84FF' as any,
    }
  );
  console.log(welcomeCard);

  // Draw initial status bar + prompt at the bottom.
  drawBottom();

  // Live heartbeat: sample speed, poll latest download state, and refresh status bar every second.
  renderInterval = setInterval(async () => {
    try {
      const data = await api('/api/v1/downloads');
      if (data.downloads && Array.isArray(data.downloads)) {
        downloads.clear();
        for (const d of data.downloads) {
          downloads.set(d.id, d);
        }
      }
    } catch {
      // ignore transient api errors
    }

    const totalSpeed = Array.from(downloads.values())
      .filter(d => d.status === 'downloading')
      .reduce((s, d) => s + d.speed, 0);
    graphHistory.push(totalSpeed);
    if (graphHistory.length > GRAPH_BARS) graphHistory.shift();
    refreshBottom();
  }, 1000);

  // WebSocket for instant download progress updates.
  const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws/progress';
  const ws = new WebSocket(wsUrl);

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'download.progress') {
        const d: Download = msg.data;
        downloads.set(d.id, d);
        refreshBottom(); // status bar updates with new speed/counts
      }
    } catch {
      // ignore malformed
    }
  });

  ws.on('error', (err: Error) => {
    eraseBottom();
    console.log(chalk.red(`WebSocket error: ${err.message}`));
    drawBottom();
  });

  ws.on('close', () => {
    eraseBottom();
    console.log(chalk.gray('Disconnected from backend.'));
    drawBottom();
  });

  process.stdin.on('data', (data: string) => {
    handleInput(data).catch(() => {});
  });

  process.stdout.on('resize', () => refreshBottom());

  return new Promise(() => {});
}
