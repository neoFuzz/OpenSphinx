/**
 * Vite environment type declarations
 * 
 * Provides TypeScript support for Vite's import.meta.env
 * and defines available environment variables.
 */

/// <reference types="vite/client" />

/**
 * Environment variables available in import.meta.env
 */
interface ImportMetaEnv {
  /** Server URL for API and Socket.IO connections */
  readonly VITE_SERVER_URL?: string;
  /** Site URL for external links */
  readonly VITE_SITE_URL?: string;
}

/**
 * Extended ImportMeta interface with environment variables
 */
interface ImportMeta {
  /** Environment variables object */
  readonly env: ImportMetaEnv;
}