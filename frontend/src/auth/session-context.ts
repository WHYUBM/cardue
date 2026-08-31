/**
 * The session context object, on its own.
 *
 * Split from the provider because fast refresh only works on files that export
 * components and nothing else: a context exported next to one silently breaks
 * hot reloading.
 */
import { createContext } from 'react'
import type { Account } from '../lib/auth-api'

export interface SessionValue {
  /** The signed-in account, or `null` when there is none. */
  account: Account | null
  /**
   * True until the server has had its say.
   *
   * Note it starts *false* when a local marker exists: there is something to
   * render straight away, and the check happens underneath. That is what an
   * offline start looks like.
   */
  checking: boolean
  /** Forgets the session locally. The server call belongs to the caller. */
  forget: () => void
}

export const SessionContext = createContext<SessionValue | null>(null)
