/**
 * Reusable callout pointing at the liability disclaimer.
 */
import { Link } from 'react-router'
import styles from './DisclaimerNotice.module.css'

interface DisclaimerNoticeProps {
  /**
   * `compact` for a short reminder that links to the full text, `full` for the
   * complete wording. Use `full` where the user is about to act on the data or
   * contribute some, `compact` elsewhere.
   */
  variant?: 'compact' | 'full'
}

/**
 * Renders the disclaimer callout.
 *
 * The authoritative text lives on the `/disclaimer` page; this component keeps
 * its substance in front of the user wherever data could be mistaken for an
 * official source.
 */
export function DisclaimerNotice({ variant = 'compact' }: DisclaimerNoticeProps) {
  return (
    <aside className={styles.notice} role="note">
      <strong className={styles.heading}>⚠️ Dati puramente indicativi</strong>
      {variant === 'full' ? (
        <p className={styles.text}>
          Le informazioni su scadenze, intervalli di manutenzione e interventi
          consigliati hanno carattere puramente indicativo. Non sostituiscono il
          libretto di uso e manutenzione del veicolo, il meccanico o le fonti
          ufficiali. Gli autori non si assumono alcuna responsabilità per errori,
          omissioni o decisioni prese sulla base dei dati mostrati
          dall'applicazione. Verifica sempre le scadenze presso le fonti ufficiali.
        </p>
      ) : (
        <p className={styles.text}>
          Cardue non sostituisce il libretto del veicolo né le fonti ufficiali.
          Verifica sempre le scadenze presso gli enti competenti.{' '}
          <Link to="/disclaimer">Leggi il disclaimer completo</Link>.
        </p>
      )}
    </aside>
  )
}
