/**
 * Shared domain types for Cardue.
 *
 * Used by both the mock data and the components: until the backend exists,
 * this file is the only definition of the shape of the data.
 *
 * TODO: This is the draft domain model. When the backend defines its entities,
 * reconcile them with this file instead of duplicating it — two definitions
 * drifting apart would be the project's first real inconsistency.
 */

/** The four deadline kinds the application tracks. */
export type DeadlineType = 'bollo' | 'assicurazione' | 'revisione' | 'tagliando'

/**
 * State of a deadline, derived from its due date and whether it is paused.
 *
 * This is never stored: `getDeadlineStatus` computes it on read. The database
 * must persist the date, never the resulting label, otherwise the two would
 * fall out of sync as time passes.
 */
export type DeadlineStatus =
  | 'expired' // due date already passed
  | 'urgent' // due within 15 days
  | 'upcoming' // due within 45 days
  | 'ok' // due later than 45 days
  | 'paused' // insurance suspended: raises no reminders

/** A single deadline belonging to a vehicle. */
export interface Deadline {
  id: string
  vehicleId: string
  type: DeadlineType
  /** Due date as an ISO `YYYY-MM-DD` string, with no time component. */
  dueDate: string
  /** Free-form user notes, such as the insurer or the garage. */
  notes?: string
  /**
   * Insurance only: the policy is suspended, so no reminder is raised. Used
   * when a vehicle is off the road but the deadline should stay visible.
   */
  paused?: boolean
}

/** A vehicle owned by the user, together with its deadlines. */
export interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  /** Plate in uppercase with no spaces; `formatPlate` handles presentation. */
  plate: string
  mileageKm?: number
  deadlines: Deadline[]
}

/**
 * A deadline paired with the vehicle it belongs to.
 *
 * Deadlines are nested inside vehicles, so aggregate views that span vehicles
 * (the dashboard) need to carry the owner alongside each deadline.
 */
export interface DeadlineWithVehicle {
  deadline: Deadline
  vehicle: Vehicle
}

/**
 * A recommended maintenance interval for a model.
 *
 * Both bounds are optional and independent: some tasks are time-based, some
 * distance-based, and some are due at whichever comes first.
 */
export interface MaintenanceInterval {
  label: string
  everyMonths?: number
  everyKm?: number
}

/** A model in the make-to-model catalog. */
export interface CatalogModel {
  id: string
  name: string
  /** Production years as a display string, for example "2014-2021". */
  years: string
  intervals: MaintenanceInterval[]
}

/** A make in the catalog, with the models produced under it. */
export interface CatalogMake {
  id: string
  name: string
  models: CatalogModel[]
}

/** The user's account. */
export interface User {
  id: string
  name: string
  email: string
}

/** Push notification preferences. */
export interface NotificationPreferences {
  pushEnabled: boolean
  /** How many days before the due date the reminder is sent. */
  daysBefore: number
}
