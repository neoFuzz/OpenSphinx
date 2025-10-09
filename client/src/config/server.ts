/**
 * Validates and sanitizes a server URL for security
 * 
 * Ensures the URL uses a valid protocol (http/https) and has a safe hostname.
 * Falls back to localhost if validation fails.
 * 
 * @param url - The URL string to validate
 * @returns Validated URL string or localhost fallback
 */
const validateServerUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return url;
    }
    if (parsed.hostname.match(/^[\w.-]+$/)) {
      return url;
    }
    throw new Error('Invalid hostname');
  } catch {
    return 'http://localhost:3001';
  }
};

/**
 * Validated server URL for API requests
 * 
 * Uses VITE_SERVER_URL environment variable if available,
 * otherwise defaults to localhost:3001
 */
export const SERVER_URL = validateServerUrl(
  import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'
);