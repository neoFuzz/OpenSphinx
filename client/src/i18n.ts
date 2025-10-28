/**
 * i18n configuration for internationalization support.
 * 
 * Configures i18next with:
 * - Language detection from localStorage and browser settings
 * - Support for English, Spanish, Japanese, and Vietnamese
 * - English as fallback language
 * - React integration via react-i18next
 * 
 * @module i18n
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import jp from './locales/jp.json';
import vn from './locales/vn.json';

i18n
  // Detect user language from browser/localStorage
  .use(LanguageDetector)
  // Enable React integration
  .use(initReactI18next)
  .init({
    // Translation resources for each supported language
    resources: {
      en: { translation: en },
      es: { translation: es },
      jp: { translation: jp },
      vn: { translation: vn }
    },
    // Default language when user's language is not available
    fallbackLng: 'en',
    // React already escapes values, disable double-escaping
    interpolation: {
      escapeValue: false
    },
    // Language detection configuration
    detection: {
      // Check localStorage first, then browser language
      order: ['localStorage', 'navigator'],
      // Persist selected language in localStorage
      caches: ['localStorage']
    }
  });

/**
 * Configured i18next instance
 * @type {import('i18next').i18n}
 */
export default i18n;
