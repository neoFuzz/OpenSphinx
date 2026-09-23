/**
 * Logger that works in both Node.js and Cloudflare Workers environments.
 *
 * In Node.js (server package): uses Winston for structured logging.
 * In CF Workers (server-worker): the `WORKERS_RUNTIME` global is `true`
 * (set via wrangler.toml [define]), so the Winston branch is dead-code
 * eliminated by esbuild at build time.
 */

/* global WORKERS_RUNTIME */
// When bundled for CF Workers, wrangler.toml [define] replaces
// `WORKERS_RUNTIME` with `true`, causing esbuild to tree-shake Winston out.
// In Node.js, the variable is undefined (falsy), so Winston is used normally.
declare const WORKERS_RUNTIME: boolean | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _isWorkers = typeof WORKERS_RUNTIME !== 'undefined' && (WORKERS_RUNTIME as any) === true;

export interface AppLogger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info(msg: string, ...args: any[]): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(msg: string, ...args: any[]): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(msg: string, ...args: any[]): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug(msg: string, ...args: any[]): void;
}

function buildConsoleLogger(): AppLogger {
  const fmt = (level: string, msg: string, args: unknown[]) => {
    const ts = new Date().toISOString();
    const extra = args.length
      ? ' ' + args.map(a => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ')
      : '';
    return `[${ts}] [${level}] ${msg}${extra}`;
  };
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info:  (msg: string, ...args: any[]) => console.log(fmt('INFO', msg, args)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn:  (msg: string, ...args: any[]) => console.warn(fmt('WARN', msg, args)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (msg: string, ...args: any[]) => console.error(fmt('ERROR', msg, args)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug: (msg: string, ...args: any[]) => console.debug(fmt('DEBUG', msg, args)),
  };
}

function buildWinstonLogger(): AppLogger {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const winston = require('winston') as typeof import('winston');
  const wl = winston.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      new winston.transports.File({ filename: 'app.log' }),
    ],
  });
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info:  (msg: string, ...args: any[]) => wl.info(msg, ...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn:  (msg: string, ...args: any[]) => wl.warn(msg, ...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (msg: string, ...args: any[]) => wl.error(msg, ...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug: (msg: string, ...args: any[]) => wl.debug(msg, ...args),
  };
}

// This conditional is replaced by esbuild's define when WORKERS_RUNTIME is set to true.
// In the Workers bundle, `_isWorkers` becomes `true`, esbuild removes the Winston branch.
export const logger: AppLogger = _isWorkers ? buildConsoleLogger() : buildWinstonLogger();