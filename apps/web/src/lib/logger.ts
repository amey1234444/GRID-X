/**
 * Structured logger for the web app (server components, server actions and
 * client components alike). Emits one JSON line per event so both the browser
 * console and the Next.js server output stay machine-parseable. Never pass
 * tokens, passwords or authorization headers into the context object.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function emit(level: LogLevel, module: string, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    module,
    message,
    ...context,
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

export function createLogger(module: string): Logger {
  return {
    debug: (message, context) => emit('debug', module, message, context),
    info: (message, context) => emit('info', module, message, context),
    warn: (message, context) => emit('warn', module, message, context),
    error: (message, context) => emit('error', module, message, context),
  };
}

export function newRequestId(): string {
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
