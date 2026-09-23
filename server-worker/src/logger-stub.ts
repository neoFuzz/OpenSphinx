/**
 * Cloudflare Workers-compatible logger stub.
 *
 * Wrangler's [alias] in wrangler.toml redirects the shared Winston logger
 * to this file when bundling for the Workers runtime.  Winston and its deps
 * (fs, path, os, zlib, http, events) are not fully available in CF Workers
 * even with nodejs_compat, so we use console.*  instead.
 */

export const logger = {
  info:  (msg: string, meta?: Record<string, unknown>) =>
    console.log(`[INFO] ${msg}`, meta ?? ''),
  warn:  (msg: string, meta?: Record<string, unknown>) =>
    console.warn(`[WARN] ${msg}`, meta ?? ''),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[ERROR] ${msg}`, meta ?? ''),
  debug: (msg: string, meta?: Record<string, unknown>) =>
    console.debug(`[DEBUG] ${msg}`, meta ?? ''),
};