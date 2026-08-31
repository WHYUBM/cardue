/** Name of the cookie holding the application session. */
export const SESSION_COOKIE = 'cardue_session';

/**
 * Cookie carrying the state and the PKCE verifier between the redirect to
 * Keycloak and the return from it. Short-lived: it only has to survive one
 * round trip.
 */
export const OIDC_STATE_COOKIE = 'cardue_oidc';

/** How long that round trip is allowed to take, in seconds. */
export const OIDC_STATE_TTL_SECONDS = 10 * 60;
