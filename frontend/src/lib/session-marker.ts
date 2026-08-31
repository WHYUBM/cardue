/**
 * The local trace of "someone is signed in here".
 *
 * This is what lets the installed app open without a network (ADR 0009): the
 * interface renders from what it has, and the session is confirmed with the
 * server in the background. Waiting for `/api/auth/me` before the first render
 * would make an offline start impossible, which is the whole point.
 *
 * It is a convenience, never an authority: it holds no token and grants
 * nothing. The server decides on every request, and a 401 wipes it.
 *
 * Kept in `localStorage` rather than IndexedDB — which ADR 0009 mentions —
 * because reading it is synchronous, and an asynchronous read would put back
 * exactly the wait this is meant to remove. It moves to IndexedDB with the
 * rest of the local data (ADR 0010), where the payoff is real.
 */
import type { Account } from './auth-api'

const KEY = 'cardue.session'

interface Marker {
  account: Account
  /** Epoch milliseconds; past this the marker is not believed any more. */
  expiresAt: number
}

/** Mirrors SESSION_TTL_DAYS on the backend. */
const TTL_MS = 30 * 86_400_000

export function readSessionMarker(): Account | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null

    const marker = JSON.parse(raw) as Marker
    if (!marker.account || marker.expiresAt < Date.now()) {
      localStorage.removeItem(KEY)
      return null
    }
    return marker.account
  } catch {
    // Private browsing, storage disabled, or a value someone else wrote:
    // treat any of them as "no marker" rather than breaking the boot.
    return null
  }
}

export function writeSessionMarker(account: Account): void {
  try {
    const marker: Marker = { account, expiresAt: Date.now() + TTL_MS }
    localStorage.setItem(KEY, JSON.stringify(marker))
  } catch {
    // Not being able to remember is a degraded experience, not a failure.
  }
}

export function clearSessionMarker(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to do: the next read will fail closed anyway.
  }
}
