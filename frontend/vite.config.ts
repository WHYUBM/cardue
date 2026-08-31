import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Two entry points: the application, and the Service Worker.
      input: { main: 'index.html', sw: 'src/sw.ts' },
      output: {
        // The worker must land at a stable `/sw.js`: its URL determines the
        // scope it controls, and a content hash in the name would change that
        // at every deploy. Everything else keeps the hash, which is what makes
        // the cache-first strategy in the worker safe.
        entryFileNames: (chunk) =>
          chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  preview: {
    // Vite rejects requests carrying a Host it does not know, as a defence
    // against DNS rebinding. These entries are what let the PWA be tried from a
    // phone through an HTTPS tunnel — the only way to get a secure context, and
    // therefore a Service Worker, outside localhost. This applies to
    // `vite preview` only, never to the build served in production.
    allowedHosts: ['.trycloudflare.com', '.loca.lt', '.ngrok-free.app'],
  },
  server: {
    proxy: {
      // Forwards /api to the NestJS backend so the browser only ever talks to
      // one origin. This is what removes the need for CORS in development, and
      // it mirrors production, where the reverse proxy routes the same path
      // (ADR 0002) — which is why the frontend can use relative URLs unchanged
      // in both (ADR 0007).
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
