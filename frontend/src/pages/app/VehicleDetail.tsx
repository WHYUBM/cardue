/**
 * Vehicle detail page: identity, deadlines and the actions available on them.
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { DeadlineRow } from '../../components/DeadlineRow'
import { Modal } from '../../components/Modal'
import { daysUntil, getDeadlineStatus, sortByUrgency } from '../../lib/deadlines'
import { DEADLINE_LABELS, formatMileage, formatPlate, formatRemaining } from '../../lib/format'
import { findVehicle } from '../../mocks/vehicles'
import type { Deadline } from '../../types'
import { NotFound } from '../NotFound'
import styles from './VehicleDetail.module.css'

/**
 * Renders the vehicle identity, its specs and its deadlines.
 *
 * Editing a single deadline happens in a modal rather than on its own route, so
 * the user keeps the vehicle in view while changing one of its dates.
 *
 * MOCK: Read from the fixture by the `:id` route param; the destructive and
 * saving actions are disabled because there is nothing to write to.
 */
export function VehicleDetail() {
  const { id } = useParams()
  const vehicle = findVehicle(id)

  // `managing` holds the deadline currently open in the modal, `null` when the
  // modal is closed; `confirmingDelete` gates the delete confirmation.
  const [managing, setManaging] = useState<Deadline | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // An unknown or malformed id is a 404, not an empty detail page.
  if (!vehicle) return <NotFound to="/veicoli" label="I miei veicoli" />

  const deadlines = sortByUrgency(
    vehicle.deadlines.map((deadline) => ({ deadline, vehicle })),
  )
  // Insurance is singled out because it is the only kind that can be paused,
  // which earns it a shortcut in the header actions.
  const insurance = vehicle.deadlines.find(
    (deadline) => deadline.type === 'assicurazione',
  )

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
          <span className={styles.specValue}>
            {vehicle.mileageKm !== undefined ? formatMileage(vehicle.mileageKm) : '—'}
          </span>
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
        <ManageDeadlineModal deadline={managing} onClose={() => setManaging(null)} />
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
              >
                Annulla
              </button>
              <button type="button" className="btn btn-danger" disabled>
                Elimina definitivamente
              </button>
            </>
          }
        >
          <p>
            Stai per eliminare <strong>{vehicle.make} {vehicle.model}</strong> (
            {formatPlate(vehicle.plate)}) e tutte le sue scadenze. L'operazione non
            è reversibile.
          </p>
          <p className="muted">
            Interfaccia dimostrativa: l'eliminazione non è ancora collegata.
          </p>
        </Modal>
      )}
    </>
  )
}

interface ManageDeadlineModalProps {
  /** The deadline being edited. */
  deadline: Deadline
  onClose: () => void
}

/**
 * Editor for a single deadline: due date, notes and, for insurance only, the
 * pause switch.
 *
 * Local to this page rather than shared, since it is the only place a deadline
 * can be edited.
 *
 * MOCK: The fields are uncontrolled and Save is disabled — the modal shows the
 * shape of the interaction, not a working edit.
 */
function ManageDeadlineModal({ deadline, onClose }: ManageDeadlineModalProps) {
  const status = getDeadlineStatus(deadline)

  return (
    <Modal
      title={DEADLINE_LABELS[deadline.type]}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annulla
          </button>
          <button type="button" className="btn btn-primary" disabled>
            Salva
          </button>
        </>
      }
    >
      <p className={styles.modalStatus}>
        Stato attuale: <strong>{status === 'paused' ? 'in pausa' : formatRemaining(daysUntil(deadline.dueDate))}</strong>
      </p>

      <div className="field">
        <label htmlFor="dueDate">Data di scadenza</label>
        <input id="dueDate" type="date" defaultValue={deadline.dueDate} />
      </div>

      <div className="field">
        <label htmlFor="deadlineNotes">Note</label>
        <textarea
          id="deadlineNotes"
          defaultValue={deadline.notes ?? ''}
          placeholder="Compagnia, officina, numero di polizza…"
        />
      </div>

      {deadline.type === 'assicurazione' && (
        <label className={styles.checkboxField}>
          <input type="checkbox" defaultChecked={deadline.paused} />
          <span>
            Metti in pausa l'assicurazione
            <span className="hint">
              Utile con l'auto ferma: la scadenza resta visibile ma non genera
              promemoria.
            </span>
          </span>
        </label>
      )}

      <p className="muted">
        Interfaccia dimostrativa: le modifiche non vengono ancora salvate.
      </p>
    </Modal>
  )
}
