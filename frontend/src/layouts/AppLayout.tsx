/**
 * Chrome of the signed-in area: header with the primary navigation, page
 * content, shared footer.
 */
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { useSession } from '../auth/useSession'
import { SiteFooter } from '../components/SiteFooter'
import { logout } from '../lib/auth-api'
import styles from './AppLayout.module.css'

/** Navigation entries of the signed-in area, in reading order. */
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/veicoli', label: 'I miei veicoli' },
  { to: '/catalogo', label: 'Catalogo' },
  { to: '/impostazioni', label: 'Impostazioni' },
]

/**
 * Wraps every route of the app branch. Access control is one level up, in
 * `ProtectedRoute`: by the time this renders there is a session.
 */
export function AppLayout() {
  const { account, forget } = useSession()
  const [leaving, setLeaving] = useState(false)

  /**
   * Ends the session here and at Keycloak.
   *
   * The local trace goes first, so the interface reacts immediately, and the
   * browser then travels to the provider's logout. Skipping that second part
   * would make the next sign-in instant, which is not what signing out means.
   */
  async function handleLogout() {
    setLeaving(true)
    try {
      const { logoutUrl } = await logout()
      forget()
      window.location.href = logoutUrl
    } catch {
      // Offline, or the backend is down: at least stop trusting the session
      // here. The server will be told at the next opportunity.
      forget()
      window.location.href = '/'
    }
  }

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

          <div className={styles.account}>
            {account && <span className={styles.accountName}>{account.name}</span>}
            <button
              type="button"
              className={styles.exit}
              onClick={() => void handleLogout()}
              disabled={leaving}
            >
              {leaving ? 'Uscita…' : 'Esci'}
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  )
}
