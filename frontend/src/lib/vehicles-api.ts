/**
 * The vehicle endpoints, typed.
 *
 * One module per resource, so a page never builds a URL or shapes a payload by
 * hand. Free of React (ADR 0007): the hooks in `src/hooks/` add the lifecycle.
 */
import type { DeadlineType, Vehicle } from '../types'
import { api } from './api'

/** A deadline as it is sent to the API, nested inside a vehicle payload. */
export interface DeadlinePayload {
  type: DeadlineType
  /**
   * Name of a custom deadline. Required when `type` is `'custom'`, rejected by
   * the API on the standard kinds, which are named after their type.
   */
  title?: string
  /** ISO `YYYY-MM-DD`. */
  dueDate: string
  notes?: string
  paused?: boolean
}

/**
 * The body of a create request.
 *
 * `mileageKm` is optional because the backend reads its absence as "new
 * vehicle" and stores 0 — the interface must not send 0 itself, or an empty
 * field would become indistinguishable from a deliberate zero.
 */
export interface CreateVehiclePayload {
  make: string
  model: string
  year: number
  plate: string
  mileageKm?: number
  deadlines?: DeadlinePayload[]
}

/**
 * The body of an update request: every field optional.
 *
 * Sending only `{ mileageKm }` is a complete request, which is what makes
 * correcting the odometer cheap. When `deadlines` is present it **replaces**
 * the whole set, so callers must send every deadline they want to keep.
 */
export type UpdateVehiclePayload = Partial<CreateVehiclePayload>

export function listVehicles(signal?: AbortSignal): Promise<Vehicle[]> {
  return api.get<Vehicle[]>('/vehicles', { signal })
}

export function getVehicle(id: string, signal?: AbortSignal): Promise<Vehicle> {
  return api.get<Vehicle>(`/vehicles/${id}`, { signal })
}

export function createVehicle(payload: CreateVehiclePayload): Promise<Vehicle> {
  return api.post<Vehicle>('/vehicles', payload)
}

export function updateVehicle(
  id: string,
  payload: UpdateVehiclePayload,
): Promise<Vehicle> {
  return api.patch<Vehicle>(`/vehicles/${id}`, payload)
}

export function deleteVehicle(id: string): Promise<void> {
  return api.delete(`/vehicles/${id}`)
}
