import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import {
  OIDC_STATE_COOKIE,
  OIDC_STATE_TTL_SECONDS,
  SESSION_COOKIE,
} from './auth.constants.js';
import { clearCookie, readCookie, writeCookie } from './cookies.js';
import { CurrentUser } from './current-user.decorator.js';
import type { User } from './entities/user.entity.js';
import { OidcService } from './oidc.service.js';
import { Public } from './public.decorator.js';

/** What travels in the short-lived cookie across the redirect to Keycloak. */
interface OidcRoundTrip {
  state: string;
  codeVerifier: string;
  returnTo: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly oidc: OidcService,
  ) {}

  /**
   * Starts a sign-in: sends the browser to Keycloak.
   *
   * The state and the PKCE verifier are parked in a short-lived `httpOnly`
   * cookie rather than in a table. They are worth nothing to anyone else, they
   * have to survive one round trip only, and a table would need cleaning up.
   */
  @Public()
  @Get('login')
  async login(
    @Res() response: Response,
    @Query('returnTo') returnTo?: string,
  ): Promise<void> {
    const roundTrip = await this.oidc.buildAuthorizationUrl(
      safeReturnTo(returnTo),
    );

    writeCookie(
      response,
      OIDC_STATE_COOKIE,
      JSON.stringify({
        state: roundTrip.state,
        codeVerifier: roundTrip.codeVerifier,
        returnTo: roundTrip.returnTo,
      } satisfies OidcRoundTrip),
      OIDC_STATE_TTL_SECONDS,
    );

    response.redirect(roundTrip.url);
  }

  /**
   * Return leg: exchanges the code, opens the session, goes back to the app.
   *
   * Checking that `state` matches what was sent is what stops a third party
   * from feeding the browser an authorization code of their own — the attack
   * the parameter exists for.
   */
  @Public()
  @Get('callback')
  async callback(
    @Req() request: Request,
    @Res() response: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
  ): Promise<void> {
    const raw = readCookie(request, OIDC_STATE_COOKIE);
    clearCookie(response, OIDC_STATE_COOKIE);

    if (!code || !state || !raw) {
      throw new BadRequestException('Richiesta di accesso non valida');
    }

    const roundTrip = JSON.parse(raw) as OidcRoundTrip;
    if (roundTrip.state !== state) {
      throw new BadRequestException('Stato di accesso non corrispondente');
    }

    const { identity, refreshToken } = await this.oidc.exchangeCode(
      code,
      roundTrip.codeVerifier,
    );

    const user = await this.auth.findOrCreateUser(identity);
    const { token } = await this.auth.createSession(user, refreshToken);

    writeCookie(
      response,
      SESSION_COOKIE,
      token,
      Number(process.env.SESSION_TTL_DAYS ?? 30) * 86_400,
    );

    response.redirect(`${process.env.APP_BASE_URL}${roundTrip.returnTo}`);
  }

  /**
   * The signed-in account.
   *
   * The frontend calls it to confirm a session it already believes in — the
   * local marker decides what to render, this decides whether to keep it
   * (ADR 0009).
   */
  @Get('me')
  me(@CurrentUser() user: User): { id: string; email: string; name: string } {
    return { id: user.id, email: user.email, name: user.name };
  }

  /**
   * Signs out here and at Keycloak.
   *
   * Answers with the URL to visit rather than redirecting: the caller is
   * `fetch`, and a redirect would be followed invisibly instead of moving the
   * browser. Ending only the local session would leave the next sign-in
   * immediate, which is not what logging out means.
   */
  @Public()
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ logoutUrl: string }> {
    const session = await this.auth.destroySession(
      readCookie(request, SESSION_COOKIE),
    );
    clearCookie(response, SESSION_COOKIE);

    return {
      logoutUrl: await this.oidc.buildLogoutUrl(session?.refreshToken ?? null),
    };
  }
}

/**
 * Keeps `returnTo` a path inside the application.
 *
 * Without this the parameter would be an open redirect: a link to our own
 * login could bounce the browser anywhere, with our domain as the bait.
 */
function safeReturnTo(returnTo: string | undefined): string {
  if (!returnTo?.startsWith('/')) return '/dashboard';
  // `//host` and `/\host` are read by browsers as protocol-relative URLs.
  if (returnTo.startsWith('//') || returnTo.startsWith('/\\')) return '/dashboard';
  return returnTo;
}
