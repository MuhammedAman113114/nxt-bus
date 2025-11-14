import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'nxt-bus - Real-time Bus Tracking',
        short_name: 'nxt-bus',
        description: 'Track buses in real-time with live ETAs and notifications',
        theme_color: '#007bff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Cache static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        
        // Runtime caching strategies
        runtimeCaching: [
          // API calls - Network first with fallback
          {
            urlPattern: /^http:\/\/localhost:3000\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 300 // 5 minutes
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Static data (stops, routes) - Stale while revalidate
          {
            urlPattern: /^http:\/\/localhost:3000\/api\/(stops|routes).*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-data-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 3600 // 1 hour
              }
            }
          },
          // Images and assets - Cache first
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          }
        ],
        
        // Clean up old caches
        cleanupOutdatedCaches: true,
        
        // Skip waiting and claim clients immediately
        skipWaiting: true,
        clientsClaim: true
      },
      
      // Development options
      devOptions: {
        enabled: false, // Disable in development for faster reload
        type: 'module'
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
