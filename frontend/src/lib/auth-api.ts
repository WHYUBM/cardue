/**
 * The authentication endpoints, typed.
 *
 * Sign-in itself is not here: it is a full-page navigation to
 * `/api/auth/login`, not a `fetch`. The browser has to *travel* to Keycloak and
 * back, which is something a background request cannot do.
 */
import { api } from './api'

/** The signed-in account, as the API reports it. */
export interface Account {
  id: string
  email: string
  name: string
}

/** Where to send the browser to sign in, coming back to `returnTo`. */
export function loginUrl(returnTo: string): string {
  return `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
}

/** Confirms the session with the server. Rejects with a 401 when there is none. */
export function fetchAccount(signal?: AbortSignal): Promise<Account> {
  return api.get<Account>('/auth/me', { signal })
}

/**
 * Ends the session here, and returns the URL that ends it at Keycloak too.
 *
 * The caller has to navigate there: ending only the local session would leave
 * the next sign-in immediate, since Keycloak would still consider the browser
 * signed in.
 */
export function logout(): Promise<{ logoutUrl: string }> {
  return api.post<{ logoutUrl: string }>('/auth/logout', {})
}
