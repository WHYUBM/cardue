import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from './entities/user.entity.js';

/** The request, once the guard has attached the account it belongs to. */
export interface RequestWithUser extends Request {
  user?: User;
}

/**
 * Injects the signed-in account into a handler.
 *
 * It is always defined on a guarded route: the guard rejects the request
 * before the handler runs when there is no valid session.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user!;
  },
);
