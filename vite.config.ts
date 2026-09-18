import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/knit_canvas/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-yarn-pencil.png'],
      manifest: {
        name: 'Knit Canvas',
        short_name: 'Knit Canvas',
        description: '実ゲージでカラーワークを設計する編み図エディター',
        theme_color: '#264b41',
        background_color: '#f4f0e8',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: 'icon-yarn-pencil.png',
            sizes: '1254x1254',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
