/**
 * Grid of the user's vehicles.
 */
import { Link } from 'react-router'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { VehicleCard } from '../../components/VehicleCard'
import { useVehicles } from '../../hooks/useVehicles'
import styles from './VehicleList.module.css'

/**
 * Renders every vehicle as a card, or an empty state when there are none.
 *
 * The three remote states are rendered apart on purpose (ADR 0007): an empty
 * list and a failed request look alike but mean opposite things.
 */
export function VehicleList() {
  const { data: vehicles, loading, error, reload } = useVehicles()

  const count = vehicles?.length ?? 0

  return (
    <>
      <div className="page-header">
        <div>
          <h1>I miei veicoli</h1>
          <p>
            {loading
              ? 'Caricamento…'
              : count === 1
                ? '1 veicolo registrato'
                : `${count} veicoli registrati`}
          </p>
        </div>
        <Link to="/veicoli/nuovo" className="btn btn-primary">
          + Aggiungi veicolo
        </Link>
      </div>

      {loading ? (
        <LoadingState label="Caricamento dei veicoli…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : count === 0 ? (
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
          {vehicles?.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </>
  )
}
