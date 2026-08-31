/**
 * Public landing page: what Cardue is, and the way in.
 */
import { Link } from 'react-router'
import { DisclaimerNotice } from '../../components/DisclaimerNotice'
import { REPO_URL } from '../../lib/constants'
import styles from './Landing.module.css'

/**
 * Renders the hero, the disclaimer and the feature summary.
 *
 * The disclaimer uses the `full` variant and sits directly under the hero:
 * visitors should read the liability wording before signing up, not after.
 */
export function Landing() {
  return (
    <>
      <section className={styles.hero}>
        <h1 className={styles.title}>Le scadenze dell'auto, senza pensieri</h1>
        <p className={styles.subtitle}>
          Cardue tiene traccia di bollo, assicurazione, revisione e tagliando dei
          tuoi veicoli e ti avvisa con una notifica prima di ogni scadenza.
        </p>
        <div className={styles.actions}>
          <Link to="/register" className="btn btn-primary">
            Registrati
          </Link>
          <Link to="/login" className="btn btn-secondary">
            Accedi
          </Link>
        </div>
        <p className={styles.repoLine}>
          Progetto open source ·{' '}
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            guarda il codice su GitHub
          </a>
        </p>
      </section>

      <DisclaimerNotice variant="full" />

      <section className={styles.features}>
        <article className="card">
          <h2>Tutti i veicoli in un posto</h2>
          <p className="muted">
            Marca, modello, targa e anno: registra le auto della famiglia e tieni
            ogni scadenza sotto controllo da un'unica schermata.
          </p>
        </article>
        <article className="card">
          <h2>Promemoria automatici</h2>
          <p className="muted">
            Una notifica push arriva con l'anticipo che scegli tu, anche quando
            l'app è chiusa. Nessuna email da ricordarsi di leggere.
          </p>
        </article>
        <article className="card">
          <h2>Intervalli di manutenzione</h2>
          <p className="muted">
            Un catalogo marca → modello con gli intervalli tipici di tagliando,
            arricchito dai contributi di chi usa l'app.
          </p>
        </article>
      </section>
    </>
  )
}
