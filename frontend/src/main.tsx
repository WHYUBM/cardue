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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
