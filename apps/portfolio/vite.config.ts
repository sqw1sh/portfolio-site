import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative assets support both user pages and repository subpaths.
  base: './',
  // Keep font assets on the same origin instead of embedding data: URLs in CSS.
  build: { assetsInlineLimit: 0 },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'production-content-security-policy',
      apply: 'build',
      // Pages cannot set custom response headers; meta CSP constrains this static app.
      transformIndexHtml: {
        order: 'post',
        handler: () => [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content:
                "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
            },
            injectTo: 'head-prepend',
          },
        ],
      },
    },
  ],
});
