/**
 * The one hook that turns an API call into render-ready state.
 *
 * Written by hand rather than delegated to a data-fetching library (ADR 0007):
 * with one resource and four pages, the value of seeing this cycle written out
 * is higher than the convenience of hiding it.
 */
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../lib/api'
import { clearSessionMarker } from '../lib/session-marker'

/** What a page needs to render a remote resource in all of its states. */
export interface ApiResource<T> {
  data: T | null
  loading: boolean
  /** Human-readable message, `null` while things are fine. */
  error: string | null
  /** True when the server answered 404, so the page can render a not-found. */
  notFound: boolean
  /** Runs the request again — for a retry button, or after a write. */
  reload: () => void
}

/** The whole state in one object, so it can be replaced in a single update. */
interface State<T> {
  /** The key the state belongs to; used to notice that it is now stale. */
  key: string
  data: T | null
  loading: boolean
  error: string | null
  notFound: boolean
}

function pending<T>(key: string): State<T> {
  return { key, data: null, loading: true, error: null, notFound: false }
}

/**
 * Loads a resource and tracks its state.
 *
 * @param load Receives an `AbortSignal`; pass it to the API call so a request
 *   left behind by a navigation is actually cancelled.
 * @param key Identifies what is being loaded, for example `vehicle:<id>`.
 *   Changing it starts a new request and discards the previous result.
 */
export function useApiResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  key: string,
): ApiResource<T> {
  const [state, setState] = useState<State<T>>(() => pending<T>(key))
  // Bumping this re-runs the effect without changing the key.
  const [reloadCount, setReloadCount] = useState(0)

  // Resetting during render, rather than in an effect, is the documented way to
  // adjust state when an input changes: the component re-renders immediately
  // with the pending state, and the stale data is never painted even for one
  // frame.
  if (state.key !== key) setState(pending<T>(key))

  const reload = useCallback(() => {
    setState((current) => pending<T>(current.key))
    setReloadCount((count) => count + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    load(controller.signal)
      .then((result) => {
        // Nothing to report if the effect has already been cleaned up: the
        // component may be gone, or the key may have changed and this is a
        // stale answer that would overwrite a newer one.
        if (controller.signal.aborted) return
        setState({ key, data: result, loading: false, error: null, notFound: false })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return

        // The session expired, or was revoked, while the app was open. Drop the
        // local marker and send the browser back through the guard, which will
        // redirect to the sign-in page remembering where we were.
        if (cause instanceof ApiError && cause.status === 401) {
          clearSessionMarker()
          window.location.reload()
          return
        }

        setState({
          key,
          data: null,
          loading: false,
          error:
            cause instanceof ApiError
              ? cause.message
              : 'Si è verificato un errore imprevisto.',
          notFound: cause instanceof ApiError && cause.isNotFound,
        })
      })

    return () => controller.abort()
    // `load` is deliberately not a dependency: callers write it inline, so it
    // is a new function on every render and would restart the request forever.
    // `key` is the contract — it must change whenever `load` would fetch
    // something different.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadCount])

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    notFound: state.notFound,
    reload,
  }
}
