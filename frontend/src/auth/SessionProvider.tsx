/**
 * Who is signed in, for the whole application.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { SessionContext } from './session-context'
import { ApiError } from '../lib/api'
import { fetchAccount, type Account } from '../lib/auth-api'
import {
  clearSessionMarker,
  readSessionMarker,
  writeSessionMarker,
} from '../lib/session-marker'

/**
 * Establishes the session at boot.
 *
 * The order matters: the local marker decides what to render *now*, the server
 * decides whether to keep it. Reversing them would mean waiting for the network
 * before the first paint, and the app would not open on a train (ADR 0009).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(() =>
    readSessionMarker(),
  )
  const [checking, setChecking] = useState(() => readSessionMarker() === null)

  const forget = useCallback(() => {
    clearSessionMarker()
    setAccount(null)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    fetchAccount(controller.signal)
      .then((confirmed) => {
        if (controller.signal.aborted) return
        writeSessionMarker(confirmed)
        setAccount(confirmed)
        setChecking(false)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return

        // A 401 is an answer: there is no session, and the marker is a lie.
        if (cause instanceof ApiError && cause.status === 401) {
          clearSessionMarker()
          setAccount(null)
        }
        // Any other failure — offline, backend down — says nothing about the
        // session, so what the marker claims is kept.
        setChecking(false)
      })

    return () => controller.abort()
  }, [])

  return (
    <SessionContext.Provider value={{ account, checking, forget }}>
      {children}
    </SessionContext.Provider>
  )
}
