/**
 * Summary card for one vehicle, used in the "I miei veicoli" grid.
 */
import { Link } from 'react-router'
import type { Vehicle } from '../types'
import { getDeadlineStatus, getNextDeadline, daysUntil } from '../lib/deadlines'
import { DEADLINE_LABELS, formatDateShort, formatPlate, formatRemaining } from '../lib/format'
import { DeadlineBadge } from './DeadlineBadge'
import styles from './VehicleCard.module.css'

interface VehicleCardProps {
  vehicle: Vehicle
}

/**
 * Renders the vehicle identity plus its most urgent actionable deadline.
 *
 * `getNextDeadline` never returns a paused deadline, so the badge here always
 * carries a countdown — unlike `DeadlineRow`, which also renders paused ones.
 *
 * The whole card is a link rather than just the title, to give a comfortable
 * tap target on the phone-sized layout the grid collapses to.
 */
export function VehicleCard({ vehicle }: VehicleCardProps) {
  const next = getNextDeadline(vehicle)

  return (
    <Link to={`/veicoli/${vehicle.id}`} className={`card ${styles.card}`}>
      <div className={styles.head}>
        <h3 className={styles.title}>
          {vehicle.make} {vehicle.model}
        </h3>
        <span className={styles.plate}>{formatPlate(vehicle.plate)}</span>
      </div>

      <p className={styles.meta}>
        Immatricolata nel {vehicle.year}
        {vehicle.mileageKm !== undefined && ` · ${vehicle.mileageKm.toLocaleString('it-IT')} km`}
      </p>

      <div className={styles.next}>
        {next ? (
          <>
            <span className={styles.nextLabel}>
              Prossima scadenza: <strong>{DEADLINE_LABELS[next.type]}</strong>{' '}
              ({formatDateShort(next.dueDate)})
            </span>
            <DeadlineBadge
              status={getDeadlineStatus(next)}
              detail={formatRemaining(daysUntil(next.dueDate))}
            />
          </>
        ) : (
          // Covers both "no deadlines at all" and "every deadline is paused":
          // in either case there is nothing for the owner to plan for.
          <span className="muted">Nessuna scadenza in programma</span>
        )}
      </div>
    </Link>
  )
}
