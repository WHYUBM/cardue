/**
 * Application entry point: mounts React on the `#root` node of `index.html`.
 *
 * `BrowserRouter` uses the History API, so every unknown path must fall back to
 * `index.html`. Vite handles this in development; in production the reverse
 * proxy has to do it, otherwise reloading a deep link such as `/veicoli/1`
 * returns a 404.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import './index.css'

/**
 * Registers the Service Worker that makes the app work offline (ADR 0011).
 *
 * Production only: in development Vite serves the modules unbundled, and a
 * worker caching them would fight hot reloading. To try it locally use
 * `npm run build && npm run preview`.
 *
 * Registered as a classic script, not a module: the built `sw.js` has no
 * imports, so it needs no `type: 'module'` and works on browsers that do not
 * support module workers. Adding an import to `sw.ts` would break that, and the
 * registration below would have to change with it.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((cause: unknown) => {
      // A failed registration must not take the app down with it: without the
      // worker it simply stops working offline.
      console.error('Registrazione del Service Worker fallita', cause)
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
