import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Session } from './entities/session.entity.js';
import { User } from './entities/user.entity.js';
import type { OidcIdentity } from './oidc.service.js';

/** Session token as issued to the browser, alongside its stored form. */
export interface IssuedSession {
  token: string;
  session: Session;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
  ) {}

  private get ttlDays(): number {
    return Number(process.env.SESSION_TTL_DAYS ?? 30);
  }

  /**
   * Finds the account behind an identity, creating or adopting a row.
   *
   * Three cases, in order:
   *
   * 1. The `sub` is known — the usual one.
   * 2. The `sub` is new but the email already has a row, **and the identity
   *    provider vouches for that email**: the row is adopted and the `sub`
   *    attached to it. This is what lets the account seeded by the migration,
   *    which owns the vehicles created before there were accounts, become a
   *    real account at the first sign-in, and what keeps the data attached when
   *    a realm is recreated and every `sub` changes.
   * 3. Neither is known: a new account.
   *
   * ⚠️ The `emailVerified` condition in case 2 is what makes adoption safe, and
   * it is deliberately not left to depend on the realm being closed. Matching
   * on a merely *claimed* address would mean that whoever signed up with
   * someone else's email inherited their vehicles. Requiring the identity
   * provider to vouch for the address removes that possibility whatever the
   * registration setting happens to be — so switching self-registration on some
   * day cannot silently open a way in.
   *
   * Registration is by invitation today (ADR 0009), and an administrator marks
   * the address as verified when creating the account. An address nobody
   * vouched for can only ever open a new, empty account.
   */
  async findOrCreateUser(identity: OidcIdentity): Promise<User> {
    const bySub = await this.users.findOne({
      where: { keycloakSub: identity.sub },
    });
    if (bySub) return bySub;

    const byEmail = identity.emailVerified
      ? await this.users.findOne({ where: { email: identity.email } })
      : null;
    if (byEmail) {
      byEmail.keycloakSub = identity.sub;
      byEmail.name = identity.name;
      return this.users.save(byEmail);
    }

    return this.users.save(
      this.users.create({
        keycloakSub: identity.sub,
        email: identity.email,
        name: identity.name,
      }),
    );
  }

  /**
   * Opens a session and returns the token the cookie will carry.
   *
   * Only the hash of the token is stored: the row cannot be turned back into a
   * credential by whoever reads the table.
   */
  async createSession(
    user: User,
    refreshToken: string | null,
  ): Promise<IssuedSession> {
    const token = randomBytes(32).toString('base64url');
    const now = new Date();

    const session = await this.sessions.save(
      this.sessions.create({
        tokenHash: hashToken(token),
        userId: user.id,
        refreshToken,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + this.ttlDays * 86_400_000),
      }),
    );

    return { token, session };
  }

  /**
   * Resolves a token into an account, pushing the expiry forward.
   *
   * The sliding renewal is what makes a long-lived session usable: it survives
   * as long as it is used, rather than expiring on a fixed date regardless.
   */
  async resolveSession(
    token: string | undefined,
  ): Promise<{ user: User; session: Session } | null> {
    if (!token) return null;

    const session = await this.sessions.findOne({
      where: { tokenHash: hashToken(token) },
    });
    if (!session) return null;

    const now = new Date();
    if (session.expiresAt <= now) {
      await this.sessions.delete(session.id);
      return null;
    }

    const user = await this.users.findOne({ where: { id: session.userId } });
    if (!user) return null;

    session.lastSeenAt = now;
    session.expiresAt = new Date(now.getTime() + this.ttlDays * 86_400_000);
    await this.sessions.save(session);

    return { user, session };
  }

  /** Ends one session. Signing out on one device leaves the others alone. */
  async destroySession(token: string | undefined): Promise<Session | null> {
    if (!token) return null;

    const session = await this.sessions.findOne({
      where: { tokenHash: hashToken(token) },
    });
    if (!session) return null;

    await this.sessions.delete(session.id);
    return session;
  }

  /**
   * Removes sessions that have expired.
   *
   * They are already refused on sight, so this is housekeeping rather than
   * security. Not scheduled yet: it will belong with the daily job that sends
   * the reminders.
   */
  async pruneExpiredSessions(): Promise<number> {
    const result = await this.sessions.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }
}

/** SHA-256 is right here: the input is 32 random bytes, not a guessable secret. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
