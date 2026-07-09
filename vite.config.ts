import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Workout Tracker',
        short_name: 'Workout',
        description: 'Offline-first workout logger with progression suggestions',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,gif,mp4,ico}'],
        runtimeCaching: [
          {
            urlPattern: /\/exercises\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'exercise-media' },
          },
        ],
      },
    }),
  ],
})
