import { useTranslation } from 'react-i18next';

/**
 * Example component demonstrating i18n usage
 * 
 * Usage patterns:
 * 1. Basic: {t('key')}
 * 2. With variables: {t('key', { variable: value })}
 * 3. Change language: i18n.changeLanguage('es')
 */
export default function TranslationExample() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('app_title')}</h1>
      <button className="btn btn-primary">{t('create_room')}</button>
      <button className="btn btn-secondary">{t('join_room')}</button>
      <p>{t('waiting_for_opponent')}</p>
    </div>
  );
}
