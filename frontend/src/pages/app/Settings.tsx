/**
 * Account details and push notification preferences.
 */
import { useState, type FormEvent } from 'react'
import {
  DAYS_BEFORE_OPTIONS,
  mockNotificationPreferences,
  mockUser,
} from '../../mocks/user'
import styles from './Settings.module.css'

/**
 * Renders the settings form.
 *
 * The notification controls are stateful even though nothing is persisted, so
 * the lead-time fieldset can be disabled the moment push is switched off.
 *
 * MOCK: Both fields are seeded from the fixture and reset on reload. Enabling
 * push will also have to request browser permission and register a service
 * worker subscription, neither of which exists yet.
 */
export function Settings() {
  const [pushEnabled, setPushEnabled] = useState(mockNotificationPreferences.pushEnabled)
  const [daysBefore, setDaysBefore] = useState(mockNotificationPreferences.daysBefore)

  // MOCK: Inert handler — preferences are not saved.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <div className={styles.wrapper}>
      <div className="page-header">
        <div>
          <h1>Impostazioni</h1>
          <p>Dati dell'account e preferenze dei promemoria.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <section className="card">
          <h2 className={styles.sectionTitle}>Account</h2>

          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" name="name" type="text" defaultValue={mockUser.name} />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={mockUser.email} />
          </div>

          <div className="field">
            <label htmlFor="password">Nuova password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" />
            <span className="hint">Lascia vuoto per non modificarla.</span>
          </div>
        </section>

        <section className="card">
          <h2 className={styles.sectionTitle}>Notifiche</h2>

          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={(event) => setPushEnabled(event.target.checked)}
            />
            <span>
              Ricevi notifiche push
              <span className="hint">
                Su iPhone funzionano da iOS 16.4 e solo se Cardue è stata aggiunta
                alla schermata home.
              </span>
            </span>
          </label>

          <fieldset className={styles.fieldset} disabled={!pushEnabled}>
            <legend className={styles.legend}>Giorni di anticipo dell'avviso</legend>
            <div className={styles.options}>
              {DAYS_BEFORE_OPTIONS.map((days) => (
                <label key={days} className={styles.option}>
                  <input
                    type="radio"
                    name="daysBefore"
                    value={days}
                    checked={daysBefore === days}
                    onChange={() => setDaysBefore(days)}
                  />
                  <span>{days} giorni prima</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary">
            Salva preferenze
          </button>
        </div>

        <p className={`muted ${styles.note}`}>
          Interfaccia dimostrativa: le preferenze non vengono ancora salvate.
        </p>
      </form>
    </div>
  )
}
