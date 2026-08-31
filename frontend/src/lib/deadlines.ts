/**
 * Deadline logic: derives the state of a deadline from its due date and orders
 * deadlines by how soon they need attention.
 *
 * This module is deliberately free of React and of any data source, so the same
 * rules will apply unchanged once deadlines come from the API instead of the
 * mocks. The backend scheduler will need to agree with these thresholds.
 */
import type {
  Deadline,
  DeadlineStatus,
  DeadlineWithVehicle,
  Vehicle,
} from '../types'

/** Days remaining below which a deadline counts as urgent. */
export const URGENT_DAYS = 15

/** Days remaining below which a deadline counts as upcoming. */
export const UPCOMING_DAYS = 45

/**
 * Today at midnight, so date comparisons ignore the time of day and a deadline
 * does not change state partway through the day it is read.
 */
function today(): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * Days left until the given date: negative once the date has passed, `0` when
 * it falls today.
 *
 * The `T00:00:00` suffix forces local-time parsing. Passing a bare `YYYY-MM-DD`
 * to `Date` parses it as UTC, which shifts the date by a day for users behind
 * or ahead of UTC and would misreport deadlines around midnight.
 *
 * @param isoDate Due date as an ISO `YYYY-MM-DD` string.
 */
export function daysUntil(isoDate: string): number {
  const due = new Date(`${isoDate}T00:00:00`)
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((due.getTime() - today().getTime()) / msPerDay)
}

/** Derives the state of a deadline from its due date and paused flag. */
export function getDeadlineStatus(deadline: Deadline): DeadlineStatus {
  if (deadline.paused) return 'paused'
  const days = daysUntil(deadline.dueDate)
  if (days < 0) return 'expired'
  if (days <= URGENT_DAYS) return 'urgent'
  if (days <= UPCOMING_DAYS) return 'upcoming'
  return 'ok'
}

/**
 * Sort key, lowest first. Paused deadlines are pushed to the very end rather
 * than ordered by date, because a suspended policy needs no action regardless
 * of how long ago it lapsed.
 */
function sortWeight({ deadline }: DeadlineWithVehicle): number {
  if (getDeadlineStatus(deadline) === 'paused') return Number.MAX_SAFE_INTEGER
  return daysUntil(deadline.dueDate)
}

/** Flattens the deadlines of every vehicle into a single list. */
export function flattenDeadlines(vehicles: Vehicle[]): DeadlineWithVehicle[] {
  return vehicles.flatMap((vehicle) =>
    vehicle.deadlines.map((deadline) => ({ deadline, vehicle })),
  )
}

/** Orders deadlines from the most to the least urgent, without mutating the input. */
export function sortByUrgency(items: DeadlineWithVehicle[]): DeadlineWithVehicle[] {
  return [...items].sort((a, b) => sortWeight(a) - sortWeight(b))
}

/**
 * Every deadline of every vehicle, ordered by urgency. This is the view that
 * feeds the dashboard.
 */
export function getAllDeadlinesByUrgency(vehicles: Vehicle[]): DeadlineWithVehicle[] {
  return sortByUrgency(flattenDeadlines(vehicles))
}

/**
 * The most urgent deadline of a vehicle that still needs action, or `undefined`
 * when it has none.
 *
 * Paused deadlines are filtered out rather than merely sorted last: a suspended
 * policy raises no reminder, so it is not something the owner has to plan for.
 * A vehicle whose only deadline is paused therefore reports none, which is the
 * same rule `countNeedingAttention` applies.
 */
export function getNextDeadline(vehicle: Vehicle): Deadline | undefined {
  const actionable = vehicle.deadlines.filter(
    (deadline) => getDeadlineStatus(deadline) !== 'paused',
  )
  return sortByUrgency(
    actionable.map((deadline) => ({ deadline, vehicle })),
  )[0]?.deadline
}

/** Counts the deadlines that need action, meaning expired or urgent ones. */
export function countNeedingAttention(vehicles: Vehicle[]): number {
  return flattenDeadlines(vehicles).filter((item) => {
    const status = getDeadlineStatus(item.deadline)
    return status === 'expired' || status === 'urgent'
  }).length
}
