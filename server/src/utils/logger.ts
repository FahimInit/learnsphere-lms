import { env } from '../config/env';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const metaPart = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaPart}`;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    if (env.NODE_ENV === 'test') return;
    console.log(formatLog('INFO', message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    if (env.NODE_ENV === 'test') return;
    console.warn(formatLog('WARN', message, meta));
  },
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(formatLog('ERROR', message, meta));
  },
  debug(message: string, meta?: Record<string, unknown>): void {
    if (env.NODE_ENV !== 'development') return;
    console.debug(formatLog('DEBUG', message, meta));
  },
};
