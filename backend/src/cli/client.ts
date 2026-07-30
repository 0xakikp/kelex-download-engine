import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ora from 'ora';
import { debug, isDebug } from './debug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BACKEND_ROOT = resolve(__dirname, '..', '..');

const API_PORT = Number(process.env.KELEX_PORT) || 3001;
const API_HOST = process.env.KELEX_HOST || '127.0.0.1';
export const API_BASE = `http://${API_HOST}:${API_PORT}`;
const PID_FILE = resolve(BACKEND_ROOT, '.kelex-backend.pid');

let backendProcess: ChildProcess | null = null;

function findBackendEntry(): [string, string[]] | null {
  const dist = resolve(BACKEND_ROOT, 'dist', 'index.js');
  if (existsSync(dist)) {
    return ['node', [dist]];
  }

  const tsx = resolve(BACKEND_ROOT, 'node_modules', '.bin', 'tsx');
  const src = resolve(BACKEND_ROOT, 'src', 'index.ts');
  if (existsSync(tsx) && existsSync(src)) {
    return [tsx, [src]];
  }

  return null;
}

async function waitForBackend(timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(500) });
      if (res.ok) return true;
    } catch (err) {
      debug('health check failed:', err instanceof Error ? err.message : err);
    }
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}

export async function ensureBackend(): Promise<void> {
  if (await waitForBackend(1000)) {
    debug('backend already running at', API_BASE);
    return;
  }

  const entry = findBackendEntry();
  if (!entry) {
    throw new Error('Could not find backend entry point. Run from the backend directory.');
  }

  const spinner = ora('Starting Kelex backend...').start();
  const [cmd, args] = entry;
  debug('spawning backend:', cmd, args.join(' '));

  backendProcess = spawn(cmd, args, {
    cwd: BACKEND_ROOT,
    stdio: isDebug() ? 'inherit' : 'ignore',
    detached: true,
    env: { ...process.env, PORT: String(API_PORT), HOST: API_HOST },
  });

  if (backendProcess.pid) {
    writeFileSync(PID_FILE, String(backendProcess.pid));
  }

  backendProcess.unref();

  const ready = await waitForBackend(30000);
  if (!ready) {
    spinner.fail('Backend failed to start');
    throw new Error('Backend failed to start in time. Run with --debug to see logs.');
  }
  spinner.succeed(`Backend ready at ${API_BASE}`);
}

export function stopBackend(): void {
  if (backendProcess && !backendProcess.killed) {
    try {
      backendProcess.kill('SIGTERM');
    } catch { /* ignore */ }
  }

  if (existsSync(PID_FILE)) {
    try {
      const pid = Number(readFileSync(PID_FILE, 'utf8').trim());
      if (pid) {
        process.kill(pid, 'SIGTERM');
      }
    } catch { /* ignore */ }
    try {
      unlinkSync(PID_FILE);
    } catch { /* ignore */ }
  }
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return JSON.stringify(err);
}

export async function api(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE}${path}`;
  debug(`${options.method || 'GET'} ${url}`);
  if (options.body) debug('body:', options.body);

  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err) {
    debug('fetch error:', err);
    throw new Error(`Cannot reach backend at ${API_BASE}: ${extractErrorMessage(err)}`);
  }

  const text = await res.text();
  debug(`response ${res.status}:`, text.slice(0, 500));

  if (!res.ok) {
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.message || json.error || JSON.stringify(json);
    } catch {
      // keep raw text
    }
    throw new Error(`HTTP ${res.status}: ${message}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

export async function apiPost(path: string, body?: unknown): Promise<any> {
  return api(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete(path: string): Promise<any> {
  return api(path, { method: 'DELETE' });
}
