let audioContext: AudioContext | null = null;
let explosionBuffer: AudioBuffer | null = null;

async function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (!explosionBuffer) {
        try {
            const response = await fetch('/sounds/explosion.mp3');
            const arrayBuffer = await response.arrayBuffer();
            explosionBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.warn('Failed to load explosion sound:', error);
        }
    }
}

export function playExplosionSound() {
    if (audioContext && explosionBuffer) {
        const source = audioContext.createBufferSource();
        source.buffer = explosionBuffer;
        source.connect(audioContext.destination);
        source.start();
    }
}

export function showExplosionEffect(x: number, y: number, container: HTMLElement) {
    const img = document.createElement('img');
    img.src = '/explosion.webp';
    img.style.position = 'absolute';
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
    img.style.width = '50px';
    img.style.height = '50px';
    img.style.transform = 'translate(-50%, -50%)';
    img.style.pointerEvents = 'none';
    img.style.zIndex = '1000';
    img.style.opacity = '1';
    img.style.transition = 'opacity 0.5s ease-out';

    container.appendChild(img);

    requestAnimationFrame(() => {
        img.style.opacity = '0';
    });

    setTimeout(() => {
        container.removeChild(img);
    }, 500);
}

// Initialize audio on first user interaction
document.addEventListener('click', initAudio, { once: true });