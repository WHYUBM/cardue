/**
 * List row for a single deadline, shared between the dashboard and the vehicle
 * detail page.
 */
import { Link } from 'react-router'
import type { Deadline, Vehicle } from '../types'
import { daysUntil, getDeadlineStatus } from '../lib/deadlines'
import { deadlineName, formatDate, formatPlate, formatRemaining } from '../lib/format'
import { DeadlineBadge } from './DeadlineBadge'
import styles from './DeadlineRow.module.css'

interface DeadlineRowProps {
  /** The deadline to render; its state is derived, never passed in. */
  deadline: Deadline
  /** When set, the row shows which vehicle the deadline belongs to. Omitted on
   *  the vehicle detail page, where the owner is already obvious. */
  vehicle?: Vehicle
  /** When set, the row shows the button that opens the management modal. */
  onManage?: (deadline: Deadline) => void
}

/**
 * Renders one deadline with its date, notes and urgency badge.
 *
 * The colored stripe on the left repeats what the badge already says, so
 * urgency stays readable while scanning a long list without reading each row.
 */
export function DeadlineRow({ deadline, vehicle, onManage }: DeadlineRowProps) {
  const status = getDeadlineStatus(deadline)

  return (
    <li className={`${styles.row} ${styles[status]}`}>
      <div className={styles.main}>
        <div className={styles.titleLine}>
          <span className={styles.type}>{deadlineName(deadline)}</span>
          {vehicle && (
            <Link to={`/veicoli/${vehicle.id}`} className={styles.vehicle}>
              {vehicle.make} {vehicle.model} · {formatPlate(vehicle.plate)}
            </Link>
          )}
        </div>
        <p className={styles.date}>{formatDate(deadline.dueDate)}</p>
        {deadline.notes && <p className={styles.notes}>{deadline.notes}</p>}
      </div>

      <div className={styles.side}>
        {/* A paused deadline gets no countdown: the remaining days are
            meaningless while the policy is suspended. */}
        <DeadlineBadge
          status={status}
          detail={deadline.paused ? undefined : formatRemaining(daysUntil(deadline.dueDate))}
        />
        {onManage && (
          <button type="button" className="btn btn-secondary" onClick={() => onManage(deadline)}>
            Gestisci
          </button>
        )}
      </div>
    </li>
  )
}
