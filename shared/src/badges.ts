import { makeBadge } from 'badge-maker';

export interface Badge {
  label: string;
  message: string;
  color: string;
  url: string;
}

export function getBadges(serverUrl?: string, clientUrl?: string): Badge[] {
  return [
    {
      label: 'Server (Render.io)',
      message: 'Render.io',
      color: '#46E3B7',
      url: serverUrl || process.env.SERVER_URL || 'https://opensphinx.onrender.com'
    },
    {
      label: 'Client (Cloudflare Pages)',
      message: 'Cloudflare Pages',
      color: '#F38020',
      url: clientUrl || process.env.CLIENT_URLS || 'https://opensphinx.pages.dev'
    }
  ];
}

export function generateBadgeSvg(badge: Omit<Badge, 'url'>): string {
  return makeBadge({
    label: badge.label,
    message: badge.message,
    color: badge.color
  });
}
