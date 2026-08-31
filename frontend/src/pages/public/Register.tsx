/**
 * Public sign-up page.
 */
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import styles from './Auth.module.css'

/**
 * Renders the sign-up form.
 *
 * MOCK: Like `Login`, submitting does nothing — there is no account creation
 * endpoint, and no client-side validation beyond the native input types.
 */
export function Register() {
  // MOCK: Inert handler — replace with the real sign-up request.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Crea il tuo account</h1>
      <p className={styles.intro}>
        Bastano un'email e una password per iniziare a tracciare le scadenze.
      </p>

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Nome</label>
          <input id="name" type="text" name="name" autoComplete="name" />
        </div>

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
            autoComplete="new-password"
          />
          <span className="hint">Almeno 8 caratteri.</span>
        </div>

        <div className="field">
          <label htmlFor="passwordConfirm">Conferma password</label>
          <input
            id="passwordConfirm"
            type="password"
            name="passwordConfirm"
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className={`btn btn-primary ${styles.submit}`}>
          Registrati
        </button>

        <p className={styles.note}>
          Registrandoti accetti il <Link to="/disclaimer">disclaimer</Link>: i dati
          mostrati sono indicativi.
        </p>
      </form>

      <p className={styles.alt}>
        Hai già un account? <Link to="/login">Accedi</Link>
      </p>
    </div>
  )
}
