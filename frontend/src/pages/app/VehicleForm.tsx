/**
 * Create and edit form for a vehicle, serving both `/veicoli/nuovo` and
 * `/veicoli/:id/modifica`.
 */
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { useVehicle } from '../../hooks/useVehicles'
import { DEADLINE_LABELS, STANDARD_DEADLINE_TYPES } from '../../lib/format'
import { mockCatalog } from '../../mocks/catalog'
import {
  createVehicle,
  updateVehicle,
  type CreateVehiclePayload,
  type DeadlinePayload,
} from '../../lib/vehicles-api'
import type { StandardDeadlineType, Vehicle } from '../../types'
import { NotFound } from '../NotFound'
import styles from './VehicleForm.module.css'

interface VehicleFormProps {
  /** `create` for `/veicoli/nuovo`, `edit` for `/veicoli/:id/modifica`. */
  mode: 'create' | 'edit'
}

/**
 * A user-defined deadline being edited.
 *
 * `key` exists only for React: these rows can be added and removed, and using
 * the array index would make the wrong field lose focus after a removal.
 */
interface CustomDeadlineDraft {
  key: string
  title: string
  dueDate: string
}

function emptyCustomDeadline(): CustomDeadlineDraft {
  return { key: crypto.randomUUID(), title: '', dueDate: '' }
}

/** Every field of the form, as strings — which is what inputs produce. */
interface FormValues {
  make: string
  model: string
  plate: string
  year: string
  mileageKm: string
  /** One entry per standard kind; an empty string means "not tracked". */
  deadlines: Record<StandardDeadlineType, string>
  /** Free-form deadlines, named by the user and repeatable. */
  customDeadlines: CustomDeadlineDraft[]
}

const EMPTY_FORM: FormValues = {
  make: '',
  model: '',
  plate: '',
  year: '',
  mileageKm: '',
  deadlines: { bollo: '', assicurazione: '', revisione: '', tagliando: '' },
  customDeadlines: [],
}

/** Turns a vehicle from the API into the string values the inputs need. */
function toFormValues(vehicle: Vehicle): FormValues {
  return {
    make: vehicle.make,
    model: vehicle.model,
    plate: vehicle.plate,
    year: String(vehicle.year),
    mileageKm: String(vehicle.mileageKm),
    deadlines: STANDARD_DEADLINE_TYPES.reduce(
      (accumulator, type) => ({
        ...accumulator,
        [type]:
          vehicle.deadlines.find((deadline) => deadline.type === type)?.dueDate ?? '',
      }),
      {} as Record<StandardDeadlineType, string>,
    ),
    customDeadlines: vehicle.deadlines
      .filter((deadline) => deadline.type === 'custom')
      .map((deadline) => ({
        key: deadline.id,
        title: deadline.title ?? '',
        dueDate: deadline.dueDate,
      })),
  }
}

/**
 * Renders the vehicle form.
 *
 * One component serves both routes: only the prefilled values and the labels
 * differ, and keeping them together avoids two forms drifting apart field by
 * field.
 *
 * Every field is controlled. The uncontrolled version was enough while the data
 * was fake, but a payload has to be read from somewhere on submit, and reading
 * it from the DOM would leave the form unable to show what it is about to send.
 */
export function VehicleForm({ mode }: VehicleFormProps) {
  const { id } = useParams()
  const navigate = useNavigate()

  // On `create` there is nothing to load, so the hook is skipped by passing no
  // id — it then rejects locally without touching the network.
  const {
    data: vehicle,
    loading,
    error: loadError,
    notFound,
    reload,
  } = useVehicle(mode === 'edit' ? id : undefined)

  const [values, setValues] = useState<FormValues>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<string[]>([])

  // Which vehicle the fields were filled from, so the arrival of the request is
  // noticed exactly once and later edits are not overwritten.
  const [filledFrom, setFilledFrom] = useState<string | null>(null)

  // Prefilling during render rather than in an effect: on the first render the
  // request has not answered yet, and an effect would paint an empty form for
  // one frame before replacing it. This is React's documented way of adjusting
  // state when an input changes.
  if (vehicle && vehicle.id !== filledFrom) {
    setFilledFrom(vehicle.id)
    setValues(toFormValues(vehicle))
  }

  if (mode === 'edit') {
    if (loading) return <LoadingState label="Caricamento del veicolo…" />
    if (notFound) return <NotFound to="/veicoli" label="I miei veicoli" />
    if (loadError) return <ErrorState message={loadError} onRetry={reload} />
  }

  const models = mockCatalog.find((entry) => entry.name === values.make)?.models ?? []
  // Bounds the registration year: a vehicle cannot be registered in the future.
  const currentYear = new Date().getFullYear()

  function setField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleMakeChange(event: ChangeEvent<HTMLSelectElement>) {
    // Picking a different make has to clear the model chosen under the previous
    // one, or the form could submit a pairing that does not exist.
    setValues((current) => ({ ...current, make: event.target.value, model: '' }))
  }

  function setDeadline(type: StandardDeadlineType, value: string) {
    setValues((current) => ({
      ...current,
      deadlines: { ...current.deadlines, [type]: value },
    }))
  }

  function addCustomDeadline() {
    setValues((current) => ({
      ...current,
      customDeadlines: [...current.customDeadlines, emptyCustomDeadline()],
    }))
  }

  function updateCustomDeadline(
    key: string,
    field: 'title' | 'dueDate',
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      customDeadlines: current.customDeadlines.map((draft) =>
        draft.key === key ? { ...draft, [field]: value } : draft,
      ),
    }))
  }

  function removeCustomDeadline(key: string) {
    setValues((current) => ({
      ...current,
      customDeadlines: current.customDeadlines.filter((draft) => draft.key !== key),
    }))
  }

  /**
   * Builds the request body from the form.
   *
   * Three conversions matter. An empty odometer field is left **out** of the
   * payload rather than sent as 0: the backend reads its absence as "new
   * vehicle" and stores 0 itself, and sending 0 here would make a blank field
   * indistinguishable from a deliberate zero. Empty dates are dropped for the
   * same reason — an untracked deadline is an absent one, not an empty one.
   * And a custom row is sent only once it has **both** a title and a date: a
   * half-filled row is one the user is still writing, not one to save.
   */
  function buildPayload(): CreateVehiclePayload {
    const standard: DeadlinePayload[] = STANDARD_DEADLINE_TYPES.filter(
      (type) => values.deadlines[type] !== '',
    ).map((type) => ({ type, dueDate: values.deadlines[type] }))

    const custom: DeadlinePayload[] = values.customDeadlines
      .filter((draft) => draft.title.trim() !== '' && draft.dueDate !== '')
      .map((draft) => ({
        type: 'custom' as const,
        title: draft.title.trim(),
        dueDate: draft.dueDate,
      }))

    const deadlines = [...standard, ...custom]

    return {
      make: values.make.trim(),
      model: values.model.trim(),
      plate: values.plate.trim(),
      year: Number(values.year),
      ...(values.mileageKm === '' ? {} : { mileageKm: Number(values.mileageKm) }),
      deadlines,
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaveError(null)
    setFieldErrors([])

    try {
      const payload = buildPayload()
      const saved =
        mode === 'create'
          ? await createVehicle(payload)
          : await updateVehicle(vehicle!.id, payload)

      await navigate(`/veicoli/${saved.id}`)
    } catch (cause) {
      // The backend answers a failed validation with one sentence per broken
      // rule; showing them all is more useful than showing only the first.
      const details =
        cause && typeof cause === 'object' && 'details' in cause
          ? ((cause as { details: string[] }).details ?? [])
          : []
      setFieldErrors(details.length > 1 ? details : [])
      setSaveError(cause instanceof Error ? cause.message : 'Salvataggio fallito.')
      setSaving(false)
    }
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
              {/* MOCK: The make and model lists still come from the fixture
                  catalog; their real source is undecided (ADR 0004). */}
              <select id="make" name="make" value={values.make} onChange={handleMakeChange}>
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
                value={values.model}
                onChange={(event) => setField('model', event.target.value)}
                disabled={values.make === ''}
              >
                <option value="">
                  {values.make === '' ? 'Scegli prima la marca' : 'Seleziona un modello…'}
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
                value={values.plate}
                onChange={(event) => setField('plate', event.target.value)}
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
                value={values.year}
                onChange={(event) => setField('year', event.target.value)}
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
                value={values.mileageKm}
                onChange={(event) => setField('mileageKm', event.target.value)}
              />
              <span className="hint">
                Lascia vuoto se l’auto è nuova: contiamo 0 km. Serve a stimare il
                prossimo tagliando.
              </span>
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
            {STANDARD_DEADLINE_TYPES.map((type) => (
              <div className="field" key={type}>
                <label htmlFor={`deadline-${type}`}>{DEADLINE_LABELS[type]}</label>
                <input
                  id={`deadline-${type}`}
                  name={`deadline-${type}`}
                  type="date"
                  value={values.deadlines[type]}
                  onChange={(event) => setDeadline(type, event.target.value)}
                />
              </div>
            ))}
          </div>

          <div className={styles.customBlock}>
            <h3 className={styles.customTitle}>Altre scadenze</h3>
            <p className="muted">
              Aggiungi ciò che vuoi ricordare e che non rientra nelle quattro
              voci qui sopra: gomme invernali, cambio batteria, bollino blu…
            </p>

            {values.customDeadlines.map((draft) => (
              <div className={styles.customRow} key={draft.key}>
                <div className="field">
                  <label htmlFor={`custom-title-${draft.key}`}>Descrizione</label>
                  <input
                    id={`custom-title-${draft.key}`}
                    type="text"
                    maxLength={80}
                    placeholder="es. Gomme invernali"
                    value={draft.title}
                    onChange={(event) =>
                      updateCustomDeadline(draft.key, 'title', event.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor={`custom-date-${draft.key}`}>Scadenza</label>
                  <input
                    id={`custom-date-${draft.key}`}
                    type="date"
                    value={draft.dueDate}
                    onChange={(event) =>
                      updateCustomDeadline(draft.key, 'dueDate', event.target.value)
                    }
                  />
                </div>

                <button
                  type="button"
                  className={`btn btn-secondary ${styles.customRemove}`}
                  onClick={() => removeCustomDeadline(draft.key)}
                  aria-label={
                    draft.title.trim()
                      ? `Rimuovi ${draft.title.trim()}`
                      : 'Rimuovi questa scadenza'
                  }
                >
                  Rimuovi
                </button>
              </div>
            ))}

            <button type="button" className="btn" onClick={addCustomDeadline}>
              + Aggiungi una scadenza
            </button>
          </div>
        </section>

        {saveError && (
          <div className={styles.formError} role="alert">
            <p>{saveError}</p>
            {fieldErrors.length > 0 && (
              <ul>
                {fieldErrors.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className={styles.formActions}>
          <Link
            to={vehicle ? `/veicoli/${vehicle.id}` : '/veicoli'}
            className="btn btn-secondary"
          >
            Annulla
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving
              ? 'Salvataggio…'
              : mode === 'create'
                ? 'Aggiungi veicolo'
                : 'Salva modifiche'}
          </button>
        </div>
      </form>
    </>
  )
}
