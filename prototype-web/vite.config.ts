import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// ─── Post-build cleanup plugin ───────────────────────────────────────
// Removes dev-only files (MSW service worker, placeholder SVG) from the
// production build output so they never reach S3 / CloudFront.
function cleanDistPlugin() {
  return {
    name: 'clean-dist-dev-files',
    closeBundle() {
      const devOnlyFiles = ['mockServiceWorker.js', 'vite.svg']
      for (const file of devOnlyFiles) {
        const filePath = path.resolve(__dirname, 'dist', file)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
          console.warn(`  🗑  Removed dev-only file from dist: ${file}`)
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cleanDistPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    sourcemap: process.env.NODE_ENV !== 'production' ? true : 'hidden',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router'],
          charts: ['recharts'],
        },
      },
    },
  },
})
