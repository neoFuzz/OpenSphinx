import { useTranslation } from 'react-i18next';
import { PageType } from '../types/navigation';

/**
 * Props for the Footer component
 */
interface FooterProps {
    /** Optional callback function to handle navigation to different pages */
    onNavigate?: (page: PageType) => void;
}

/**
 * Footer component that displays copyright information and navigation links
 * @param props - The component props
 * @returns JSX element representing the footer
 */
export function Footer({ onNavigate }: FooterProps) {
    const { t } = useTranslation();
    const baseUrl = import.meta.env.VITE_SITE_URL || 'https://opensphinx.online';
    return (
        <footer className="bg-dark text-light py-3 mt-auto">
            <div className="container-fluid">
                <div className="row align-items-center">
                    <div className="col-md-6">
                        <span className="text-secondary">{t('copyright')}</span>
                    </div>
                    <div className="col-md-6 text-md-end">
                        <a href="https://github.com/neofuzz/OpenSphinx" className="text-light me-3" target="_blank" rel="noopener noreferrer">
                            GitHub
                        </a>
                        <a href="https://discord.gg/8eYTA7gkQV" className="text-light me-3" target="_blank" rel="noopener noreferrer">
                            Discord
                        </a>
                        <a href={`${baseUrl}/rules`} className="text-light me-3" onClick={(e) => { e.preventDefault(); onNavigate?.('rules'); }}>{t('rules')}</a>
                        <a href={`${baseUrl}/terms`} className="text-light me-3" onClick={(e) => { e.preventDefault(); onNavigate?.('terms'); }}>{t('terms')}</a>
                        <a href={`${baseUrl}/privacy`} className="text-light me-3" onClick={(e) => { e.preventDefault(); onNavigate?.('privacy'); }}>{t('privacy')}</a>
                        <a href={`${baseUrl}/about`} className="text-light" onClick={(e) => { e.preventDefault(); onNavigate?.('about'); }}>{t('about')}</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}