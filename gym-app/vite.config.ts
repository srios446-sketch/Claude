/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { BRAND } from './src/config/brand.ts';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon.png', 'brand/logo.png'],
      manifest: {
        name: BRAND.nombre,
        short_name: BRAND.nombreCorto,
        description: BRAND.descripcion,
        lang: 'es-MX',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: BRAND.colorTema,
        background_color: BRAND.colorFondo,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,txt}'],
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*', 'icons/icon-512.png', 'icons/maskable-512.png'],
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
  },
});
