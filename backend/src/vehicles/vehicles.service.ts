import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CUSTOM_DEADLINE_TYPE,
  Deadline,
  isStandardDeadlineType,
} from './entities/deadline.entity.js';
import { Vehicle } from './entities/vehicle.entity.js';
import type { CreateDeadlineDto } from './dto/create-deadline.dto.js';
import type { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import type { UpdateVehicleDto } from './dto/update-vehicle.dto.js';

/** Odometer reading assumed when the client does not send one: a new vehicle. */
export const DEFAULT_MILEAGE_KM = 0;

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicles: Repository<Vehicle>,
  ) {}

  /**
   * Creates a vehicle together with the deadlines sent with it.
   *
   * The deadlines are saved by cascade in the same operation, so a payload
   * either lands whole or not at all.
   */
  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    const deadlines = this.buildDeadlines(dto.deadlines);

    const vehicle = this.vehicles.create({
      make: dto.make,
      model: dto.model,
      year: dto.year,
      plate: dto.plate,
      // The single place the "no reading means new vehicle" rule is applied.
      mileageKm: dto.mileageKm ?? DEFAULT_MILEAGE_KM,
      deadlines,
    });

    return this.vehicles.save(vehicle);
  }

  /** Every vehicle, newest first. Deadlines come along, being eager. */
  findAll(): Promise<Vehicle[]> {
    return this.vehicles.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicles.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return vehicle;
  }

  /**
   * Applies a partial update.
   *
   * Only the fields present in the payload are touched, which is what makes
   * correcting the odometer a one-field request. `deadlines`, when present,
   * replaces the whole set: the edit form always submits every kind, so a
   * missing kind means the user cleared it.
   */
  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id);

    if (dto.make !== undefined) vehicle.make = dto.make;
    if (dto.model !== undefined) vehicle.model = dto.model;
    if (dto.year !== undefined) vehicle.year = dto.year;
    if (dto.plate !== undefined) vehicle.plate = dto.plate;
    if (dto.mileageKm !== undefined) vehicle.mileageKm = dto.mileageKm;

    if (dto.deadlines !== undefined) {
      vehicle.deadlines = this.buildDeadlines(dto.deadlines);
    }

    return this.vehicles.save(vehicle);
  }

  async remove(id: string): Promise<void> {
    // Deadlines go with it: the foreign key is ON DELETE CASCADE.
    const result = await this.vehicles.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
  }

  /**
   * Turns the deadline payload into entities, enforcing the two rules that span
   * fields and therefore cannot live in the DTO.
   *
   * **A title belongs to custom deadlines and only to them.** The four standard
   * kinds take their name from the type, and the interface translates it; a
   * title on one of them would be stored and never shown. Rejecting it is
   * better than dropping it silently.
   *
   * **Standard kinds cannot repeat within a vehicle**, custom ones can. The
   * database enforces the same rule through a partial unique index, but as a
   * driver error surfacing as a 500: catching it here gives the client a 400
   * that says what is actually wrong.
   */
  private buildDeadlines(dtos: CreateDeadlineDto[] | undefined): Deadline[] {
    if (!dtos?.length) return [];

    const seenStandardTypes = new Set<string>();

    for (const dto of dtos) {
      if (dto.type === CUSTOM_DEADLINE_TYPE) {
        if (!dto.title) {
          throw new BadRequestException('A custom deadline needs a title');
        }
        continue;
      }

      if (dto.title) {
        throw new BadRequestException(
          `A deadline of type "${dto.type}" cannot carry a title`,
        );
      }
      if (seenStandardTypes.has(dto.type)) {
        throw new BadRequestException(`Duplicate deadline of type "${dto.type}"`);
      }
      seenStandardTypes.add(dto.type);
    }

    return dtos.map((dto) => {
      const deadline = new Deadline();
      deadline.type = dto.type;
      deadline.title = isStandardDeadlineType(dto.type) ? null : (dto.title ?? null);
      deadline.dueDate = dto.dueDate;
      deadline.notes = dto.notes ?? null;
      deadline.paused = dto.paused ?? false;
      return deadline;
    });
  }
}
