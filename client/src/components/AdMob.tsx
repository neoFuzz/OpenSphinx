import { useEffect, useState } from 'react';
import type { BannerAdPosition } from '@capacitor-community/admob';
import { AdSense } from './AdSense';

interface AdMobProps {
  adUnitId: string;
  adSenseSlot?: string;
  type?: 'banner' | 'interstitial';
}

/**
 * Universal ad component - uses AdMob on mobile, AdSense on web
 * Install for mobile: npm install @capacitor-community/admob
 */
export function AdMobWrapper({ adUnitId, adSenseSlot, type = 'banner' }: AdMobProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkPlatform = async () => {
      if ((window as any).Capacitor) {
        setIsMobile(true);
        const { AdMob } = await import('@capacitor-community/admob');
        
        await AdMob.initialize({
          initializeForTesting: false,
        });

        if (type === 'banner') {
          await AdMob.showBanner({
            adId: adUnitId,
            position: 'BOTTOM_CENTER' as BannerAdPosition,
          });
        }
      }
    };
    
    checkPlatform().catch(console.error);

    return () => {
      if (isMobile && (window as any).Capacitor) {
        import('@capacitor-community/admob').then(({ AdMob }) => {
          AdMob.hideBanner().catch(console.error);
        });
      }
    };
  }, [adUnitId, type, isMobile]);

  // On web, use AdSense
  if (!isMobile && adSenseSlot) {
    return <AdSense slot={adSenseSlot} />;
  }

  // On mobile, AdMob renders natively (no DOM element)
  return null;
}
