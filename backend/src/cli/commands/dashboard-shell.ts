import WebSocket from 'ws';
import chalk from 'chalk';
import boxen from 'boxen';
import { API_BASE, api, ensureBackend } from '../client.js';
import {
  gradientText,
  statusColors,
  statusEmojis,
  formatSize,
  formatSpeed,
  progressBar,
} from '../styles.js';
import { executeLine } from '../repl.js';
import type { Download } from '../types.js';

const GRAPH_BARS = 30;
const graphHistory: number[] = [];
const MAX_LOG_LINES = 200;
const PROMPT_VISIBLE_LEN = 8; // 'kelex ❯ '

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
  const logs: string[] = [];
  let logLineCount = 0;
  let processing = false;
  let buffered = '';

  function addBlock(text: string) {
    const block = text.replace(/\n+$/, '');
    if (!block) return;
    logs.push(block);
    logLineCount += block.split('\n').length;
    while (logLineCount > MAX_LOG_LINES && logs.length) {
      const removed = logs.shift()!;
      logLineCount -= removed.split('\n').length;
    }
  }

  function getTerminalWidth(): number {
    return process.stdout.columns || 80;
  }

  function getTerminalHeight(): number {
    return process.stdout.rows || 24;
  }

  function renderDashboard(maxDownloads: number): string[] {
    const lines: string[] = [];
    lines.push(
      gradientText('KELEX') +
        chalk.gray(' — Live Shell · ') +
        chalk.cyan(`${config.host}:${config.port}`) +
        chalk.gray(' · 📁 ') +
        chalk.cyan(config.downloadDir)
    );

    const all = Array.from(downloads.values());
    const active = all.filter(d => d.status === 'downloading');
    const paused = all.filter(d => d.status === 'paused');
    const queued = all.filter(d => d.status === 'queued');
    const completed = all.filter(d => d.status === 'completed');
    const failed = all.filter(d => d.status === 'error');

    lines.push(
      `${chalk.cyan('⬇️ Active')} ${active.length}  ` +
      `${chalk.yellow('⏸ Paused')} ${paused.length}  ` +
      `${chalk.gray('⏳ Queued')} ${queued.length}  ` +
      `${chalk.green('✅ Completed')} ${completed.length}  ` +
      `${chalk.red('❌ Failed')} ${failed.length}  ` +
      `${chalk.white('📦 Total')} ${downloads.size}`
    );

    const totalSpeed = active.reduce((s, d) => s + d.speed, 0);
    const maxSpeed = Math.max(...graphHistory, 1);
    lines.push(
      chalk.bold(`⚡ ${formatSpeed(totalSpeed)}`) + ' ' +
        graphHistory
          .map((s) => {
            const h = Math.round((s / maxSpeed) * 6);
            const levels = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
            return levels[h];
          })
          .join('')
    );

    if (downloads.size === 0) {
      lines.push(chalk.gray('No downloads yet — type: download <url>'));
    } else if (maxDownloads > 0) {
      const sorted = all.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      for (const d of sorted.slice(0, maxDownloads)) {
        const color = statusColors[d.status] || chalk.white;
        const emoji = statusEmojis[d.status] || '•';
        const peerInfo =
          d.seeds != null || d.leechers != null
            ? ` · 🌱 ${d.seeds ?? '-'} / 🧲 ${d.leechers ?? '-'}`
            : '';
        lines.push(`${emoji} ${chalk.white(d.filename || d.url)}`);
        lines.push(`   ${progressBar(d.progress, 18)} ${chalk.bold(`${d.progress.toFixed(1)}%`)}  ${formatSpeed(d.speed)}  ${formatSize(d.size)}`);
        lines.push(`   ${color(d.status.toUpperCase())} · ${chalk.gray(d.id.slice(0, 8))}${peerInfo}`);
      }
      if (sorted.length > maxDownloads) {
        lines.push(chalk.gray(`… and ${sorted.length - maxDownloads} more`));
      }
    }

    return lines;
  }

  function promptLine(): string {
    const width = getTerminalWidth();
    const available = Math.max(1, width - PROMPT_VISIBLE_LEN - 1);
    const visible =
      input.length > available ? '…' + input.slice(-(available - 1)) : input;
    return promptText + visible;
  }

  function doRender(sampleSpeed: boolean): void {
    if (sampleSpeed) {
      const totalSpeed = Array.from(downloads.values())
        .filter(d => d.status === 'downloading')
        .reduce((s, d) => s + d.speed, 0);
      graphHistory.push(totalSpeed);
      if (graphHistory.length > GRAPH_BARS) graphHistory.shift();
    }

    const height = getTerminalHeight();
    // hint(1) + prompt(1) + divider(1)
    const reserved = 3;
    // header(1) + stats(1) + speed(1) = 3 fixed dashboard rows
    const fixedDash = 3;
    const maxDownloads = Math.max(0, Math.min(5, Math.floor((height - reserved - fixedDash - 4) / 3)));
    const dashLines = renderDashboard(maxDownloads);

    const logRows = Math.max(0, height - reserved - dashLines.length - 1);
    // Flatten and keep the most recent lines — an oversized block (e.g. help)
    // gets cropped from the top instead of hiding the whole log region.
    const allLogLines = logs.flatMap(b => b.split('\n'));
    const visibleLogs = allLogLines.slice(-logRows);

    const frame: string[] = [];
    frame.push(...dashLines);
    frame.push(chalk.hex('#333333')('─'.repeat(getTerminalWidth())));
    frame.push(...visibleLogs);
    while (frame.length < height - reserved) frame.push('');
    frame.push(chalk.gray('↑ history · help · clear · quit'));
    frame.push(promptLine());

    // Cursor-home + repaint + clear-below. No full-screen clear flicker.
    process.stdout.write('\x1b[H' + frame.join('\n') + '\x1b[J');
  }

  function requestRender(sampleSpeed = false): void {
    if (processing) {
      return;
    }
    doRender(sampleSpeed);
  }

  function shutdown() {
    clearInterval(renderInterval);
    process.stdout.write('\x1b[?1049l'); // leave alternate screen
    console.log(chalk.gray('Shell closed. Backend keeps running — `kelex list` anytime.'));
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.exit(0);
  }

  async function runCommand(line: string): Promise<boolean> {
    if (line.trim() === 'clear') {
      logs.length = 0;
      logLineCount = 0;
      return true;
    }

    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    const chunks: string[] = [];
    const capture = (string: string | Uint8Array) => {
      const str = typeof string === 'string' ? string : Buffer.from(string).toString();
      chunks.push(str);
      return true;
    };
    process.stdout.write = capture as any;
    process.stderr.write = capture as any;

    let continueShell = true;
    try {
      continueShell = await executeLine(line);
    } catch (err: any) {
      chunks.push(chalk.red(`Error: ${err.message}`));
    } finally {
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
    }

    const output = chunks.join('').replace(/\n+$/, '');
    if (output.trim()) {
      if (/[╭╮╰╯│┌┐└┘─]/.test(output)) {
        // Output already renders its own box/table — don't double-wrap it.
        addBlock(chalk.gray(`› ${line}`) + '\n' + output);
      } else {
        addBlock(
          boxen(output, {
            title: `› ${line}`,
            titleAlignment: 'left',
            padding: 0,
            margin: 0,
            borderStyle: 'round',
            borderColor: '#AF52DE' as any,
            dimBorder: true,
          })
        );
      }
    } else {
      addBlock(chalk.gray(`› ${line}`));
    }

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

        if (code === '\x1b[A') { // up
          if (historyIndex === -1) savedInput = input;
          if (historyIndex < history.length - 1) {
            historyIndex++;
            input = history[history.length - 1 - historyIndex];
          }
          requestRender();
        } else if (code === '\x1b[B') { // down
          if (historyIndex > 0) {
            historyIndex--;
            input = history[history.length - 1 - historyIndex];
          } else if (historyIndex === 0) {
            historyIndex = -1;
            input = savedInput;
          }
          requestRender();
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
        }
        doRender(false);
        continue;
      }

      if (key === '\x7f' || key === '\b') {
        input = input.slice(0, -1);
        requestRender();
        continue;
      }

      if (key === '\x03') {
        shutdown();
        return;
      }

      if (key === '\x04') {
        if (input === '') {
          shutdown();
          return;
        }
        input = input.slice(0, -1);
        requestRender();
        continue;
      }

      if (key === '\x0c') {
        logs.length = 0;
        logLineCount = 0;
        requestRender();
        continue;
      }

      if (key >= ' ' && key <= '~') {
        input += key;
        requestRender();
        continue;
      }
    }
  }

  // Enter alternate screen so the user's scrollback is preserved.
  process.stdout.write('\x1b[?1049h\x1b[H');

  // Initial render
  doRender(true);

  // Live heartbeat: keep speeds/sparkline fresh even without WS events.
  const renderInterval = setInterval(() => requestRender(true), 1000);

  const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws/progress';
  const ws = new WebSocket(wsUrl);

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'download.progress') {
        const d: Download = msg.data;
        downloads.set(d.id, d);
        requestRender();
      }
    } catch {
      // ignore malformed
    }
  });

  ws.on('error', (err: Error) => {
    addBlock(chalk.red(`WebSocket error: ${err.message}`));
    requestRender();
  });

  ws.on('close', () => {
    addBlock(chalk.gray('Disconnected from backend.'));
    requestRender();
  });

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (data: string) => {
    handleInput(data).catch(() => {});
  });

  process.stdout.on('resize', () => {
    requestRender();
  });

  return new Promise(() => {});
}
