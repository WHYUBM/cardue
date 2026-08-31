import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
