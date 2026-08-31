import { useContext } from 'react'
import { SessionContext, type SessionValue } from './session-context'

/** The session, from anywhere below `SessionProvider`. */
export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) {
    throw new Error('useSession richiede SessionProvider')
  }
  return value
}
