/**
 * Placeholder shown while a request is in flight.
 */
import styles from './LoadingState.module.css'

interface LoadingStateProps {
  /** What is being loaded, for screen readers and for the visible label. */
  label?: string
}

/** Renders a neutral "loading" line, announced to assistive technology. */
export function LoadingState({ label = 'Caricamento…' }: LoadingStateProps) {
  return (
    <p className={styles.loading} role="status" aria-live="polite">
      {label}
    </p>
  )
}
