import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fetchItemMeta, injectMetaIntoHtml } from './src/server/ogHandler.ts';

function openGraphPlugin(): Plugin {
  return {
    name: 'dynamic-opengraph-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        const match = url.match(/^\/(produit|pack)\/([a-zA-Z0-9_-]+)/);
        if (match) {
          const type = match[1] as 'produit' | 'pack';
          const id = match[2];
          try {
            const host = req.headers.host || 'localhost:3000';
            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const origin = `${protocol}://${host}`;
            
            const meta = await fetchItemMeta(type, id, origin);
            const indexHtmlPath = path.resolve(__dirname, 'index.html');
            let template = fs.readFileSync(indexHtmlPath, 'utf-8');
            template = await server.transformIndexHtml(url, template);
            const finalHtml = injectMetaIntoHtml(template, meta);
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(finalHtml);
            return;
          } catch (e) {
            console.error('OG Plugin error:', e);
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      openGraphPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon.png', 'logo.png', 'apple-touch-icon.png', 'icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: '/',
          name: 'For him and her - Mode Douala',
          short_name: 'ForHimAndHer',
          description: 'Boutique en ligne complète pour vêtements, chaussures, parfums, sacs et accessoires à Douala, Cameroun.',
          theme_color: '#0B2A4A',
          background_color: '#0B2A4A',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'unsplash-images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
