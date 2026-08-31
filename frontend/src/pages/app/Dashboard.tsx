/**
 * Dashboard: every deadline of every vehicle, grouped by how soon it needs
 * attention.
 */
import { Link } from 'react-router'
import { DeadlineRow } from '../../components/DeadlineRow'
import { EmptyState } from '../../components/EmptyState'
import {
  countNeedingAttention,
  getAllDeadlinesByUrgency,
  getDeadlineStatus,
} from '../../lib/deadlines'
import { mockVehicles } from '../../mocks/vehicles'
import { mockUser } from '../../mocks/user'
import type { DeadlineStatus, DeadlineWithVehicle } from '../../types'
import styles from './Dashboard.module.css'

/**
 * The sections the dashboard is split into, ordered from most to least urgent.
 *
 * Declared as data rather than as repeated markup so the order, the copy and
 * the states that feed each section stay in one place. `expired` and `urgent`
 * share a section because both call for the same response: act now.
 */
const SECTIONS: { key: string; title: string; hint: string; statuses: DeadlineStatus[] }[] = [
  {
    key: 'attention',
    title: 'Da gestire subito',
    hint: 'Scadenze già passate o in arrivo entro 15 giorni.',
    statuses: ['expired', 'urgent'],
  },
  {
    key: 'upcoming',
    title: 'In avvicinamento',
    hint: 'Scadenze entro 45 giorni: puoi organizzarti con calma.',
    statuses: ['upcoming'],
  },
  {
    key: 'ok',
    title: 'In regola',
    hint: 'Tutto il resto, in ordine di data.',
    statuses: ['ok'],
  },
  {
    key: 'paused',
    title: 'In pausa',
    hint: 'Coperture sospese: non generano promemoria.',
    statuses: ['paused'],
  },
]

/**
 * Renders the summary tiles and the grouped deadline lists. This is the landing
 * screen of the signed-in area.
 */
export function Dashboard() {
  // MOCK: Static import of the fixture; the API call will replace this line.
  const vehicles = mockVehicles
  const allDeadlines = getAllDeadlinesByUrgency(vehicles)
  const attentionCount = countNeedingAttention(vehicles)

  // Bucket the already-sorted list once, so each section can be rendered by
  // lookup instead of filtering the whole list again per section. Ordering
  // within a bucket is inherited from `getAllDeadlinesByUrgency`.
  const groups = new Map<string, DeadlineWithVehicle[]>(
    SECTIONS.map((section) => [
      section.key,
      allDeadlines.filter((item) =>
        section.statuses.includes(getDeadlineStatus(item.deadline)),
      ),
    ]),
  )

  return (
    <>
      <div className="page-header">
        <div>
          {/* MOCK: First name of the fixture user; there is no session yet. */}
          <h1>Ciao {mockUser.name.split(' ')[0]}</h1>
          <p>
            {attentionCount > 0
              ? `Ci sono ${attentionCount} scadenze che richiedono la tua attenzione.`
              : 'Nessuna scadenza urgente: sei in pari.'}
          </p>
        </div>
        <Link to="/veicoli/nuovo" className="btn btn-primary">
          + Aggiungi veicolo
        </Link>
      </div>

      <section className={styles.stats} aria-label="Riepilogo">
        <div className={`card ${styles.stat}`}>
          <span className={styles.statValue}>{vehicles.length}</span>
          <span className={styles.statLabel}>Veicoli registrati</span>
        </div>
        <div className={`card ${styles.stat} ${attentionCount > 0 ? styles.statAlert : ''}`}>
          <span className={styles.statValue}>{attentionCount}</span>
          <span className={styles.statLabel}>Da gestire subito</span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.statValue}>{allDeadlines.length}</span>
          <span className={styles.statLabel}>Scadenze monitorate</span>
        </div>
      </section>

      {allDeadlines.length === 0 ? (
        <EmptyState
          title="Nessuna scadenza da mostrare"
          description="Aggiungi il tuo primo veicolo per iniziare a ricevere i promemoria."
          action={
            <Link to="/veicoli/nuovo" className="btn btn-primary">
              Aggiungi veicolo
            </Link>
          }
        />
      ) : (
        SECTIONS.map((section) => {
          const items = groups.get(section.key) ?? []
          // Hide sections with nothing in them rather than showing an empty
          // heading: a user in good standing should not see four empty lists.
          if (items.length === 0) return null

          return (
            <section key={section.key} className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>
                  {section.title} <span className={styles.count}>{items.length}</span>
                </h2>
                <p className={styles.sectionHint}>{section.hint}</p>
              </div>
              <ul className={styles.list}>
                {items.map(({ deadline, vehicle }) => (
                  <DeadlineRow key={deadline.id} deadline={deadline} vehicle={vehicle} />
                ))}
              </ul>
            </section>
          )
        })
      )}
    </>
  )
}
