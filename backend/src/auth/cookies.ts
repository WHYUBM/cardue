/**
 * Minimal cookie handling.
 *
 * Express can write cookies on its own; reading them is what needs a parser,
 * and one that only has to split a header does not justify a dependency
 * (ADR 0008).
 */
import type { Request, Response } from 'express';

/** Reads one cookie from the request, or `undefined` when it is not there. */
export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}

/**
 * Writes a cookie the browser will send back but scripts cannot read.
 *
 * `httpOnly` keeps it out of reach of any script on the page, so an XSS cannot
 * steal the session. `sameSite: 'lax'` is the CSRF defence: the browser does
 * not attach the cookie to cross-site POST requests, and together with an API
 * that only accepts JSON it covers the realistic cases (ADR 0009).
 */
export function writeCookie(
  response: Response,
  name: string,
  value: string,
  maxAgeSeconds: number,
): void {
  response.cookie(name, value, {
    httpOnly: true,
    sameSite: 'lax',
    // Only over HTTPS in production. In development the app is on plain
    // localhost, where a secure cookie would simply never be stored.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  });
}

export function clearCookie(response: Response, name: string): void {
  response.clearCookie(name, { path: '/' });
}
