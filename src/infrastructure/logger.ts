// src/infrastructure/logger.ts

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

class ConsoleLogger implements Logger {
  info(message: string, ...args: unknown[]): void {
    console.error(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.error(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }
}

export const logger: Logger = new ConsoleLogger();
