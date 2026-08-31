/**
 * Searchable make-to-model catalog with the typical maintenance intervals.
 */
import { useState } from 'react'
import { Link } from 'react-router'
import { DisclaimerNotice } from '../../components/DisclaimerNotice'
import { EmptyState } from '../../components/EmptyState'
import { catalogModels } from '../../mocks/catalog'
import styles from './Catalog.module.css'

/**
 * Describes an interval in words, joining the two bounds with "o" because
 * whichever comes first is what applies.
 *
 * Both bounds are optional, so the fallback covers a catalog entry that records
 * a task without knowing how often it is due.
 */
function describeInterval(everyMonths?: number, everyKm?: number): string {
  const parts: string[] = []
  if (everyMonths) parts.push(everyMonths === 12 ? 'ogni anno' : `ogni ${everyMonths} mesi`)
  if (everyKm) parts.push(`ogni ${everyKm.toLocaleString('it-IT')} km`)
  return parts.join(' o ') || 'intervallo non disponibile'
}

/**
 * Renders the catalog search and its results.
 *
 * MOCK: Filtering runs in memory over the whole fixture on every keystroke.
 * That is fine for a handful of models but will have to become a server-side
 * query once the real dataset lands (ADR 0004).
 */
export function Catalog() {
  const [query, setQuery] = useState('')

  // Matching against "make model" as one string lets the user type either part,
  // or both, without having to know which field they are searching.
  const normalized = query.trim().toLowerCase()
  const results = catalogModels.filter(({ make, model }) =>
    `${make.name} ${model.name}`.toLowerCase().includes(normalized),
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Catalogo veicoli</h1>
          <p>Cerca un modello per vedere gli intervalli di manutenzione tipici.</p>
        </div>
        <div className={styles.headerActions}>
          <Link to="/catalogo/richiedi" className="btn btn-secondary">
            Richiedi un veicolo
          </Link>
          <Link to="/catalogo/contribuisci" className="btn btn-secondary">
            Contribuisci
          </Link>
        </div>
      </div>

      <DisclaimerNotice />

      <div className="field">
        <label htmlFor="search">Cerca marca o modello</label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="es. Panda, Volkswagen, Yaris…"
        />
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="Nessun modello trovato"
          description="Il catalogo è ancora parziale: puoi segnalarci il modello mancante."
          action={
            <Link to="/catalogo/richiedi" className="btn btn-primary">
              Richiedi questo veicolo
            </Link>
          }
        />
      ) : (
        <ul className={styles.results}>
          {results.map(({ make, model }) => (
            <li key={model.id} className={`card ${styles.result}`}>
              <div className={styles.resultHead}>
                <h2 className={styles.resultTitle}>
                  {make.name} {model.name}
                </h2>
                <span className="muted">{model.years}</span>
              </div>
              <ul className={styles.intervals}>
                {model.intervals.map((interval) => (
                  <li key={interval.label} className={styles.interval}>
                    <span>{interval.label}</span>
                    <span className="muted">
                      {describeInterval(interval.everyMonths, interval.everyKm)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
