/**
 * Grid of the user's vehicles.
 */
import { Link } from 'react-router'
import { EmptyState } from '../../components/EmptyState'
import { VehicleCard } from '../../components/VehicleCard'
import { mockVehicles } from '../../mocks/vehicles'
import styles from './VehicleList.module.css'

/** Renders every vehicle as a card, or an empty state when there are none. */
export function VehicleList() {
  // MOCK: Static import of the fixture. This is the seam where the vehicles
  // list will be fetched from `GET /api/vehicles`.
  const vehicles = mockVehicles

  return (
    <>
      <div className="page-header">
        <div>
          <h1>I miei veicoli</h1>
          <p>
            {vehicles.length === 1
              ? '1 veicolo registrato'
              : `${vehicles.length} veicoli registrati`}
          </p>
        </div>
        <Link to="/veicoli/nuovo" className="btn btn-primary">
          + Aggiungi veicolo
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          title="Non hai ancora registrato veicoli"
          description="Aggiungi la tua auto per tenere traccia di bollo, assicurazione, revisione e tagliando."
          action={
            <Link to="/veicoli/nuovo" className="btn btn-primary">
              Aggiungi il primo veicolo
            </Link>
          }
        />
      ) : (
        <div className={styles.grid}>
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </>
  )
}
