import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deadline } from './entities/deadline.entity.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';

/**
 * The vehicles feature: entities, persistence and HTTP routes.
 *
 * `forFeature` registers the repositories for injection in this module only,
 * which is what keeps the root module from growing a provider per entity.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, Deadline])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
