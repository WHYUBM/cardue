import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE } from './auth.constants.js';
import { readCookie } from './cookies.js';
import type { RequestWithUser } from './current-user.decorator.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

/**
 * Turns the session cookie into an account on the request, or refuses.
 *
 * Registered globally: every route is protected unless it says otherwise with
 * `@Public()`. Forgetting the decorator locks a route, which is noticed;
 * forgetting to add a guard would open one, which is not.
 *
 * Note what this does **not** do: decide what the account may see. That belongs
 * to the services, which filter by owner. A guard answers "who are you", never
 * "what is yours".
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const resolved = await this.auth.resolveSession(
      readCookie(request, SESSION_COOKIE),
    );

    if (!resolved) {
      throw new UnauthorizedException('Sessione assente o scaduta');
    }

    request.user = resolved.user;
    return true;
  }
}
