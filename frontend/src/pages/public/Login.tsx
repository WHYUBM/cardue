/**
 * Public sign-in page.
 */
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import styles from './Auth.module.css'

/**
 * Renders the sign-in form.
 *
 * MOCK: There is no authentication yet. Submitting is suppressed so the page
 * does not navigate away, and the form links straight to the dashboard instead.
 */
export function Login() {
  // MOCK: Inert handler — replace with the real sign-in request.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Accedi a Cardue</h1>
      <p className={styles.intro}>Bentornato: riprendi da dove avevi lasciato.</p>

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" name="email" autoComplete="email" />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className={`btn btn-primary ${styles.submit}`}>
          Accedi
        </button>

        <p className={styles.note}>
          L'autenticazione non è ancora implementata: puoi comunque{' '}
          <Link to="/dashboard">entrare nella dashboard</Link>.
        </p>
      </form>

      <p className={styles.alt}>
        Non hai un account? <Link to="/register">Registrati</Link>
      </p>
    </div>
  )
}
