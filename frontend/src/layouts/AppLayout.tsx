/**
 * Chrome of the signed-in area: header with the primary navigation, page
 * content, shared footer.
 */
import { Link, NavLink, Outlet } from 'react-router'
import { SiteFooter } from '../components/SiteFooter'
import styles from './AppLayout.module.css'

/** Navigation entries of the signed-in area, in reading order. */
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/veicoli', label: 'I miei veicoli' },
  { to: '/catalogo', label: 'Catalogo' },
  { to: '/impostazioni', label: 'Impostazioni' },
]

/**
 * Wraps every route of the app branch.
 *
 * TODO: There is no access control here. Anyone reaching one of these URLs is
 * let straight through — this layout is the natural place for the route guard
 * once real authentication exists.
 */
export function AppLayout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/dashboard" className={styles.brand}>
            Cardue
          </Link>

          <nav className={styles.nav} aria-label="Navigazione dell'applicazione">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* MOCK: With no session to end, signing out is just a link back to
              the landing page. */}
          <Link to="/" className={styles.exit}>
            Esci
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  )
}
