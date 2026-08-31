/**
 * Create and edit form for a vehicle, serving both `/veicoli/nuovo` and
 * `/veicoli/:id/modifica`.
 */
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { mockCatalog } from '../../mocks/catalog'
import { findVehicle } from '../../mocks/vehicles'
import { DEADLINE_LABELS } from '../../lib/format'
import type { DeadlineType } from '../../types'
import { NotFound } from '../NotFound'
import styles from './VehicleForm.module.css'

interface VehicleFormProps {
  /** `create` for `/veicoli/nuovo`, `edit` for `/veicoli/:id/modifica`. */
  mode: 'create' | 'edit'
}

/**
 * Rendered as one date field each. Listed explicitly rather than derived from
 * the catalog: these four are fixed by Italian regulation and by the domain
 * model, not by the vehicle.
 */
const DEADLINE_TYPES: DeadlineType[] = ['bollo', 'assicurazione', 'revisione', 'tagliando']

/**
 * Renders the vehicle form.
 *
 * One component serves both routes: only the prefilled values and the labels
 * differ, and keeping them together avoids two forms drifting apart field by
 * field.
 *
 * MOCK: Nothing is submitted and nothing is validated beyond the native input
 * constraints. Apart from make and model, the fields are uncontrolled, so on
 * `edit` they show the fixture values and any change is discarded on
 * navigation.
 */
export function VehicleForm({ mode }: VehicleFormProps) {
  const { id } = useParams()
  const vehicle = mode === 'edit' ? findVehicle(id) : undefined

  // Make and model are controlled together: the model list is derived from the
  // make, so picking a different make has to clear the model chosen under the
  // previous one — otherwise the form could submit a pairing that does not
  // exist, and nothing downstream would catch it.
  const [make, setMake] = useState(vehicle?.make ?? '')
  const [model, setModel] = useState(vehicle?.model ?? '')

  // Editing an id that does not exist is a dead end, not an empty form.
  if (mode === 'edit' && !vehicle) return <NotFound to="/veicoli" label="I miei veicoli" />

  const models = mockCatalog.find((entry) => entry.name === make)?.models ?? []
  // Bounds the registration year: a vehicle cannot be registered in the future.
  const currentYear = new Date().getFullYear()

  function handleMakeChange(event: ChangeEvent<HTMLSelectElement>) {
    setMake(event.target.value)
    setModel('')
  }

  // MOCK: Inert handler — replace with POST/PATCH to `/api/vehicles`.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <>
      <p className={styles.breadcrumb}>
        <Link to={vehicle ? `/veicoli/${vehicle.id}` : '/veicoli'}>
          ← {vehicle ? `${vehicle.make} ${vehicle.model}` : 'I miei veicoli'}
        </Link>
      </p>

      <div className="page-header">
        <div>
          <h1>{mode === 'create' ? 'Aggiungi un veicolo' : 'Modifica veicolo'}</h1>
          <p>
            {mode === 'create'
              ? 'Inserisci i dati dell’auto e le date che vuoi tenere sotto controllo.'
              : 'Aggiorna i dati del veicolo e le date delle scadenze.'}
          </p>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <section className="card">
          <h2 className={styles.sectionTitle}>Dati del veicolo</h2>

          <div className={styles.row}>
            <div className="field">
              <label htmlFor="make">Marca</label>
              <select id="make" name="make" value={make} onChange={handleMakeChange}>
                <option value="">Seleziona una marca…</option>
                {mockCatalog.map((entry) => (
                  <option key={entry.id} value={entry.name}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="model">Modello</label>
              <select
                id="model"
                name="model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                disabled={make === ''}
              >
                <option value="">
                  {make === '' ? 'Scegli prima la marca' : 'Seleziona un modello…'}
                </option>
                {models.map((model) => (
                  <option key={model.id} value={model.name}>
                    {model.name} ({model.years})
                  </option>
                ))}
              </select>
              <span className="hint">
                Non trovi il tuo modello?{' '}
                <Link to="/catalogo/richiedi">Richiedilo</Link>.
              </span>
            </div>
          </div>

          <div className={styles.row}>
            <div className="field">
              <label htmlFor="plate">Targa</label>
              <input
                id="plate"
                name="plate"
                type="text"
                placeholder="AB123CD"
                defaultValue={vehicle?.plate ?? ''}
              />
            </div>

            <div className="field">
              <label htmlFor="year">Anno di immatricolazione</label>
              <input
                id="year"
                name="year"
                type="number"
                min={1950}
                max={currentYear}
                placeholder={String(currentYear)}
                defaultValue={vehicle?.year ?? ''}
              />
            </div>

            <div className="field">
              <label htmlFor="mileage">Chilometraggio</label>
              <input
                id="mileage"
                name="mileage"
                type="number"
                min={0}
                placeholder="es. 78400"
                defaultValue={vehicle?.mileageKm ?? ''}
              />
              <span className="hint">Serve a stimare il prossimo tagliando.</span>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className={styles.sectionTitle}>Scadenze</h2>
          <p className="muted">
            Lascia vuoto ciò che non vuoi monitorare: potrai aggiungerlo in seguito.
          </p>

          {/* Deadlines are optional at creation time: the user may not know
              every date yet, and a half-known vehicle is better than none. */}
          <div className={styles.row}>
            {DEADLINE_TYPES.map((type) => {
              const existing = vehicle?.deadlines.find((deadline) => deadline.type === type)
              return (
                <div className="field" key={type}>
                  <label htmlFor={`deadline-${type}`}>{DEADLINE_LABELS[type]}</label>
                  <input
                    id={`deadline-${type}`}
                    name={`deadline-${type}`}
                    type="date"
                    defaultValue={existing?.dueDate ?? ''}
                  />
                </div>
              )
            })}
          </div>
        </section>

        <div className={styles.formActions}>
          <Link
            to={vehicle ? `/veicoli/${vehicle.id}` : '/veicoli'}
            className="btn btn-secondary"
          >
            Annulla
          </Link>
          <button type="submit" className="btn btn-primary">
            {mode === 'create' ? 'Aggiungi veicolo' : 'Salva modifiche'}
          </button>
        </div>

        <p className={`muted ${styles.note}`}>
          Interfaccia dimostrativa: i dati non vengono ancora salvati.
        </p>
      </form>
    </>
  )
}
