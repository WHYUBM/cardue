import { createHash, randomBytes } from 'node:crypto';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

/** The claims the application reads out of an identity token. */
export interface OidcIdentity {
  /** Stable identifier of the account in Keycloak. */
  sub: string;
  email: string;
  name: string;
  /**
   * Whether the identity provider vouches for the email address.
   *
   * It decides whether an existing account may be adopted by matching on the
   * email — the difference between welcoming someone back and handing them
   * somebody else's data.
   */
  emailVerified: boolean;
}

/** What the token endpoint gives back. */
interface TokenResponse {
  id_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

/** The subset of the discovery document the application uses. */
interface Discovery {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
}

/**
 * Everything that talks to Keycloak.
 *
 * The browser never reaches these endpoints except for the login page itself:
 * the authorization code is exchanged here, server side, and the tokens stay
 * here (ADR 0009).
 */
@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name);
  private discovery: Discovery | null = null;

  private get issuer(): string {
    return process.env.KEYCLOAK_ISSUER_URL!;
  }

  private get clientId(): string {
    return process.env.KEYCLOAK_CLIENT_ID!;
  }

  private get clientSecret(): string {
    return process.env.KEYCLOAK_CLIENT_SECRET!;
  }

  /** Where Keycloak sends the browser back to, through the app's own origin. */
  get redirectUri(): string {
    return `${process.env.APP_BASE_URL}/api/auth/callback`;
  }

  /**
   * Reads the realm's discovery document, once.
   *
   * Cached for the life of the process rather than configured by hand: the
   * endpoints are derived from the issuer, and hard-coding them would be one
   * more thing to keep in step with the realm.
   */
  private async getDiscovery(): Promise<Discovery> {
    if (this.discovery) return this.discovery;

    const response = await fetch(
      `${this.issuer}/.well-known/openid-configuration`,
    );
    if (!response.ok) {
      throw new InternalServerErrorException(
        'Identity provider unreachable',
      );
    }

    this.discovery = (await response.json()) as Discovery;
    return this.discovery;
  }

  /**
   * Builds the URL the browser is sent to, and the secret that proves the
   * exchange comes from whoever started it.
   *
   * PKCE: the verifier stays with us, only its hash travels. An intercepted
   * authorization code is then useless to anyone else, because redeeming it
   * requires the verifier.
   */
  async buildAuthorizationUrl(returnTo: string): Promise<{
    url: string;
    state: string;
    codeVerifier: string;
    returnTo: string;
  }> {
    const { authorization_endpoint } = await this.getDiscovery();

    const state = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(48).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const url = new URL(authorization_endpoint);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return { url: url.toString(), state, codeVerifier, returnTo };
  }

  /**
   * Exchanges the authorization code for tokens and reads the identity.
   *
   * The identity token's signature is not verified, deliberately. It did not
   * arrive through the browser: it was fetched over a direct connection to the
   * token endpoint, whose certificate already establishes who answered. OIDC
   * allows TLS server authentication to stand in for signature checking in
   * exactly this case, and it saves a JWKS client and its dependency.
   *
   * That reasoning holds only as long as the call is direct and, in
   * production, over HTTPS.
   */
  async exchangeCode(
    code: string,
    codeVerifier: string,
  ): Promise<{ identity: OidcIdentity; refreshToken: string | null }> {
    const { token_endpoint } = await this.getDiscovery();

    const response = await fetch(token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code_verifier: codeVerifier,
      }),
    });

    const body = (await response.json()) as TokenResponse;
    if (!response.ok || !body.id_token) {
      this.logger.warn(
        `Token exchange failed: ${body.error ?? response.status} ${body.error_description ?? ''}`,
      );
      throw new InternalServerErrorException('Sign-in failed');
    }

    return {
      identity: readIdentity(body.id_token),
      refreshToken: body.refresh_token ?? null,
    };
  }

  /**
   * Ends the Keycloak session too, so signing out here signs out there.
   *
   * Without this the next visit to the login page would come straight back
   * signed in, which is not what anyone means by logging out.
   */
  async buildLogoutUrl(refreshToken: string | null): Promise<string> {
    const { end_session_endpoint } = await this.getDiscovery();

    const url = new URL(end_session_endpoint);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set(
      'post_logout_redirect_uri',
      process.env.APP_BASE_URL!,
    );
    if (refreshToken) url.searchParams.set('refresh_token', refreshToken);

    return url.toString();
  }
}

/** Reads the claims out of a JWT payload without verifying the signature. */
function readIdentity(idToken: string): OidcIdentity {
  const payload = idToken.split('.')[1];
  const claims = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as Record<string, unknown>;

  const sub = claims.sub as string | undefined;
  const email = claims.email as string | undefined;
  if (!sub || !email) {
    throw new InternalServerErrorException(
      'Identity token without sub or email',
    );
  }

  return {
    sub,
    email,
    name: (claims.name as string | undefined) ?? email,
    emailVerified: claims.email_verified === true,
  };
}
