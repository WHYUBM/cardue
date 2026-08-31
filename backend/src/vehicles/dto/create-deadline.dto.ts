import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  DEADLINE_TYPES,
  type DeadlineType,
} from '../entities/deadline.entity.js';

/** One deadline as it arrives inside a vehicle payload. */
export class CreateDeadlineDto {
  @IsIn(DEADLINE_TYPES)
  type: DeadlineType;

  /**
   * Due date as `YYYY-MM-DD`.
   *
   * `strict: true` rejects dates that look right but do not exist, such as
   * 2026-02-30, which a plain format check would let through.
   */
  @IsDateString({ strict: true })
  dueDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  notes?: string;

  /** Insurance only: a suspended policy raises no reminder. */
  @IsOptional()
  @IsBoolean()
  paused?: boolean;
}
