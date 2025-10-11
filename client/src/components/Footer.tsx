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
    return (
        <footer className="bg-dark text-light py-3 mt-auto">
            <div className="container-fluid">
                <div className="row align-items-center">
                    <div className="col-md-6">
                        <span className="text-secondary">© 2025 OpenSphinx - Open Source Laser Chess</span>
                    </div>
                    <div className="col-md-6 text-md-end">
                        <a href="https://github.com/neofuzz/OpenSphinx" className="text-light me-3" target="_blank" rel="noopener noreferrer">
                            GitHub
                        </a>
                        <a href="https://discord.gg/8eYTA7gkQV" className="text-light me-3" target="_blank" rel="noopener noreferrer">
                            Discord
                        </a>
                        <a href="#" className="text-light me-3" onClick={(e) => { e.preventDefault(); onNavigate?.('rules'); }}>Rules</a>
                        <a href="#" className="text-light me-3" onClick={(e) => { e.preventDefault(); onNavigate?.('terms'); }}>Terms of Service</a>
                        <a href="#" className="text-light me-3">Privacy Policy</a>
                        <a href="#" className="text-light" onClick={(e) => { e.preventDefault(); onNavigate?.('about'); }}>About</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}