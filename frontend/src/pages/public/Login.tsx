/**
 * Public sign-in page.
 */
import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useSession } from '../../auth/useSession'
import { loginUrl } from '../../lib/auth-api'
import styles from './Auth.module.css'

/**
 * Hands the sign-in over to Keycloak.
 *
 * There is no email and password form here, and there should not be: the
 * password belongs to the identity provider, and a form of ours would either
 * have to forward it — defeating the point — or be a decoration. The button is
 * a plain link, not a `fetch`: the browser has to *travel* to Keycloak and come
 * back, which a background request cannot do (ADR 0009).
 */
export function Login() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { account } = useSession()

  // Reaching the login page with a session already open means going back to
  // where the user was headed, rather than asking again.
  const returnTo = params.get('returnTo') ?? '/dashboard'
  useEffect(() => {
    if (account) void navigate(returnTo, { replace: true })
  }, [account, navigate, returnTo])

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Accedi a Cardue</h1>
      <p className={styles.intro}>Bentornato: riprendi da dove avevi lasciato.</p>

      <div className="card">
        <p>
          L&apos;accesso avviene attraverso il servizio di identità di Cardue, dove
          puoi usare email e password oppure il tuo account Google.
        </p>

        {/* An anchor, not a button with a handler: this has to be a full-page
            navigation. */}
        <a className="btn btn-primary" href={loginUrl(returnTo)}>
          Accedi
        </a>

        <p className="hint">
          Hai dimenticato la password? Potrai reimpostarla nella pagina di
          accesso.
        </p>
      </div>

      <p className={styles.switch}>
        Non hai un account? <Link to="/register">L'accesso è su invito</Link>.
      </p>
    </div>
  )
}
