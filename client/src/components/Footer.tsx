export function Footer() {
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
                        <a href="#" className="text-light me-3">Rules</a>
                        <a href="#" className="text-light me-3">Terms of Service</a>
                        <a href="#" className="text-light me-3">Privacy Policy</a>
                        <a href="#" className="text-light">About</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}