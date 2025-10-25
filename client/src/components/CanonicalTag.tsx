import { useEffect } from 'react';

interface CanonicalTagProps {
    path: string;
}

export function CanonicalTag({ path }: CanonicalTagProps) {
    useEffect(() => {
        const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
        if (canonical) {
            canonical.href = `https://opensphinx.online${path}`;
        }
    }, [path]);

    return null;
}
