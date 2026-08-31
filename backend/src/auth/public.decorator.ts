import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without a session.
 *
 * The guard is global, so protection is the default and exposure is the
 * exception that has to be written down — the safer way round: forgetting the
 * decorator locks a route, forgetting a guard would open one.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
