/** Web Audio API context for playing sounds */
let audioContext: AudioContext | null = null;
/** Decoded audio buffer for explosion sound */
let explosionBuffer: AudioBuffer | null = null;

/**
 * Initialize Web Audio API context and load explosion sound
 * 
 * Creates audio context and loads the explosion.mp3 file into a buffer
 * for efficient playback. Handles browser compatibility and errors gracefully.
 */
async function initAudio() {
    if (!audioContext) {
        console.log("audio started");
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

/**
 * Play explosion sound effect
 * 
 * Initializes audio if needed, resumes suspended audio context,
 * and plays the explosion sound using Web Audio API for low latency.
 * Handles various audio context states and errors gracefully.
 */
export async function playExplosionSound() {
    await initAudio();

    if (audioContext && explosionBuffer) {
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            console.log("audio resumed");
            await audioContext.resume();
        }

        if (audioContext.state === 'running') {
            console.log("audio playing");
            try {
                const source = audioContext.createBufferSource();
                source.buffer = explosionBuffer;
                source.connect(audioContext.destination);
                console.log("audio connected");
                source.start();
            } catch (error) {
                console.warn('Failed to play explosion sound:', error);
            }
        }
    }
}

/**
 * Display visual explosion effect at specified coordinates
 * 
 * Creates CSS particle explosion with multiple particles that fly outward
 * plus a central explosion image that fades out.
 * 
 * @param x - X coordinate in pixels relative to container
 * @param y - Y coordinate in pixels relative to container  
 * @param container - HTML element to append the explosion effect to
 */
export function showExplosionEffect(x: number, y: number, container: HTMLElement) {
    // Create explosion image
    const img = document.createElement('img');
    img.src = '/explosion.webp';
    img.style.position = 'absolute';
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
    img.style.width = '50px';
    img.style.height = '50px';
    img.style.transform = 'translate(-50%, -50%)';
    img.style.pointerEvents = 'none';
    img.style.zIndex = '999';
    img.style.opacity = '1';
    img.style.transition = 'opacity 1s ease-out';

    container.appendChild(img);

    requestAnimationFrame(() => {
        img.style.opacity = '0';
    });

    setTimeout(() => {
        container.removeChild(img);
    }, 1000);

    // Create particles
    const particleCount = 12;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        const angle = (i / particleCount) * Math.PI * 2;
        const velocity = 30 + Math.random() * 20;
        const size = 4 + Math.random() * 4;

        particle.style.position = 'absolute';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.borderRadius = '50%';
        particle.style.background = `hsl(${Math.random() * 60 + 10}, 100%, ${50 + Math.random() * 20}%)`;
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1000';
        particle.style.boxShadow = '0 0 4px rgba(255,100,0,0.8)';

        container.appendChild(particle);

        const startTime = Date.now();
        const duration = 600;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                container.removeChild(particle);
                return;
            }

            const distance = velocity * progress;
            const px = Math.cos(angle) * distance;
            const py = Math.sin(angle) * distance + progress * progress * 20;
            const opacity = 1 - progress;
            const scale = 1 - progress * 0.5;

            particle.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) scale(${scale})`;
            particle.style.opacity = `${opacity}`;

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }
}

/**
 * Initialize audio on first user interaction to comply with browser autoplay policies
 * Uses 'once' option to ensure the listener is removed after first execution
 */
document.addEventListener('click', initAudio, { once: true });