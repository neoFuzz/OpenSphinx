/**
 * Shared logger for the OpenSphinx game engine.
 *
 * Uses `console.*` throughout — compatible with both the Cloudflare Workers
 * runtime and Node.js without requiring any external dependencies.
 *
 * The Winston-based logger previously used by the legacy `server/` package
 * has been removed since that package was archived after the Cloudflare
 * Workers migration.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArg = any;

/** Minimal logger interface used by the shared game engine. */
export interface AppLogger {
  info(msg: string, ...args: AnyArg[]): void;
  warn(msg: string, ...args: AnyArg[]): void;
  error(msg: string, ...args: AnyArg[]): void;
  debug(msg: string, ...args: AnyArg[]): void;
}

function fmt(level: string, msg: string, args: unknown[]): string {
  const ts = new Date().toISOString();
  const extra = args.length
    ? ' ' + args
        .map(a => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)))
        .join(' ')
    : '';
  return `[${ts}] [${level}] ${msg}${extra}`;
}

export const logger: AppLogger = {
  info:  (msg: string, ...args: AnyArg[]) => console.log(fmt('INFO',  msg, args)),
  warn:  (msg: string, ...args: AnyArg[]) => console.warn(fmt('WARN',  msg, args)),
  error: (msg: string, ...args: AnyArg[]) => console.error(fmt('ERROR', msg, args)),
  debug: (msg: string, ...args: AnyArg[]) => console.debug(fmt('DEBUG', msg, args)),
};