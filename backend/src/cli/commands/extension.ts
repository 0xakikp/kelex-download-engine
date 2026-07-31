import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { header, box } from '../styles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getExtensionDir(): string {
  let curr = __dirname;
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(curr, 'extension');
    if (existsSync(resolve(candidate, 'manifest.json'))) {
      return candidate;
    }
    curr = resolve(curr, '..');
  }
  return resolve(__dirname, '..', '..', '..', '..', 'extension');
}

interface BrowserInfo {
  id: string;
  name: string;
  path: string;
}

function findInstalledBrowsers(): BrowserInfo[] {
  const found: BrowserInfo[] = [];

  if (process.platform === 'darwin') {
    const list = [
      { id: 'brave', name: 'Brave Browser', path: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' },
      { id: 'brave', name: 'Brave Browser', path: `${process.env.HOME}/Applications/Brave Browser.app/Contents/MacOS/Brave Browser` },
      { id: 'chrome', name: 'Google Chrome', path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
      { id: 'chrome', name: 'Google Chrome', path: `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` },
      { id: 'edge', name: 'Microsoft Edge', path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' },
    ];
    for (const b of list) {
      if (existsSync(b.path) && !found.some(f => f.path === b.path)) {
        found.push(b);
      }
    }
  } else if (process.platform === 'linux') {
    const list = [
      { id: 'brave', name: 'Brave Browser', bin: 'brave-browser' },
      { id: 'chrome', name: 'Google Chrome', bin: 'google-chrome' },
      { id: 'chromium', name: 'Chromium', bin: 'chromium' },
      { id: 'edge', name: 'Microsoft Edge', bin: 'microsoft-edge' },
    ];
    for (const b of list) {
      try {
        const path = execSync(`which ${b.bin}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        if (path && !found.some(f => f.path === path)) {
          found.push({ id: b.id, name: b.name, path });
        }
      } catch { /* ignore */ }
    }
  }

  return found;
}

function copyToClipboard(text: string): boolean {
  try {
    if (process.platform === 'darwin') {
      execSync(`echo -n ${JSON.stringify(text)} | pbcopy`);
      return true;
    } else if (process.platform === 'linux') {
      execSync(`echo -n ${JSON.stringify(text)} | xclip -selection clipboard || echo -n ${JSON.stringify(text)} | wl-copy`, { stdio: 'ignore' });
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export async function installExtension(targetBrowserName?: string): Promise<void> {
  console.log();
  console.log(header('Kelex Extension Auto-Installer'));
  console.log();

  const EXTENSION_DIR = getExtensionDir();

  if (!existsSync(EXTENSION_DIR)) {
    console.log(chalk.red(`Extension folder not found at: ${EXTENSION_DIR}`));
    return;
  }

  const copied = copyToClipboard(EXTENSION_DIR);
  const installed = findInstalledBrowsers();

  let target = installed[0];
  if (targetBrowserName) {
    const match = installed.find(
      b => b.id.toLowerCase() === targetBrowserName.toLowerCase() ||
           b.name.toLowerCase().includes(targetBrowserName.toLowerCase())
    );
    if (match) {
      target = match;
    } else if (installed.length > 0) {
      console.log(chalk.yellow(`Browser "${targetBrowserName}" not found. Using ${target.name} instead.`));
    }
  }

  if (target) {
    console.log(chalk.green(`✓ Opening ${target.name} at brave://extensions`));
    try {
      const pageUrl = target.id === 'brave' ? 'brave://extensions' : 'chrome://extensions';
      const child = spawn(target.path, [
        `--load-extension=${EXTENSION_DIR}`,
        pageUrl,
      ], { detached: true, stdio: 'ignore' });
      child.unref();
    } catch {
      try {
        execSync(`open ${EXTENSION_DIR}`);
      } catch { /* ignore */ }
    }
  }

  console.log();
  box(
    'Load Extension into Brave / Chrome',
    [
      copied
        ? chalk.green(`✓ Extension path copied to your clipboard!`)
        : chalk.gray(`Path: ${EXTENSION_DIR}`),
      chalk.cyan(EXTENSION_DIR),
      '',
      chalk.bold('In your browser window:'),
      `1. Turn ${chalk.yellow('ON Developer mode')} (toggle in top-right corner of brave://extensions)`,
      `2. Click ${chalk.cyan('Load unpacked')} (button in top-left)`,
      `3. Press ${chalk.bold('Cmd + Shift + G')} in file dialog, paste (${chalk.bold('Cmd+V')}), and click Select`,
    ].join('\n')
  );

  console.log();
}
