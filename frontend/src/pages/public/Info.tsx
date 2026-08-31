/**
 * Public "about the project" page.
 */
import { Link } from 'react-router'
import { REPO_URL } from '../../lib/constants'
import styles from './TextPage.module.css'

/** Explains what the project is, how it is licensed and how to contribute. */
export function Info() {
  return (
    <article className={styles.page}>
      <h1>Il progetto</h1>

      <p>
        Cardue è una PWA che tiene sotto controllo le scadenze e la manutenzione
        della propria auto: bollo, assicurazione, revisione e tagliando, con
        promemoria automatici prima di ogni scadenza.
      </p>

      <h2>Open source e non profit</h2>
      <p>
        Il progetto è sviluppato a scopo didattico e di portfolio, rilasciato con
        licenza MIT. Non ci sono abbonamenti, pubblicità né rivendita di dati: il
        codice è pubblico e chiunque può leggerlo, usarlo o forkarlo.
      </p>

      <h2>Come contribuire</h2>
      <ul>
        <li>
          <strong>Segnala un problema</strong>: apri una issue nel repository
          descrivendo cosa non funziona.
        </li>
        <li>
          <strong>Proponi una modifica</strong>: fai un fork, lavora su un branch e
          apri una pull request.
        </li>
        <li>
          <strong>Aggiungi un veicolo</strong>: se manca un modello dal catalogo,
          usa il modulo <Link to="/catalogo/richiedi">Richiedi un veicolo</Link>.
        </li>
        <li>
          <strong>Migliora i dati</strong>: conosci gli intervalli di manutenzione
          di un'auto? <Link to="/catalogo/contribuisci">Contribuisci con le tue
          informazioni</Link>.
        </li>
      </ul>

      <h2>Scelte tecniche</h2>
      <p>
        Le decisioni architetturali e le motivazioni che le hanno guidate sono
        documentate nel repository sotto forma di Architecture Decision Record.
      </p>

      <p>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn btn-secondary">
          Vai al repository su GitHub
        </a>
      </p>

      <p className={styles.back}>
        <Link to="/disclaimer">Leggi il disclaimer</Link>
      </p>
    </article>
  )
}
