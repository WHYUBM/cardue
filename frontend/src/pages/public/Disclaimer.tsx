/**
 * Public page carrying the full liability disclaimer.
 */
import { Link } from 'react-router'
import styles from './TextPage.module.css'

/**
 * Renders the full disclaimer.
 *
 * This is the authoritative wording that `DisclaimerNotice` links to, and it is
 * kept aligned with the disclaimer in the README: the two must not diverge.
 */
export function Disclaimer() {
  return (
    <article className={styles.page}>
      <h1>Disclaimer</h1>

      <p>
        Le informazioni su scadenze, intervalli di manutenzione e interventi
        consigliati mostrate da Cardue hanno <strong>carattere puramente
        indicativo</strong>.
      </p>

      <h2>Cosa significa</h2>
      <p>
        I dati non sostituiscono il libretto di uso e manutenzione del veicolo, il
        parere del meccanico o le fonti ufficiali (Agenzia delle Entrate per il
        bollo, Motorizzazione Civile per la revisione, la tua compagnia per
        l'assicurazione). Gli intervalli di tagliando variano per motorizzazione,
        allestimento, stile di guida e condizioni d'uso.
      </p>

      <h2>Limitazione di responsabilità</h2>
      <p>
        Gli autori <strong>non si assumono alcuna responsabilità</strong> per
        errori, omissioni, mancati avvisi o decisioni prese sulla base dei dati
        mostrati dall'applicazione. L'invio delle notifiche dipende inoltre dal
        browser e dal sistema operativo dell'utente e non può essere garantito.
      </p>

      <h2>Contributi della comunità</h2>
      <p>
        Parte delle informazioni del catalogo può provenire dagli utenti. I
        contributi sono utili ma non verificati uno per uno: valgono come
        indicazione, non come fonte ufficiale.
      </p>

      <h2>Verifica sempre</h2>
      <p>
        Prima di ogni adempimento, controlla la scadenza presso l'ente o il
        fornitore competente. Cardue è un promemoria, non un registro legale.
      </p>

      <p className={styles.back}>
        <Link to="/">← Torna alla pagina iniziale</Link>
      </p>
    </article>
  )
}
