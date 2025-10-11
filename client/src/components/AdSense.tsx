import { useEffect } from 'react';

interface AdSenseProps {
  slot: string;
  format?: string;
  responsive?: boolean;
  style?: React.CSSProperties;
}

/**
 * Google AdSense component for displaying ads
 * 
 * @param slot - AdSense ad slot ID
 * @param format - Ad format (auto, rectangle, etc.)
 * @param responsive - Whether ad should be responsive
 * @param style - Custom styles for the ad container
 */
export function AdSense({ slot, format = 'auto', responsive = true, style }: AdSenseProps) {
  useEffect(() => {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', ...style }}
      data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive.toString()}
    />
  );
}
