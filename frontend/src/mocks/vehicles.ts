/**
 * MOCK: Fake vehicles used to build the interface — no network calls, no
 * persistence. Replace this module with real requests once the backend exposes
 * `/api/vehicles`.
 */
import type { Vehicle } from '../types'

/**
 * Returns the ISO date `days` from today.
 *
 * Due dates are computed relative to today rather than hardcoded so the fixture
 * keeps covering every state — expired, urgent, upcoming, ok — however long
 * after it was written the app is opened.
 */
function inDays(days: number): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

/** MOCK: The user's vehicles, spanning every deadline state on purpose. */
export const mockVehicles: Vehicle[] = [
  {
    id: '1',
    make: 'Fiat',
    model: 'Panda',
    year: 2019,
    plate: 'GH456KL',
    mileageKm: 78_400,
    deadlines: [
      {
        id: '1-bollo',
        vehicleId: '1',
        type: 'bollo',
        dueDate: inDays(-12),
        notes: 'Pagamento tramite PagoPA',
      },
      { id: '1-assicurazione', vehicleId: '1', type: 'assicurazione', dueDate: inDays(9) },
      { id: '1-revisione', vehicleId: '1', type: 'revisione', dueDate: inDays(212) },
      {
        id: '1-tagliando',
        vehicleId: '1',
        type: 'tagliando',
        dueDate: inDays(31),
        notes: 'Officina di fiducia, ultimo cambio olio a 68.000 km',
      },
    ],
  },
  {
    id: '2',
    make: 'Volkswagen',
    model: 'Golf',
    year: 2016,
    plate: 'EX789YZ',
    mileageKm: 142_900,
    deadlines: [
      { id: '2-bollo', vehicleId: '2', type: 'bollo', dueDate: inDays(63) },
      {
        id: '2-assicurazione',
        vehicleId: '2',
        type: 'assicurazione',
        dueDate: inDays(-40),
        paused: true,
        notes: 'Polizza sospesa da marzo, auto ferma in garage',
      },
      { id: '2-revisione', vehicleId: '2', type: 'revisione', dueDate: inDays(5) },
      { id: '2-tagliando', vehicleId: '2', type: 'tagliando', dueDate: inDays(-3) },
    ],
  },
  {
    id: '3',
    make: 'Toyota',
    model: 'Yaris',
    year: 2021,
    plate: 'GA123BC',
    mileageKm: 34_100,
    deadlines: [
      { id: '3-bollo', vehicleId: '3', type: 'bollo', dueDate: inDays(124) },
      { id: '3-assicurazione', vehicleId: '3', type: 'assicurazione', dueDate: inDays(88) },
      { id: '3-revisione', vehicleId: '3', type: 'revisione', dueDate: inDays(301) },
      { id: '3-tagliando', vehicleId: '3', type: 'tagliando', dueDate: inDays(74) },
    ],
  },
]

/**
 * MOCK: Looks a vehicle up by id, standing in for the future
 * `GET /api/vehicles/:id`. Returns `undefined` for an unknown id so callers
 * render the not-found page instead of crashing.
 */
export function findVehicle(id: string | undefined): Vehicle | undefined {
  return mockVehicles.find((vehicle) => vehicle.id === id)
}
