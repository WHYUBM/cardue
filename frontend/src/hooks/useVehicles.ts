/**
 * Vehicle resources, ready for a page to render.
 */
import { ApiError } from '../lib/api'
import { getVehicle, listVehicles } from '../lib/vehicles-api'
import type { Vehicle } from '../types'
import { useApiResource, type ApiResource } from './useApiResource'

/** Every vehicle of the user, with their deadlines. */
export function useVehicles(): ApiResource<Vehicle[]> {
  return useApiResource<Vehicle[]>((signal) => listVehicles(signal), 'vehicles')
}

/**
 * A single vehicle by id.
 *
 * `id` comes from the route params and is therefore `string | undefined`. A
 * missing id is rejected as a 404 without a round trip — there is nothing the
 * server could be asked — using the same error type a real 404 would produce,
 * so the page has one case to handle instead of two.
 */
export function useVehicle(id: string | undefined): ApiResource<Vehicle> {
  return useApiResource<Vehicle>(
    (signal) =>
      id
        ? getVehicle(id, signal)
        : Promise.reject(new ApiError(404, 'Veicolo non trovato')),
    `vehicle:${id ?? 'none'}`,
  )
}
