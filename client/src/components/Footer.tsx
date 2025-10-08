import { PageType } from '../types/navigation';

interface FooterProps {
    onNavigate?: (page: PageType) => void;
}

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