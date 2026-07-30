import WebSocket from 'ws';
import chalk from 'chalk';
import { API_BASE, api, ensureBackend } from '../client.js';
import {
  header,
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
const MAX_LOG_LINES = 50;

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

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
  let processing = false;
  let buffered = '';

  function addLog(text: string) {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line === '' && logs.length > 0 && logs[logs.length - 1] === '') continue;
      logs.push(line);
    }
    while (logs.length > MAX_LOG_LINES) logs.shift();
  }

  function getTerminalWidth(): number {
    return process.stdout.columns || 80;
  }

  function getTerminalHeight(): number {
    return process.stdout.rows || 24;
  }

  function drawInputBox(): string {
    const width = getTerminalWidth();
    const top = chalk.hex('#0A84FF')('╭' + '─'.repeat(width - 2) + '╮');
    const bottom = chalk.hex('#0A84FF')('╰' + '─'.repeat(width - 2) + '╯');
    const left = chalk.hex('#0A84FF')('│ ') + promptText;
    const right = chalk.hex('#0A84FF')(' │');
    const available = Math.max(0, width - stripAnsi(left).length - stripAnsi(right).length);
    const visibleInput = input.slice(-available);
    const padding = ' '.repeat(available - stripAnsi(visibleInput).length);
    const middle = left + visibleInput + padding + right;
    return top + '\n' + middle + '\n' + bottom;
  }

  function renderDashboard(): string {
    const lines: string[] = [];
    lines.push(header('Live Dashboard'));
    lines.push(chalk.gray(`📁 ${config.downloadDir}`));

    const active = Array.from(downloads.values()).filter(d => d.status === 'downloading');
    const paused = Array.from(downloads.values()).filter(d => d.status === 'paused');
    const queued = Array.from(downloads.values()).filter(d => d.status === 'queued');
    const completed = Array.from(downloads.values()).filter(d => d.status === 'completed');
    const failed = Array.from(downloads.values()).filter(d => d.status === 'error');

    lines.push(
      `${chalk.cyan('⬇️ Active')} ${active.length}  ` +
      `${chalk.yellow('⏸ Paused')} ${paused.length}  ` +
      `${chalk.gray('⏳ Queued')} ${queued.length}  ` +
      `${chalk.green('✅ Completed')} ${completed.length}  ` +
      `${chalk.red('❌ Failed')} ${failed.length}  ` +
      `${chalk.white('📦 Total')} ${downloads.size}`
    );

    const totalSpeed = active.reduce((s, d) => s + d.speed, 0);
    graphHistory.push(totalSpeed);
    if (graphHistory.length > GRAPH_BARS) graphHistory.shift();
    const maxSpeed = Math.max(...graphHistory, 1);

    lines.push(chalk.bold(`⚡ ${formatSpeed(totalSpeed)}`) + ' ' +
      graphHistory
        .map((s) => {
          const h = Math.round((s / maxSpeed) * 6);
          const levels = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
          return levels[h];
        })
        .join('')
    );

    if (downloads.size === 0) {
      lines.push(chalk.gray('No downloads. Type a command below to add one.'));
    } else {
      const all = Array.from(downloads.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      for (const d of all.slice(0, 6)) {
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
      if (all.length > 6) {
        lines.push(chalk.gray(`... and ${all.length - 6} more`));
      }
    }

    return lines.join('\n');
  }

  function render() {
    const height = getTerminalHeight();
    const reserved = 4; // hint line + input box (3 lines)
    const dashboardLines = renderDashboard().split('\n');
    const maxLogRows = Math.max(0, height - dashboardLines.length - reserved);
    const visibleLogs = logs.slice(-maxLogRows);

    const frame: string[] = [];
    frame.push(...dashboardLines);
    frame.push(...visibleLogs);
    // Pad to fill the screen so the input box stays at the bottom
    while (frame.length < height - reserved) frame.push('');
    frame.push(chalk.gray('Type commands below · Ctrl+C to exit'));
    frame.push(drawInputBox());

    console.clear();
    process.stdout.write(frame.map(line => line).join('\n'));
  }

  function shutdown() {
    clearInterval(renderInterval);
    console.clear();
    console.log(chalk.gray('Dashboard closed. Run `kelex repl` for a dedicated command shell.'));
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.exit(0);
  }

  async function runCommand(line: string): Promise<boolean> {
    if (line.trim() === 'clear') {
      logs.length = 0;
      return true;
    }

    addLog(`${chalk.gray('›')} ${line}`);

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

    if (chunks.length) {
      addLog(chunks.join(''));
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
          render();
        } else if (code === '\x1b[B') { // down
          if (historyIndex > 0) {
            historyIndex--;
            input = history[history.length - 1 - historyIndex];
          } else if (historyIndex === 0) {
            historyIndex = -1;
            input = savedInput;
          }
          render();
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
        render();
        continue;
      }

      if (key === '\x7f' || key === '\b') {
        input = input.slice(0, -1);
        render();
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
        render();
        continue;
      }

      if (key === '\x0c') {
        logs.length = 0;
        render();
        continue;
      }

      if (key >= ' ' && key <= '~') {
        input += key;
        render();
        continue;
      }
    }
  }

  // Initial render
  render();

  // Keep the dashboard visually live even when no websocket events arrive.
  const renderInterval = setInterval(() => render(), 1000);

  const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws/progress';
  const ws = new WebSocket(wsUrl);

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'download.progress') {
        const d: Download = msg.data;
        downloads.set(d.id, d);
        render();
      }
    } catch {
      // ignore malformed
    }
  });

  ws.on('error', (err: Error) => {
    addLog(chalk.red(`WebSocket error: ${err.message}`));
    render();
  });

  ws.on('close', () => {
    addLog(chalk.gray('Disconnected from backend.'));
    render();
  });

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (data: string) => {
    handleInput(data).catch(() => {});
  });

  process.stdout.on('resize', () => {
    render();
  });

  return new Promise(() => {});
}
