let debugMode = false;

export function setDebug(enabled: boolean): void {
  debugMode = enabled;
}

export function isDebug(): boolean {
  return debugMode;
}

export function debug(...args: unknown[]): void {
  if (debugMode) {
    console.error('[debug]', ...args);
  }
}
