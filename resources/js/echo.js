import Echo from 'laravel-echo';

import Pusher from 'pusher-js';
window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    // Dynamically get the browser's current hostname for local development
    // but allow overriding via standard Reverb env vars for production
    wsHost: import.meta.env.VITE_REVERB_HOST === 'localhost'
        || import.meta.env.VITE_REVERB_HOST?.startsWith('http') 
        ? window.location.hostname 
        : import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
});
