import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const appUrl = new URL(env.APP_URL || 'http://localhost');

    return {
        plugins: [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.tsx'],
                refresh: true,
            }),
            react(),
        ],
        server: {
            // Listen on all interfaces for Docker deployment
            host: '0.0.0.0',
            hmr: {
                host: appUrl.hostname,
            },
            cors: true,
            watch: {
                ignored: ['**/storage/framework/views/**'],
            },
        },
    };
});
