import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity.js';

/**
 * An application session, the thing the browser's cookie points at.
 *
 * Deliberately not a JWT (ADR 0009): a row can be deleted, so logging out and
 * disconnecting a device are a `DELETE` rather than a wait for expiry.
 */
@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * SHA-256 of the token held by the cookie — never the token itself.
   *
   * Whoever reads this table cannot therefore impersonate anyone: the stored
   * value is not usable as a credential. It is the same reason passwords are
   * hashed, applied to a secret that grants exactly as much access.
   */
  @Column({ name: 'token_hash', type: 'char', length: 64 })
  @Index('uq_session_token_hash', { unique: true })
  tokenHash: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_session_user')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Refresh token issued by Keycloak, kept server-side.
   *
   * It is what lets the backend end the Keycloak session on logout, and later
   * re-check that the account has not been revoked. It never reaches the
   * browser, which is the whole point of the BFF pattern.
   */
  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string | null;

  /** Sliding: pushed forward on every request that finds the session valid. */
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
