import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,ttf,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10 MB limit for some assets
      },
      manifest: {
        name: 'Code N Chaos',
        short_name: 'CodeNChaos',
        description: 'Tech Quest by Codester & Logix',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
      }
    })
  ],
})
