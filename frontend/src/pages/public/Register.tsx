/**
 * Public page explaining that accounts are handed out, not created.
 */
import { Link } from 'react-router'
import { loginUrl } from '../../lib/auth-api'
import styles from './Auth.module.css'

/**
 * Says why there is no sign-up form.
 *
 * The route is kept rather than removed: it is linked from outside — a
 * bookmark, an old message — and a page that explains is better than a 404 that
 * leaves the visitor guessing.
 *
 * Access is by invitation (ADR 0009): the realm has self-registration switched
 * off, so a form here could only fail. Concretely, an account is created for
 * someone by hand in Keycloak.
 */
export function Register() {
  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>L'accesso è su invito</h1>
      <p className={styles.intro}>
        Cardue è un progetto personale: gli account non si creano da soli, vengono
        assegnati.
      </p>

      <div className="card">
        <p>
          Se hai già ricevuto un invito, hai un account: accedi con la tua email e
          la password che ti è stata comunicata, oppure con Google se l'hai
          collegato.
        </p>
        <p className="muted">
          Se invece sei arrivato qui incuriosito, il codice del progetto è
          pubblico: puoi installarne una tua copia.
        </p>

        <a className="btn btn-primary" href={loginUrl('/dashboard')}>
          Accedi
        </a>
      </div>

      <p className={styles.switch}>
        Vuoi sapere di più sul progetto? <Link to="/info">Leggi qui</Link>
      </p>
    </div>
  )
}
