/**
 * Footer shared by both layouts.
 */
import { Link } from 'react-router'
import { REPO_URL } from '../lib/constants'
import styles from './SiteFooter.module.css'

/**
 * Renders the project line and the service links.
 *
 * The disclaimer link lives here because it has to stay reachable from every
 * page, whichever layout the user is under.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.text}>
        Cardue — progetto open source, senza scopo di lucro.
      </p>
      <nav className={styles.links} aria-label="Link di servizio">
        <Link to="/disclaimer">Disclaimer</Link>
        <Link to="/info">Informazioni sul progetto</Link>
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          Codice su GitHub
        </a>
      </nav>
    </footer>
  )
}
