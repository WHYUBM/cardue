import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  DEADLINE_TYPES,
  type DeadlineType,
} from '../entities/deadline.entity.js';

/** Longest title a custom deadline may carry, matching the column. */
export const MAX_DEADLINE_TITLE_LENGTH = 80;

/** One deadline as it arrives inside a vehicle payload. */
export class CreateDeadlineDto {
  @IsIn(DEADLINE_TYPES)
  type: DeadlineType;

  /**
   * Name of a custom deadline.
   *
   * Validated here only as a field — a non-empty string of at most 80
   * characters. Whether it is required or forbidden depends on `type`, and that
   * rule lives in the service: a cross-field condition expressed with
   * `@ValidateIf` would have to be written twice, once per direction, and the
   * two conditions would fight over the same property.
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_DEADLINE_TITLE_LENGTH)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

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
