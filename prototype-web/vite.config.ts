import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// ─── Post-build cleanup plugin ───────────────────────────────────────
// Removes dev-only files (MSW service worker, placeholder SVG) from the
// production build output so they never reach S3 / CloudFront.
function cleanDistPlugin(mocksEnabled: boolean) {
  return {
    name: 'clean-dist-dev-files',
    closeBundle() {
      // Keep mockServiceWorker.js when mocks are enabled (demo deploys)
      const devOnlyFiles = mocksEnabled ? ['vite.svg'] : ['mockServiceWorker.js', 'vite.svg']
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
export default defineConfig(({ mode }) => {
  // loadEnv reads .env files + process.env so the plugin works in local
  // builds AND in CI/Netlify where env vars are injected.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const mocksEnabled = env.VITE_ENABLE_MOCKS === 'true'

  // PRD-7 Risk Register: VITE_ENABLE_MOCKS must never be 'true' in a
  // production build — fail fast so CI/Netlify never ships MSW to prod.
  if (mode === 'production' && mocksEnabled) {
    throw new Error(
      'FATAL: VITE_ENABLE_MOCKS=true is set for a production build. ' +
      'Remove or set to "false" before deploying.',
    )
  }

  return {
    plugins: [react(), tailwindcss(), cleanDistPlugin(mocksEnabled)],
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
  }
})
