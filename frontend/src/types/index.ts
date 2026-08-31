/**
 * Shared domain types for Cardue.
 *
 * These describe what `/api/vehicles` actually returns, and are the counterpart
 * of the entities in `backend/src/vehicles/entities/`. The API also sends
 * bookkeeping fields the interface never reads (`createdAt`, `updatedAt`);
 * leaving them out keeps this file about the domain.
 *
 * TODO: The two definitions are still kept in step by hand — there is no npm
 * workspace and no shared package. Any change to the model has to be made on
 * both sides, and nothing will warn if one is forgotten.
 */

/**
 * The four deadline kinds fixed by the domain: at most one each per vehicle,
 * and their name is not up to the user.
 */
export type StandardDeadlineType =
  | 'bollo'
  | 'assicurazione'
  | 'revisione'
  | 'tagliando'

/**
 * Every deadline kind, including the user-defined one.
 *
 * A `custom` deadline is named by its `title` and may repeat within a vehicle;
 * everything else about it — date, derived status, ordering — works exactly
 * like the standard kinds.
 */
export type DeadlineType = StandardDeadlineType | 'custom'

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
  /**
   * User-given name, set only when `type` is `'custom'` and `null` otherwise:
   * a standard deadline takes its name from its type.
   */
  title: string | null
  /** Due date as an ISO `YYYY-MM-DD` string, with no time component. */
  dueDate: string
  /**
   * Free-form user notes, such as the insurer or the garage.
   *
   * `null` rather than absent: the column is nullable, and that is the shape
   * the API sends.
   */
  notes: string | null
  /**
   * Insurance only: the policy is suspended, so no reminder is raised. Used
   * when a vehicle is off the road but the deadline should stay visible.
   */
  paused: boolean
}

/** A vehicle owned by the user, together with its deadlines. */
export interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  /** Plate in uppercase with no spaces; `formatPlate` handles presentation. */
  plate: string
  /**
   * Odometer reading in kilometres. Always present: a vehicle created without
   * one is taken to be new, so the value is 0 rather than missing.
   */
  mileageKm: number
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
