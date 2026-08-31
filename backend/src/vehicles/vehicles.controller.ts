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
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import type { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesService } from './vehicles.service.js';

/**
 * Routes for the user's vehicles, under the global `/api` prefix.
 *
 * TODO: Every route is public. There is no session to scope them to yet, so a
 * client can read and change any vehicle. The guard goes here once
 * authentication exists.
 */
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Post()
  create(@Body() dto: CreateVehicleDto): Promise<Vehicle> {
    return this.vehicles.create(dto);
  }

  @Get()
  findAll(): Promise<Vehicle[]> {
    return this.vehicles.findAll();
  }

  // `ParseUUIDPipe` answers a malformed id with 400 instead of letting it reach
  // PostgreSQL, where an invalid uuid literal would come back as a 500.
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Vehicle> {
    return this.vehicles.findOne(id);
  }

  /**
   * Partial update. Sending only `{ "mileageKm": 82000 }` is a complete
   * request: correcting the odometer must not require resending the vehicle.
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    return this.vehicles.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vehicles.remove(id);
  }
}
