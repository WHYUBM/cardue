/**
 * Form through which users contribute maintenance information about a vehicle.
 */
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { DisclaimerNotice } from '../../components/DisclaimerNotice'
import styles from './CatalogForm.module.css'

/**
 * Renders the contribution form.
 *
 * The full disclaimer sits at the top rather than next to the submit button:
 * contributors need to know their input will be shown to other people as
 * guidance, not as an official source, before they start writing it.
 */
export function CatalogContribute() {
  // MOCK: Inert handler — contributions are not collected yet.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.breadcrumb}>
        <Link to="/catalogo">← Catalogo</Link>
      </p>

      <h1>Contribuisci con le tue informazioni</h1>

      <DisclaimerNotice variant="full" />

      <p className="muted">
        Le informazioni che invii saranno visibili agli altri utenti come dato
        indicativo. Riporta quanto trovi sul libretto di uso e manutenzione, non
        una stima personale.
      </p>

      <form className="card" onSubmit={handleSubmit}>
        <div className={styles.row}>
          <div className="field">
            <label htmlFor="make">Marca</label>
            <input id="make" name="make" type="text" placeholder="es. Fiat" />
          </div>

          <div className="field">
            <label htmlFor="model">Modello</label>
            <input id="model" name="model" type="text" placeholder="es. Panda" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="intervention">Tipo di intervento</label>
          <input
            id="intervention"
            name="intervention"
            type="text"
            placeholder="es. Cambio olio e filtro"
          />
        </div>

        <div className={styles.row}>
          <div className="field">
            <label htmlFor="everyMonths">Ogni quanti mesi</label>
            <input id="everyMonths" name="everyMonths" type="number" min={1} placeholder="12" />
          </div>

          <div className="field">
            <label htmlFor="everyKm">Ogni quanti km</label>
            <input id="everyKm" name="everyKm" type="number" min={1} placeholder="15000" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="source">Fonte</label>
          <input
            id="source"
            name="source"
            type="text"
            placeholder="es. libretto di uso e manutenzione, pag. 214"
          />
          <span className="hint">
            Indicare la fonte aiuta a distinguere i dati verificati dalle stime.
          </span>
        </div>

        <div className={styles.actions}>
          <Link to="/catalogo" className="btn btn-secondary">
            Annulla
          </Link>
          <button type="submit" className="btn btn-primary">
            Invia contributo
          </button>
        </div>

        <p className={`muted ${styles.note}`}>
          Interfaccia dimostrativa: il contributo non viene ancora inviato.
        </p>
      </form>
    </div>
  )
}
