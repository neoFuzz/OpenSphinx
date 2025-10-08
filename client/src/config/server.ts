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

export const SERVER_URL = validateServerUrl(
  import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'
);