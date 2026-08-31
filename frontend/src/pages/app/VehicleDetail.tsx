/**
 * Vehicle detail page: identity, deadlines and the actions available on them.
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { DeadlineRow } from '../../components/DeadlineRow'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { Modal } from '../../components/Modal'
import { useVehicle } from '../../hooks/useVehicles'
import { daysUntil, getDeadlineStatus, sortByUrgency } from '../../lib/deadlines'
import { deadlineName, formatMileage, formatPlate, formatRemaining } from '../../lib/format'
import { deleteVehicle, updateVehicle, type DeadlinePayload } from '../../lib/vehicles-api'
import type { Deadline, Vehicle } from '../../types'
import { NotFound } from '../NotFound'
import styles from './VehicleDetail.module.css'

/**
 * Renders the vehicle identity, its specs and its deadlines.
 *
 * Editing a single deadline happens in a modal rather than on its own route, so
 * the user keeps the vehicle in view while changing one of its dates.
 */
export function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: vehicle, loading, error, notFound, reload } = useVehicle(id)

  // `managing` holds the deadline currently open in the modal, `null` when the
  // modal is closed; `confirmingDelete` gates the delete confirmation.
  const [managing, setManaging] = useState<Deadline | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (loading) return <LoadingState label="Caricamento del veicolo…" />

  // An unknown or malformed id is a 404, not an empty detail page. Any other
  // failure is a transient problem and gets a retry instead.
  if (notFound) return <NotFound to="/veicoli" label="I miei veicoli" />
  if (error || !vehicle) {
    return <ErrorState message={error ?? 'Veicolo non disponibile.'} onRetry={reload} />
  }

  const deadlines = sortByUrgency(
    vehicle.deadlines.map((deadline) => ({ deadline, vehicle })),
  )
  // Insurance is singled out because it is the only kind that can be paused,
  // which earns it a shortcut in the header actions.
  const insurance = vehicle.deadlines.find(
    (deadline) => deadline.type === 'assicurazione',
  )

  async function handleDelete() {
    if (!vehicle) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteVehicle(vehicle.id)
      // Leave for the list: staying would show a detail page for a vehicle that
      // no longer exists.
      await navigate('/veicoli')
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Eliminazione fallita.')
      setDeleting(false)
    }
  }

  return (
    <>
      <p className={styles.breadcrumb}>
        <Link to="/veicoli">← I miei veicoli</Link>
      </p>

      <div className="page-header">
        <div>
          <h1 className={styles.title}>
            {vehicle.make} {vehicle.model}
            <span className={styles.plate}>{formatPlate(vehicle.plate)}</span>
          </h1>
          <p>Immatricolata nel {vehicle.year}</p>
        </div>
        <div className={styles.actions}>
          <Link to={`/veicoli/${vehicle.id}/modifica`} className="btn btn-secondary">
            Modifica
          </Link>
          {insurance && (
            <button
              type="button"
              className="btn"
              onClick={() => setManaging(insurance)}
            >
              {insurance.paused ? 'Riattiva assicurazione' : 'Metti in pausa assicurazione'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setConfirmingDelete(true)}
          >
            Elimina
          </button>
        </div>
      </div>

      <section className={`card ${styles.specs}`} aria-label="Dati del veicolo">
        <div className={styles.spec}>
          <span className={styles.specLabel}>Marca</span>
          <span className={styles.specValue}>{vehicle.make}</span>
        </div>
        <div className={styles.spec}>
          <span className={styles.specLabel}>Modello</span>
          <span className={styles.specValue}>{vehicle.model}</span>
        </div>
        <div className={styles.spec}>
          <span className={styles.specLabel}>Anno</span>
          <span className={styles.specValue}>{vehicle.year}</span>
        </div>
        <div className={styles.spec}>
          <span className={styles.specLabel}>Targa</span>
          <span className={styles.specValue}>{formatPlate(vehicle.plate)}</span>
        </div>
        <div className={styles.spec}>
          <span className={styles.specLabel}>Chilometraggio</span>
          <span className={styles.specValue}>{formatMileage(vehicle.mileageKm)}</span>
        </div>
      </section>

      <section className={styles.deadlines}>
        <h2>Scadenze</h2>
        <ul className={styles.list}>
          {deadlines.map(({ deadline }) => (
            <DeadlineRow key={deadline.id} deadline={deadline} onManage={setManaging} />
          ))}
        </ul>
      </section>

      {managing && (
        <ManageDeadlineModal
          deadline={managing}
          vehicle={vehicle}
          onClose={() => setManaging(null)}
          onSaved={() => {
            setManaging(null)
            reload()
          }}
        />
      )}

      {confirmingDelete && (
        <Modal
          title="Eliminare il veicolo?"
          onClose={() => setConfirmingDelete(false)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Annulla
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminazione…' : 'Elimina definitivamente'}
              </button>
            </>
          }
        >
          <p>
            Stai per eliminare <strong>{vehicle.make} {vehicle.model}</strong> (
            {formatPlate(vehicle.plate)}) e tutte le sue scadenze. L'operazione non
            è reversibile.
          </p>
          {deleteError && <p className={styles.formError}>{deleteError}</p>}
        </Modal>
      )}
    </>
  )
}

interface ManageDeadlineModalProps {
  /** The deadline being edited. */
  deadline: Deadline
  /** Its vehicle, needed because deadlines are saved through the vehicle. */
  vehicle: Vehicle
  onClose: () => void
  onSaved: () => void
}

/**
 * Editor for a single deadline: due date, notes and, for insurance only, the
 * pause switch.
 *
 * Local to this page rather than shared, since it is the only place a deadline
 * can be edited.
 *
 * There is no endpoint for a single deadline: `PATCH /api/vehicles/:id`
 * replaces the whole set (ADR 0006). So the save below rebuilds every deadline
 * of the vehicle, substituting the edited one — sending only the edited
 * deadline would delete the other three.
 */
function ManageDeadlineModal({
  deadline,
  vehicle,
  onClose,
  onSaved,
}: ManageDeadlineModalProps) {
  const status = getDeadlineStatus(deadline)

  const isCustom = deadline.type === 'custom'

  const [title, setTitle] = useState(deadline.title ?? '')
  const [dueDate, setDueDate] = useState(deadline.dueDate)
  const [notes, setNotes] = useState(deadline.notes ?? '')
  const [paused, setPaused] = useState(deadline.paused)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)

    // Every deadline is rebuilt, so the untouched ones must be reproduced
    // faithfully — the title of the other custom deadlines included. Dropping
    // it here would not just lose a name: the API rejects a custom deadline
    // without one, and the save would fail with a 400 about a deadline the user
    // never opened.
    const deadlines: DeadlinePayload[] = vehicle.deadlines.map((current) =>
      current.id === deadline.id
        ? {
            type: current.type,
            ...(isCustom ? { title: title.trim() } : {}),
            dueDate,
            ...(notes.trim() ? { notes: notes.trim() } : {}),
            paused,
          }
        : {
            type: current.type,
            ...(current.title ? { title: current.title } : {}),
            dueDate: current.dueDate,
            ...(current.notes ? { notes: current.notes } : {}),
            paused: current.paused,
          },
    )

    try {
      await updateVehicle(vehicle.id, { deadlines })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Salvataggio fallito.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={deadlineName(deadline)}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Annulla
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || dueDate === '' || (isCustom && title.trim() === '')}
          >
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </>
      }
    >
      <p className={styles.modalStatus}>
        Stato attuale: <strong>{status === 'paused' ? 'in pausa' : formatRemaining(daysUntil(deadline.dueDate))}</strong>
      </p>

      {isCustom && (
        <div className="field">
          <label htmlFor="deadlineTitle">Descrizione</label>
          <input
            id="deadlineTitle"
            type="text"
            maxLength={80}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="dueDate">Data di scadenza</label>
        <input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="deadlineNotes">Note</label>
        <textarea
          id="deadlineNotes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Compagnia, officina, numero di polizza…"
        />
      </div>

      {deadline.type === 'assicurazione' && (
        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={paused}
            onChange={(event) => setPaused(event.target.checked)}
          />
          <span>
            Metti in pausa l'assicurazione
            <span className="hint">
              Utile con l'auto ferma: la scadenza resta visibile ma non genera
              promemoria.
            </span>
          </span>
        </label>
      )}

      {error && <p className={styles.formError}>{error}</p>}
    </Modal>
  )
}
