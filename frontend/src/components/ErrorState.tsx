/**
 * Message shown when a request failed.
 */
import { EmptyState } from './EmptyState'

interface ErrorStateProps {
  /** The message from the API client, already human-readable. */
  message: string
  /** Runs the request again. */
  onRetry: () => void
}

/**
 * Renders a failure with a way out of it.
 *
 * A failed request must never look like an empty list: "you have no vehicles"
 * and "we could not read your vehicles" call for opposite reactions from the
 * user, so they get different words and a retry button (ADR 0007).
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      title="Qualcosa è andato storto"
      description={message}
      action={
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Riprova
        </button>
      }
    />
  )
}
