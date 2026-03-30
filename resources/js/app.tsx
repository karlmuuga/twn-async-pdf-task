import './bootstrap';
import { createInertiaApp } from '@inertiajs/react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

createInertiaApp({
    resolve: name => {
        const pages = import.meta.glob<{ default: ComponentType }>(
            './Pages/**/*.tsx',
            { eager: true },
        );
        const page = pages[`./Pages/${name}.tsx`];
        if (!page) {
            throw new Error(`Unknown page: ${name}`);
        }
        return page;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
});
