/**
 * Not-found page.
 */
import { Link } from 'react-router'
import { EmptyState } from '../components/EmptyState'

interface NotFoundProps {
  /**
   * Where the recovery link points. Defaults to the landing page, which is the
   * right destination for an unknown URL; pages that render this for a missing
   * record pass the list they belong to instead.
   */
  to?: string
  /** Label of the recovery link. */
  label?: string
}

/**
 * Shown for an unknown route, and also rendered directly by pages that look up
 * a record by id and find nothing.
 *
 * The recovery link never points at the page the user came from: that is the
 * URL that just failed.
 */
export function NotFound({
  to = '/',
  label = 'Torna alla pagina iniziale',
}: NotFoundProps) {
  return (
    <EmptyState
      title="Pagina non trovata"
      description="L'indirizzo che hai aperto non corrisponde a nessuna pagina di Cardue."
      action={
        <Link to={to} className="btn btn-primary">
          {label}
        </Link>
      }
    />
  )
}
