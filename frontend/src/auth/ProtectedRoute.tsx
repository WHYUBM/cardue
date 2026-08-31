/**
 * Gate in front of the signed-in area.
 */
import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingState } from '../components/LoadingState'
import { useSession } from './useSession'

/**
 * Lets through only what has a session, and remembers where it was going.
 *
 * The redirect carries `returnTo`, so signing in from a link to a vehicle comes
 * back to that vehicle rather than dumping the user on the dashboard.
 */
export function ProtectedRoute() {
  const { account, checking } = useSession()
  const location = useLocation()

  // Only while there is nothing to show: with a local marker this is skipped
  // entirely, and the app renders offline.
  if (checking) return <LoadingState label="Verifica della sessione…" />

  if (!account) {
    const returnTo = `${location.pathname}${location.search}`
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }

  return <Outlet />
}
