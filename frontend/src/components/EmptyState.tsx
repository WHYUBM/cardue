/**
 * Placeholder shown in place of an empty list.
 */
import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  /** Short statement of what is missing. */
  title: string
  /** Optional sentence explaining how to fill the gap. */
  description?: string
  /** Usually the button that starts the missing action. */
  action?: ReactNode
}

/**
 * Renders the empty-list message. Every call site passes an `action`, so the
 * user is never left at a dead end with nothing to do next.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action}
    </div>
  )
}
