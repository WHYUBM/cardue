/**
 * Form for reporting a model missing from the catalog.
 */
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import styles from './CatalogForm.module.css'

/** Renders the request form. */
export function CatalogRequest() {
  // MOCK: Inert handler — nothing is submitted anywhere yet.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.breadcrumb}>
        <Link to="/catalogo">← Catalogo</Link>
      </p>

      <div className="page-header">
        <div>
          <h1>Richiedi un veicolo</h1>
          <p>
            Manca il tuo modello? Segnalacelo: lo aggiungeremo al catalogo insieme
            agli intervalli di manutenzione.
          </p>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className={styles.row}>
          <div className="field">
            <label htmlFor="make">Marca</label>
            <input id="make" name="make" type="text" placeholder="es. Skoda" />
          </div>

          <div className="field">
            <label htmlFor="model">Modello</label>
            <input id="model" name="model" type="text" placeholder="es. Octavia" />
          </div>
        </div>

        <div className={styles.row}>
          <div className="field">
            <label htmlFor="years">Anni di produzione</label>
            <input id="years" name="years" type="text" placeholder="es. 2013-2020" />
          </div>

          <div className="field">
            <label htmlFor="engine">Motorizzazione</label>
            <input id="engine" name="engine" type="text" placeholder="es. 1.6 TDI" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="notes">Note</label>
          <textarea
            id="notes"
            name="notes"
            placeholder="Allestimento, alimentazione, dettagli utili a identificare il modello…"
          />
        </div>

        <div className={styles.actions}>
          <Link to="/catalogo" className="btn btn-secondary">
            Annulla
          </Link>
          <button type="submit" className="btn btn-primary">
            Invia richiesta
          </button>
        </div>

        <p className={`muted ${styles.note}`}>
          Interfaccia dimostrativa: la richiesta non viene ancora inviata.
        </p>
      </form>
    </div>
  )
}
