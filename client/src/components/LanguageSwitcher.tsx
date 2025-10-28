import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { code } from 'three/tsl';

/**
 * Language configuration object
 */
interface Language {
  /** ISO 639-1 language code */
  code: string;
  /** Display name of the language */
  name: string;
  /** Flag emoji representing the language/region */
  emoji: string;
}

/**
 * Available languages for the application
 */
const languages: Language[] = [
  { code: 'en', name: 'English', emoji: '\u{1F1EC}\u{1F1E7}' },   // GB
  { code: 'es', name: 'Español', emoji: '\u{1F1EA}\u{1F1F8}' },   // ES
  { code: 'jp', name: '日本語', emoji: '\u{1F1EF}\u{1F1F5}' },    // JP
  { code: 'vn', name: 'Tiếng Việt', emoji: '\u{1F1FB}\u{1F1F3}' } // VN
];

/**
 * Language switcher dropdown component.
 * 
 * Displays a dropdown menu allowing users to switch between available languages.
 * Shows the current language's flag emoji and updates i18n when a language is selected.
 * 
 * @component
 * @returns React component with language selection dropdown
 * 
 * @example
 * ```tsx
 * <LanguageSwitcher />
 * ```
 */
export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  /** Controls dropdown visibility */
  const [isOpen, setIsOpen] = useState(false);
  /** Currently selected language object */
  const currentLang = languages.find(lang => lang.code === i18n.language);

  return (
    <div className="dropdown" style={{ position: 'relative' }}>
      <button
        className="btn btn-sm btn-outline-secondary"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: '#333', height: '100%', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
      >
        <span style={{ fontFamily: 'OpenMoji' }}>{currentLang ? currentLang.emoji : '\u{1F310}'}</span>
        <span style={{ fontSize: '0.6rem' }}>▼</span>
      </button>
      {isOpen && (
        <ul className="dropdown-menu show" style={{ position: 'absolute', top: '100%', right: 0 }}>
          {languages.map(lang => (
            <li key={lang.code}>
              <button
                className={`dropdown-item ${i18n.language === lang.code ? 'active' : ''}`}
                onClick={() => {
                  i18n.changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span style={{ fontFamily: 'OpenMoji' }}>{lang.emoji}</span>
                {lang.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
