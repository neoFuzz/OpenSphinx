# Internationalization (i18n)

## Setup Complete ✓

The i18n system is configured and ready to use.

## Usage

### In Components
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();
  
  return (
    <div>
      <h1>{t('app_title')}</h1>
      <button onClick={() => i18n.changeLanguage('es')}>
        Español
      </button>
    </div>
  );
}
```

### With Variables
```tsx
// In translation file: "player_turn": "{{player}}'s Turn"
{t('player_turn', { player: 'Silver' })}
// Output: "Silver's Turn"
```

### Language Switcher
Import the LanguageSwitcher component:
```tsx
import LanguageSwitcher from './components/LanguageSwitcher';

<LanguageSwitcher />
```

## Adding New Languages

1. Create new JSON file: `src/locales/fr.json`
2. Copy structure from `en.json`
3. Translate all strings
4. Import in `src/i18n.ts`:
```ts
import fr from './locales/fr.json';

resources: {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr }
}
```
5. Add to LanguageSwitcher:
```ts
{ code: 'fr', name: 'Français', flag: '🇫🇷' }
```

## Current Languages
- 🇬🇧 English (en) - Default
- 🇪🇸 Spanish (es)

## Language Detection
The system automatically detects user language from:
1. localStorage (saved preference)
2. Browser language
3. Falls back to English

## Files
- `src/i18n.ts` - Configuration
- `src/locales/*.json` - Translation files
- `src/components/LanguageSwitcher.tsx` - UI component
- `src/components/TranslationExample.tsx` - Usage example
