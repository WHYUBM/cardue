/**
 * Chrome of the public pages: light header with the sign-in calls to action.
 */
import { Link, NavLink, Outlet } from 'react-router'
import { SiteFooter } from '../components/SiteFooter'
import styles from './PublicLayout.module.css'

/**
 * Wraps every route reachable before signing in. The header stays deliberately
 * thin: the only navigation offered is the way into the app.
 */
export function PublicLayout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          Cardue
        </Link>
        <nav className={styles.nav} aria-label="Navigazione principale">
          <NavLink to="/info">Il progetto</NavLink>
          <NavLink to="/login" className="btn btn-primary">
            Accedi
          </NavLink>
        </nav>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  )
}
