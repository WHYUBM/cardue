/**
 * Colored pill that conveys the urgency of a deadline at a glance.
 */
import type { DeadlineStatus } from '../types'
import { STATUS_LABELS } from '../lib/format'
import styles from './DeadlineBadge.module.css'

interface DeadlineBadgeProps {
  /** Deadline state; selects both the label and the color of the pill. */
  status: DeadlineStatus
  /** Optional trailing detail, such as "tra 9 giorni". */
  detail?: string
}

/**
 * Renders the label for `status`, optionally followed by `detail`.
 *
 * The dot is `aria-hidden` because it only repeats the color coding: the state
 * is already spelled out in the adjacent text, so screen readers would
 * otherwise announce it twice.
 */
export function DeadlineBadge({ status, detail }: DeadlineBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      <span className={styles.dot} aria-hidden="true" />
      {STATUS_LABELS[status]}
      {detail && <span className={styles.detail}>· {detail}</span>}
    </span>
  )
}
