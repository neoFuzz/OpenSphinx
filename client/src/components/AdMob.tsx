import { useEffect, useState } from 'react';
import { MaxAdContentRating, type BannerAdPosition } from '@capacitor-community/admob';
import { AdSense } from './AdSense';

/**
 * Props for the AdMobWrapper component
 */
interface AdMobProps {
  /** AdMob ad unit ID for mobile platforms */
  adUnitId: string;
  /** Google AdSense slot ID for web platforms (optional) */
  adSenseSlot?: string;
  /** Type of ad to display */
  type?: 'banner' | 'interstitial';
}

/**
 * Universal ad component that adapts to platform:
 * - Mobile (Capacitor): Uses AdMob with native rendering
 * - Web: Falls back to Google AdSense
 * 
 * The component automatically detects the platform and initializes the appropriate
 * ad service with family-friendly settings (child-directed, under age consent, G-rated).
 * 
 * @component
 * @example
 * ```tsx
 * // Banner ad with both mobile and web support
 * <AdMobWrapper 
 *   adUnitId="ca-app-pub-xxxxx/xxxxx" 
 *   adSenseSlot="1234567890"
 *   type="banner" 
 * />
 * ```
 * 
 * @remarks
 * Requires `@capacitor-community/admob` package for mobile functionality.
 * Install with: `npm install @capacitor-community/admob`
 * 
 * @param props - Component props
 * @returns React component (null on mobile, AdSense component on web)
 */
export function AdMobWrapper({ adUnitId, adSenseSlot, type = 'banner' }: AdMobProps) {
  /** Tracks whether the app is running on a mobile platform (Capacitor) */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    /**
     * Detects platform and initializes appropriate ad service
     * - Checks for Capacitor runtime to determine mobile platform
     * - Dynamically imports AdMob only when needed (code splitting)
     * - Initializes AdMob with family-friendly settings
     */
    const checkPlatform = async () => {
      // Check if running in Capacitor (mobile) environment
      if ((window as any).Capacitor) {
        setIsMobile(true);
        const { AdMob } = await import('@capacitor-community/admob');

        // Initialize AdMob with family-friendly settings
        await AdMob.initialize({
          initializeForTesting: false, // Set to true for test ads during development
          tagForChildDirectedTreatment: true, // COPPA compliance
          tagForUnderAgeOfConsent: true, // GDPR compliance for users under consent age
          maxAdContentRating: MaxAdContentRating.General, // General audiences only
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

    // Cleanup: Hide banner ad when component unmounts
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

/**
 * Displays a full-screen interstitial ad on mobile platforms.
 * 
 * This function prepares and shows an interstitial ad with family-friendly settings.
 * It only works on Capacitor (mobile) platforms and gracefully fails on web.
 * 
 * @example
 * ```tsx
 * // Show interstitial ad between game levels
 * await showInterstitialAd('ca-app-pub-xxxxx/xxxxx');
 * ```
 * 
 * @param adUnitId - AdMob ad unit ID for the interstitial ad
 * @returns Promise that resolves when ad is shown or rejects on error
 * 
 * @remarks
 * - Only works on mobile (Capacitor) platforms
 * - Automatically handles ad preparation and display
 * - Errors are logged to console but don't throw
 * - Set `isTesting: true` during development to show test ads
 */
export async function showInterstitialAd(adUnitId: string) {
  // Only show interstitial ads on mobile platforms
  if ((window as any).Capacitor) {
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      // Prepare the interstitial ad (loads ad content)
      await AdMob.prepareInterstitial({
        adId: adUnitId,
        isTesting: false, // Set to true for test ads during development
      });
      // Display the prepared interstitial ad
      await AdMob.showInterstitial();
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
    }
  }
}
