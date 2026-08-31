/**
 * Presentation helpers: turn domain values into the Italian strings shown in
 * the interface.
 *
 * Formatting lives here rather than in the components so that dates, plates and
 * distances read the same on every screen. All output is Italian by design —
 * the interface language — while the code around it stays English.
 */
import type {
  Deadline,
  DeadlineStatus,
  DeadlineType,
  StandardDeadlineType,
} from '../types'

/** The four fixed kinds, in the order the interface presents them. */
export const STANDARD_DEADLINE_TYPES: StandardDeadlineType[] = [
  'bollo',
  'assicurazione',
  'revisione',
  'tagliando',
]

/** Human-readable labels for the deadline kinds. */
export const DEADLINE_LABELS: Record<DeadlineType, string> = {
  bollo: 'Bollo',
  assicurazione: 'Assicurazione',
  revisione: 'Revisione',
  tagliando: 'Tagliando',
  // Only a fallback: a custom deadline is shown by its title, and reaches this
  // label only if one is somehow missing.
  custom: 'Scadenza personalizzata',
}

/**
 * The name to show for a deadline.
 *
 * Standard kinds are named by their type, custom ones by the title the user
 * gave them. Every place that displays a deadline goes through here, so the two
 * cases cannot drift apart screen by screen.
 */
export function deadlineName(deadline: Pick<Deadline, 'type' | 'title'>): string {
  return deadline.title?.trim() || DEADLINE_LABELS[deadline.type]
}

/** Human-readable labels for the deadline states. */
export const STATUS_LABELS: Record<DeadlineStatus, string> = {
  expired: 'Scaduta',
  urgent: 'Urgente',
  upcoming: 'In avvicinamento',
  ok: 'In regola',
  paused: 'In pausa',
}

/**
 * Formats an ISO `YYYY-MM-DD` date in long Italian form.
 *
 * As in `daysUntil`, the `T00:00:00` suffix forces local-time parsing so the
 * displayed day never shifts because of the timezone offset.
 */
export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Formats an ISO date in short numeric form, for dense lists and tables. */
export function formatDateShort(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('it-IT')
}

/**
 * Groups a plate for readability: `AB123CD` becomes `AB 123 CD`.
 *
 * Only the current Italian format is recognised; anything else — an older
 * format, or a plate the user typed differently — is returned untouched rather
 * than mangled.
 */
export function formatPlate(plate: string): string {
  const match = /^([A-Z]{2})(\d{3})([A-Z]{2})$/.exec(plate)
  return match ? `${match[1]} ${match[2]} ${match[3]}` : plate
}

/** Formats a distance in kilometres with thousands separators. */
export function formatMileage(km: number): string {
  return `${km.toLocaleString('it-IT')} km`
}

/**
 * Describes how long is left before a deadline, or how long it has been
 * overdue. Produces, for example, "scaduta da 12 giorni", "scade oggi" or
 * "tra 34 giorni".
 *
 * @param days Result of `daysUntil`; negative values read as overdue.
 */
export function formatRemaining(days: number): string {
  if (days < 0) {
    const late = Math.abs(days)
    return late === 1 ? 'scaduta da 1 giorno' : `scaduta da ${late} giorni`
  }
  if (days === 0) return 'scade oggi'
  if (days === 1) return 'tra 1 giorno'
  return `tra ${days} giorni`
}
