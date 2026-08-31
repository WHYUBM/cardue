import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DEADLINE_TYPES } from '../entities/deadline.entity.js';
import { CreateDeadlineDto } from './create-deadline.dto.js';

/** Upper bound for the odometer: past this, the reading is a typo. */
export const MAX_MILEAGE_KM = 2_000_000;

/** First year that can plausibly be a registration year. */
export const MIN_VEHICLE_YEAR = 1900;

export class CreateVehicleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  make: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  model: string;

  @IsInt()
  @Min(MIN_VEHICLE_YEAR)
  // A vehicle can be registered for the coming model year, but no further.
  @Max(new Date().getFullYear() + 1)
  year: number;

  /**
   * Plate, stored uppercase with no spaces.
   *
   * Normalized here rather than in the service so every entry point gets the
   * same shape: the database should never hold two spellings of one plate.
   * The pattern stays loose on purpose — it must accept historic Italian
   * formats and foreign plates, not just the current AA000AA.
   */
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().replace(/\s/g, '') : value,
  )
  @Matches(/^[A-Z0-9]{4,10}$/, {
    message: 'plate must be 4 to 10 letters or digits',
  })
  plate: string;

  /**
   * Odometer reading. Optional: leaving it out means a brand new vehicle, and
   * the service turns the absence into 0 rather than into "unknown".
   *
   * Deliberately declared without an initializer. `PartialType` builds
   * `UpdateVehicleDto` by copying the property initializers of this class, so a
   * `= 0` here would silently reset the odometer on every PATCH that did not
   * mention it. The default belongs to the service, in one place.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_MILEAGE_KM)
  mileageKm?: number;

  /**
   * Deadlines created together with the vehicle.
   *
   * They travel inside this payload rather than through their own endpoint
   * because the form offers one date field per kind and saves them in a single
   * action: splitting them would turn one save into five requests, with no
   * atomicity across them.
   *
   * Every entry is optional — the user may not know all the dates yet.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(DEADLINE_TYPES.length)
  @ValidateNested({ each: true })
  @Type(() => CreateDeadlineDto)
  deadlines?: CreateDeadlineDto[];
}
