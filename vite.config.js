import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

function getLastCommitDate() {
  try {
    return execSync('git log -1 --format=%cI', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return new Date().toISOString()
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __LAST_COMMIT_DATE__: JSON.stringify(getLastCommitDate()),
  },
  // Vite 8 uses oxc (oxidation-compiler) by default. We rely on its
  // tree-shaking + dead-code elimination; no extra esbuild config needed.
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    // Inline anything under 4KB as base64 to save HTTP requests. Hits the
    // small SVG icons / cursors that would otherwise be a round-trip each.
    assetsInlineLimit: 4096,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Hand-tuned vendor chunks. We split the heaviest deps so they can
        // cache independently and so the route shells (home, playground,
        // about) only download what they need.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('gsap')) return 'gsap'
          if (
            id.includes('framer-motion') ||
            id.includes('motion-dom') ||
            id.includes('motion-utils')
          ) {
            return 'motion'
          }
          if (id.includes('lenis')) return 'lenis'
          if (id.includes('snd-lib')) return 'snd'
          if (id.includes('@vercel')) return 'vercel'
          if (
            id.includes('react-dom') ||
            id.includes('react/') ||
            id.includes('scheduler')
          ) {
            return 'react'
          }
          return 'vendor'
        },
      },
    },
  },
})
