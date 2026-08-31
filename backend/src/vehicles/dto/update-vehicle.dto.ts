import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleDto } from './create-vehicle.dto.js';

/**
 * Every field of `CreateVehicleDto`, all optional.
 *
 * This is what makes updating the odometer cheap: `PATCH` with a body of
 * `{ "mileageKm": 82000 }` is a valid, complete request — the client never has
 * to resend the whole vehicle to correct one number.
 *
 * Careful with defaults: `PartialType` copies the property initializers of the
 * class it derives from, so a default written on `CreateVehicleDto` would leak
 * in here and be applied to requests that never mentioned the field. That is
 * why `mileageKm` carries no initializer and the default lives in the service —
 * on creation a missing reading means "new vehicle", on update it must mean
 * "leave it alone".
 */
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}
