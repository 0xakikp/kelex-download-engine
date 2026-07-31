import WebSocket from 'ws';
import chalk from 'chalk';
import { API_BASE, api, apiPost } from '../client.js';
import { box, statusColors, statusEmojis, formatSize, formatSpeed, progressBar, gradientText } from '../styles.js';
import type { Download } from '../types.js';

const GRAPH_BARS = 40;

/**
 * Persistent Live Status Dashboard.
 * Stays on screen with real-time progress updates.
 * On-screen hotkeys let the user interact without leaving the view.
 */
export async function showStatusLive(): Promise<void> {
  const [initial, config, sysInfo] = await Promise.all([
    api('/api/v1/downloads'),
    api('/api/v1/system/config'),
    api('/api/v1/system/info').catch(() => null),
  ]);

  const downloads = new Map<string, Download>();
  for (const d of initial.downloads || []) {
    downloads.set(d.id, d);
  }

  const graphHistory: number[] = [];
  let mode: 'dashboard' | 'input' = 'dashboard';
  let inputPrompt = '';
  let inputBuffer = '';
  let inputResolve: ((val: string) => void) | null = null;

  const _origStdoutWrite = process.stdout.write.bind(process.stdout);

  function rawWrite(str: string): void {
    _origStdoutWrite(str);
  }

  function getTermWidth(): number {
    return process.stdout.columns || 80;
  }



  function render() {
    const w = getTermWidth();
    const lines: string[] = [];

    // ── Header ──
    lines.push('');
    lines.push(gradientText('  KELEX LIVE STATUS DASHBOARD') + chalk.gray(`  ·  ${new Date().toLocaleTimeString()}`));
    lines.push(chalk.gray(`  📁 ${config.downloadDir}  ·  Backend: http://${config.host}:${config.port}`));

    // ── System & Storage ──
    const all = Array.from(downloads.values());
    const active = all.filter(d => d.status === 'downloading');
    const paused = all.filter(d => d.status === 'paused');
    const queued = all.filter(d => d.status === 'queued');
    const completed = all.filter(d => d.status === 'completed');
    const failed = all.filter(d => d.status === 'error');
    const totalSpeed = active.reduce((s, d) => s + d.speed, 0);

    graphHistory.push(totalSpeed);
    if (graphHistory.length > GRAPH_BARS) graphHistory.shift();
    const maxSpeed = Math.max(...graphHistory, 1);

    const sparkline = graphHistory
      .map(s => {
        const h = Math.round((s / maxSpeed) * 6);
        return ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'][h];
      })
      .join('');

    lines.push('');
    lines.push(
      `  ${chalk.cyan('⬇ Active')} ${chalk.bold(String(active.length))}  ` +
      `${chalk.yellow('⏸ Paused')} ${chalk.bold(String(paused.length))}  ` +
      `${chalk.gray('⏳ Queued')} ${chalk.bold(String(queued.length))}  ` +
      `${chalk.green('✅ Done')} ${chalk.bold(String(completed.length))}  ` +
      `${chalk.red('❌ Failed')} ${chalk.bold(String(failed.length))}  ` +
      `${chalk.white('📦 Total')} ${chalk.bold(String(all.length))}`
    );

    lines.push(`  ${chalk.bold.cyan('⚡')} ${chalk.bold(formatSpeed(totalSpeed))}  ${chalk.cyan(sparkline)}`);

    if (sysInfo && sysInfo.disk) {
      lines.push(`  ${chalk.gray('💾 Storage:')} ${formatSize(sysInfo.disk.free)} free / ${formatSize(sysInfo.disk.total)}`);
    }

    // ── Separator ──
    lines.push('');
    lines.push(chalk.gray('─'.repeat(Math.min(w - 2, 90))));

    // Helper for category badge
    const getBadge = (d: Download) => {
      const cat = (d.category || 'General').toUpperCase();
      if (cat === 'VIDEOS') return chalk.cyan(`[${cat}]`);
      if (cat === 'AUDIO') return chalk.magenta(`[${cat}]`);
      if (cat === 'DOCUMENTS') return chalk.yellow(`[${cat}]`);
      if (cat === 'TORRENTS') return chalk.blue(`[${cat}]`);
      return chalk.gray(`[${cat}]`);
    };

    // ── Active Downloads ──
    if (active.length > 0 || paused.length > 0 || queued.length > 0) {
      lines.push(chalk.bold.cyan('  ⬇ Active Downloads'));
      for (const d of [...active, ...paused, ...queued]) {
        const color = statusColors[d.status] || chalk.white;
        const emoji = statusEmojis[d.status] || '•';
        const peerInfo =
          d.seeds != null || d.leechers != null
            ? ` · 🌱${d.seeds ?? '-'}/🧲${d.leechers ?? '-'}`
            : '';
        const etaStr = d.eta && d.eta !== 'Queued' ? ` · ⏱️ ${d.eta}` : '';
        lines.push(`  ${emoji} ${chalk.white(d.filename || d.url)} ${getBadge(d)}`);
        lines.push(`    ${progressBar(d.progress, 22)} ${chalk.bold(`${d.progress.toFixed(1)}%`)}  ${formatSpeed(d.speed)}  ${formatSize(d.downloaded || 0)}/${formatSize(d.size)}`);
        lines.push(`    ${color(d.status.toUpperCase())} · ${chalk.gray(d.id.slice(0, 8))}${peerInfo}${etaStr}`);
      }
      lines.push('');
    }

    // ── Completed Downloads ──
    if (completed.length > 0) {
      lines.push(chalk.bold.green('  ✅ Completed'));
      for (const d of completed.slice(-5)) { // show latest 5
        const peerInfo =
          d.seeds != null || d.leechers != null
            ? ` · 🌱${d.seeds ?? '-'}/🧲${d.leechers ?? '-'}`
            : '';
        lines.push(`  ✅ ${chalk.white(d.filename || d.url)} ${getBadge(d)}`);
        lines.push(`    ${progressBar(100, 22)} ${chalk.bold('100.0%')}  ${formatSize(d.size)}${peerInfo}`);
        if (d.outputPath) {
          lines.push(`    💾 ${chalk.gray(d.outputPath)}`);
        }
      }
      if (completed.length > 5) {
        lines.push(chalk.gray(`    ... and ${completed.length - 5} more completed downloads`));
      }
      lines.push('');
    }

    // ── Failed Downloads ──
    if (failed.length > 0) {
      lines.push(chalk.bold.red('  ❌ Failed'));
      for (const d of failed.slice(-3)) {
        lines.push(`  ❌ ${chalk.white(d.filename || d.url)} ${getBadge(d)}`);
        lines.push(`    ${chalk.red('FAILED')} · ${chalk.gray(d.id.slice(0, 8))} · ⚠️ ${chalk.red(d.error || 'unknown')}`);
      }
      lines.push('');
    }

    if (all.length === 0) {
      lines.push('');
      lines.push(chalk.gray('  No downloads yet. Press [a] to add one!'));
      lines.push('');
    }

    // ── On-screen action bar ──
    lines.push(chalk.gray('─'.repeat(Math.min(w - 2, 90))));

    if (mode === 'input') {
      lines.push(`  ${chalk.yellow(inputPrompt)} ${chalk.white(inputBuffer)}█`);
      lines.push(chalk.gray('  Press Enter to submit · Esc to cancel'));
    } else {
      lines.push(
        `  ${chalk.bgCyan.black(' a ')} ${chalk.white('Add Download')}  ` +
        `${chalk.bgYellow.black(' y ')} ${chalk.white('YouTube')}  ` +
        `${chalk.bgMagenta.black(' t ')} ${chalk.white('Torrent')}  ` +
        `${chalk.bgGreen.black(' p ')} ${chalk.white('Pause/Resume')}  ` +
        `${chalk.bgRed.black(' r ')} ${chalk.white('Retry Failed')}  ` +
        `${chalk.bgBlue.black(' q ')} ${chalk.white('Back to Shell')}`
      );
      lines.push(
        chalk.gray('  Press a key to interact · Auto-refreshes every second')
      );
    }

    // ── Render to screen ──
    const maxRows = Math.max(10, (process.stdout.rows || 24) - 1);
    rawWrite('\x1b[?25l');              // hide cursor
    rawWrite('\x1b[H\x1b[2J');          // move to top-left, clear screen
    rawWrite(lines.slice(0, maxRows).join('\r\n') + '\r\n');
    rawWrite('\x1b[?25h');              // show cursor
  }

  // Throttled render helper to prevent flooding stdout on rapid WebSocket updates
  let renderTimeout: ReturnType<typeof setTimeout> | null = null;
  function requestRender() {
    if (renderTimeout) return;
    renderTimeout = setTimeout(() => {
      renderTimeout = null;
      if (mode === 'dashboard' || mode === 'input') {
        render();
      }
    }, 80);
  }

  // ── Input mode helpers ──
  function startInput(prompt: string): Promise<string> {
    mode = 'input';
    inputPrompt = prompt;
    inputBuffer = '';
    render();
    return new Promise<string>((resolve) => {
      inputResolve = resolve;
    });
  }

  function cancelInput() {
    mode = 'dashboard';
    inputResolve = null;
    inputBuffer = '';
    inputPrompt = '';
    render();
  }

  function submitInput() {
    const val = inputBuffer.trim();
    mode = 'dashboard';
    inputBuffer = '';
    inputPrompt = '';
    if (inputResolve) {
      inputResolve(val);
      inputResolve = null;
    }
  }

  // ── Action handlers ──
  async function addDownloadAction() {
    const url = await startInput('Enter URL to download:');
    if (!url) return;
    try {
      await apiPost('/api/v1/downloads', { url });
      // will appear on next refresh
    } catch (err: any) {
      // swallow, will show in UI
    }
  }

  async function youtubeAction() {
    const url = await startInput('Enter YouTube URL:');
    if (!url) return;
    try {
      await apiPost('/api/v1/downloads', { url, type: 'youtube' });
    } catch {
      // swallow
    }
  }

  async function torrentAction() {
    const url = await startInput('Enter magnet link or .torrent URL:');
    if (!url) return;
    try {
      await apiPost('/api/v1/torrents/add', { url });
    } catch {
      // swallow
    }
  }

  async function pauseResumeAction() {
    const id = await startInput('Enter download ID to pause/resume:');
    if (!id) return;
    const d = downloads.get(id) || Array.from(downloads.values()).find(dl => dl.id.startsWith(id));
    if (!d) return;
    try {
      if (d.status === 'downloading') {
        await apiPost(`/api/v1/downloads/${d.id}/pause`, {});
      } else if (d.status === 'paused') {
        await apiPost(`/api/v1/downloads/${d.id}/resume`, {});
      }
    } catch {
      // swallow
    }
  }

  async function retryFailedAction() {
    const failed = Array.from(downloads.values()).filter(d => d.status === 'error');
    for (const d of failed) {
      try {
        await apiPost(`/api/v1/downloads/${d.id}/retry`, {});
      } catch {
        // swallow
      }
    }
  }

  // ── Setup ──
  const wasRawMode = process.stdin.isRaw;
  if (!wasRawMode) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
  }

  // Enter alternate screen buffer so we don't pollute normal terminal scrollback
  rawWrite('\x1b[?1049h\x1b[H\x1b[2J');

  // Temporarily remove all existing stdin data listeners so we own stdin
  const existingListeners = process.stdin.listeners('data').slice();
  process.stdin.removeAllListeners('data');

  render();

  // Poll backend every second for live data
  const pollInterval = setInterval(async () => {
    try {
      const data = await api('/api/v1/downloads');
      if (data.downloads && Array.isArray(data.downloads)) {
        downloads.clear();
        for (const d of data.downloads) {
          downloads.set(d.id, d);
        }
      }
    } catch {
      // ignore
    }
    requestRender();
  }, 1000);

  // WebSocket for instant updates
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
      // ignore
    }
  });

  ws.on('error', () => {});
  ws.on('close', () => {});

  // ── Keyboard handler ──
  // eslint-disable-next-line prefer-const
  let keyHandler: ((key: string) => void) | null = null;

  function cleanup() {
    clearInterval(pollInterval);
    if (renderTimeout) clearTimeout(renderTimeout);
    try { ws.close(); } catch {}
    
    // Remove our listener
    if (keyHandler) {
      process.stdin.removeListener('data', keyHandler);
    }
    
    // Restore previous stdin listeners
    for (const fn of existingListeners) {
      process.stdin.on('data', fn as (...args: any[]) => void);
    }
    
    if (!wasRawMode) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
    
    // Exit alternate screen buffer and restore cursor
    rawWrite('\x1b[?1049l\x1b[?25h');
  }

  return new Promise<void>((resolve) => {
    async function onKey(key: string) {
      if (mode === 'input') {
        for (let i = 0; i < key.length; i++) {
          const ch = key[i];
          if (ch === '\x1b') {
            // Escape — cancel input
            cancelInput();
            return;
          }
          if (ch === '\r' || ch === '\n') {
            submitInput();
            return;
          }
          if (ch === '\x7f' || ch === '\b') {
            inputBuffer = inputBuffer.slice(0, -1);
            render();
            continue;
          }
          if (ch === '\x03') { // Ctrl+C
            cleanup();
            resolve();
            return;
          }
          if (ch >= ' ' && ch <= '~') {
            inputBuffer += ch;
            render();
          }
        }
        return;
      }

      // Dashboard mode — hotkeys
      const ch = key[0];

      if (ch === 'q' || ch === 'Q' || ch === '\x1b' || ch === '\x03') {
        // q, Esc, or Ctrl+C — exit live status
        cleanup();
        resolve();
        return;
      }

      if (ch === 'a' || ch === 'A') {
        await addDownloadAction();
        return;
      }

      if (ch === 'y' || ch === 'Y') {
        await youtubeAction();
        return;
      }

      if (ch === 't' || ch === 'T') {
        await torrentAction();
        return;
      }

      if (ch === 'p' || ch === 'P') {
        await pauseResumeAction();
        return;
      }

      if (ch === 'r' || ch === 'R') {
        await retryFailedAction();
        return;
      }
    }

    keyHandler = onKey;
    process.stdin.on('data', onKey);
  });
}

/**
 * showStatus — standalone CLI `kelex status` command (WebSocket live view).
 */
export async function showStatus(): Promise<void> {
  return showStatusLive();
}

/**
 * Inline status for use inside the dashboard shell.
 * Prints a one-shot stats summary table + active, completed, and failed downloads.
 */
export async function showStatusInline(): Promise<void> {
  const [data, stats, sysInfo] = await Promise.all([
    api('/api/v1/downloads'),
    api('/api/v1/downloads/stats'),
    api('/api/v1/system/info').catch(() => null),
  ]);
  const downloads: Download[] = data.downloads || [];

  // Stats summary
  const overviewLines = [
    `${chalk.cyan('Active:')}    ${stats.active}    ${chalk.yellow('Paused:')}    ${stats.paused}    ${chalk.gray('Queued:')}    ${stats.queued}`,
    `${chalk.green('Completed:')} ${stats.completed}    ${chalk.red('Failed:')}     ${stats.failed}    ${chalk.white('Total:')}     ${stats.total}`,
    '',
    `${chalk.bold.cyan('⚡ Total Bandwidth Speed:')} ${chalk.bold(formatSpeed(stats.totalSpeed))}`,
  ];

  if (sysInfo && sysInfo.disk) {
    overviewLines.push(
      `${chalk.gray('💾 Storage Free:')} ${formatSize(sysInfo.disk.free)} / ${formatSize(sysInfo.disk.total)}`
    );
  }

  box('Engine Overview & System', overviewLines.join('\n'));

  if (downloads.length === 0) {
    console.log();
    console.log(chalk.gray('No downloads in queue. Add one with: kelex download <url>'));
    return;
  }

  // Helper for category badge
  const getBadge = (d: Download) => {
    const cat = (d.category || 'General').toUpperCase();
    if (cat === 'VIDEOS') return chalk.cyan(`[${cat}]`);
    if (cat === 'AUDIO') return chalk.magenta(`[${cat}]`);
    if (cat === 'DOCUMENTS') return chalk.yellow(`[${cat}]`);
    if (cat === 'TORRENTS') return chalk.blue(`[${cat}]`);
    return chalk.gray(`[${cat}]`);
  };

  // Active / Downloading / Paused / Queued downloads
  const active = downloads.filter(d => d.status === 'downloading' || d.status === 'paused' || d.status === 'queued');
  if (active.length > 0) {
    console.log();
    console.log(chalk.bold.cyan('Active Downloads'));
    for (const d of active) {
      const color = statusColors[d.status] || chalk.white;
      const emoji = statusEmojis[d.status] || '•';
      const peerInfo =
        d.seeds != null || d.leechers != null
          ? ` · 🌱 ${d.seeds ?? '-'} / 🧲 ${d.leechers ?? '-'}`
          : '';
      const etaStr = d.eta ? ` · ⏱️ ${d.eta}` : '';
      console.log(`${emoji} ${chalk.white(d.filename || d.url)} ${getBadge(d)}`);
      console.log(`   ${progressBar(d.progress, 20)} ${chalk.bold(`${d.progress.toFixed(1)}%`)}  ${formatSpeed(d.speed)}  ${formatSize(d.size)}`);
      console.log(`   ${color(d.status.toUpperCase())} · ${chalk.gray(d.id.slice(0, 8))}${peerInfo}${etaStr}`);
      if (d.outputPath) {
        console.log(`   💾 ${chalk.gray(d.outputPath)}`);
      }
    }
  }

  // Completed & Seeding downloads
  const completed = downloads.filter(d => d.status === 'completed');
  if (completed.length > 0) {
    console.log();
    console.log(chalk.bold.green('Completed Downloads'));
    for (const d of completed) {
      const peerInfo =
        d.seeds != null || d.leechers != null
          ? ` · 🌱 Seeds: ${d.seeds ?? '-'} / 🧲 Leechers: ${d.leechers ?? '-'}`
          : '';
      console.log(`${statusEmojis.completed} ${chalk.white(d.filename || d.url)} ${getBadge(d)}`);
      console.log(`   ${progressBar(100, 20)} ${chalk.bold('100.0%')}  ${formatSize(d.size)}`);
      console.log(`   ${chalk.green('COMPLETED')} · ${chalk.gray(d.id.slice(0, 8))}${peerInfo}`);
      if (d.outputPath) {
        console.log(`   💾 ${chalk.gray(d.outputPath)}`);
      }
    }
  }

  // Failed downloads
  const errors = downloads.filter(d => d.status === 'error');
  if (errors.length > 0) {
    console.log();
    console.log(chalk.bold.red('Failed Downloads'));
    for (const d of errors) {
      console.log(`${chalk.red('❌')} ${chalk.white(d.filename || d.url)} ${getBadge(d)}`);
      console.log(`   ${chalk.red('FAILED')} · ${chalk.gray(d.id.slice(0, 8))} · ⚠️ ${chalk.red(d.error || 'unknown error')}`);
    }
  }
}
