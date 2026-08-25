/**
 * Structured logger for the mobile app. Emits a single JSON line per event so
 * device logs can be shipped to any collector. Never pass tokens, passwords or
 * authorization headers into the context object.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const MIN_LEVEL: LogLevel = __DEV__ ? 'debug' : 'info';

function emit(level: LogLevel, module: string, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    module,
    message,
    ...context,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function createLogger(module: string): {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
} {
  return {
    debug: (message, context) => emit('debug', module, message, context),
    info: (message, context) => emit('info', module, message, context),
    warn: (message, context) => emit('warn', module, message, context),
    error: (message, context) => emit('error', module, message, context),
  };
}
