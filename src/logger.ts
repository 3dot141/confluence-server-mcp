// src/logger.ts

let _debug = false;

export function setDebug(enabled: boolean): void {
  _debug = enabled;
}

export function isDebug(): boolean {
  return _debug;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (_debug) console.error(`[DEBUG] ${message}`, ...args);
  },
  info(message: string, ...args: unknown[]): void {
    if (_debug) console.error(`[INFO] ${message}`, ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    console.error(`[WARN] ${message}`, ...args);
  },
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  },
};
