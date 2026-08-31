import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../auth/entities/user.entity.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import type { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesService } from './vehicles.service.js';

/**
 * Routes for the user's vehicles, under the global `/api` prefix.
 *
 * All of them require a session: the guard is global and nothing here is
 * marked `@Public()`. The account arrives through `@CurrentUser()` and is
 * passed down to the service, which is where ownership is actually enforced.
 */
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateVehicleDto,
  ): Promise<Vehicle> {
    return this.vehicles.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User): Promise<Vehicle[]> {
    return this.vehicles.findAll(user.id);
  }

  // `ParseUUIDPipe` answers a malformed id with 400 instead of letting it reach
  // PostgreSQL, where an invalid uuid literal would come back as a 500.
  @Get(':id')
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Vehicle> {
    return this.vehicles.findOne(user.id, id);
  }

  /**
   * Partial update. Sending only `{ "mileageKm": 82000 }` is a complete
   * request: correcting the odometer must not require resending the vehicle.
   */
  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    return this.vehicles.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.vehicles.remove(user.id, id);
  }
}
