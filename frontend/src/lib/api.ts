/**
 * HTTP transport for the Cardue API.
 *
 * Deliberately thin (ADR 0007): no cache, no retries, no request
 * deduplication. Its whole job is to turn a `fetch` into either typed data or
 * a typed error, so that no page has to deal with the raw Response.
 *
 * Free of React on purpose — the hooks in `src/hooks/` are what bind this to
 * the component lifecycle.
 */

/**
 * Base path of the API.
 *
 * Relative, and it must stay relative: in development the Vite proxy forwards
 * it to localhost:3000, in production the reverse proxy forwards it to the
 * backend container. Same string, both environments, no build-time variable.
 */
const API_BASE = '/api'

/**
 * An unsuccessful HTTP response, carrying what the backend said about it.
 *
 * The fields are declared and assigned separately rather than as constructor
 * parameter properties: `erasableSyntaxOnly` is on in this project, and
 * parameter properties are the one class feature it forbids, since they emit
 * runtime code rather than being erased.
 */
export class ApiError extends Error {
  readonly status: number
  /** Field-level validation messages, when the backend sent any. */
  readonly details: string[]

  constructor(status: number, message: string, details: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }

  /** True when the resource does not exist, so callers can render a 404 page. */
  get isNotFound(): boolean {
    return this.status === 404
  }
}

/** Shape of the error body NestJS returns for a failed request. */
interface NestErrorBody {
  statusCode?: number
  message?: string | string[]
  error?: string
}

/**
 * Turns an error response into an `ApiError`.
 *
 * The `ValidationPipe` answers with `message` as an **array** of sentences, one
 * per broken rule, while other failures use a plain string. Both are flattened
 * here so a form can show them without knowing which kind it got.
 */
async function toApiError(response: Response): Promise<ApiError> {
  let body: NestErrorBody = {}
  try {
    body = (await response.json()) as NestErrorBody
  } catch {
    // A response with no JSON body — a proxy error, or the backend being down.
    // The status alone still says something useful.
  }

  const details = Array.isArray(body.message)
    ? body.message
    : body.message
      ? [body.message]
      : []

  const message =
    details[0] ??
    body.error ??
    `Richiesta fallita (HTTP ${response.status})`

  return new ApiError(response.status, message, details)
}

/**
 * Performs a request and parses the JSON response.
 *
 * `fetch` rejects only on network failure, not on 4xx or 5xx, so the status has
 * to be checked explicitly — forgetting it is the classic way to treat an error
 * page as valid data.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    // Backend down, DNS failure, connection refused: there is no status here.
    throw new ApiError(0, 'Impossibile contattare il server. È acceso?')
  }

  if (!response.ok) throw await toApiError(response)

  // 204 No Content, as returned by DELETE: there is no body to parse.
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'GET' }),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
}
