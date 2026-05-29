import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'manifest.json',
      includeAssets: ['offline.html', 'assets/img/logo-mark.svg', 'assets/img/logo-placeholder.svg'],
      manifest: {
        name: 'Medellín Movilidata OS',
        short_name: 'MovilidataOS',
        description: 'Plataforma digital para monitoreo de seguridad vial y congestión en Medellín.',
        theme_color: '#123e7a',
        background_color: '#f4f8fc',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/assets/img/logo-mark.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/assets/img/logo-placeholder.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/offline.html',
        globPatterns: ['**/*.{js,css,html,svg,json}'],
      },
    }),
  ],
})
