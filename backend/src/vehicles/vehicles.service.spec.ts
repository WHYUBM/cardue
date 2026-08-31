import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Vehicle } from './entities/vehicle.entity.js';
import { DEFAULT_MILEAGE_KM, VehiclesService } from './vehicles.service.js';

/**
 * Unit tests: no database.
 *
 * The repository is replaced by a stub, which is the whole point of injecting
 * it rather than reaching for a connection inside the service. What is verified
 * here is the service's own rules — the odometer default, the partial update,
 * the rejection of repeated deadline kinds — not that TypeORM can write a row.
 */
describe('VehiclesService', () => {
  let service: VehiclesService;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = {
      // Mirrors TypeORM: `create` only builds the object, `save` persists it.
      create: vi.fn((data: Partial<Vehicle>) => ({ ...data }) as Vehicle),
      save: vi.fn((entity: Vehicle) => Promise.resolve(entity)),
      find: vi.fn(),
      findOne: vi.fn(),
      delete: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: getRepositoryToken(Vehicle), useValue: repository },
      ],
    }).compile();

    service = module.get(VehiclesService);
  });

  const baseVehicle = {
    make: 'Fiat',
    model: 'Panda',
    year: 2019,
    plate: 'GH456KL',
  };

  describe('create', () => {
    it('assumes a new vehicle when no odometer reading is sent', async () => {
      const created = await service.create({ ...baseVehicle });

      expect(created.mileageKm).toBe(DEFAULT_MILEAGE_KM);
      expect(created.mileageKm).toBe(0);
    });

    it('keeps the odometer reading when one is sent', async () => {
      const created = await service.create({ ...baseVehicle, mileageKm: 78_400 });

      expect(created.mileageKm).toBe(78_400);
    });

    it('attaches the deadlines sent with the vehicle', async () => {
      const created = await service.create({
        ...baseVehicle,
        deadlines: [
          { type: 'bollo', dueDate: '2026-11-30' },
          { type: 'revisione', dueDate: '2027-03-15', notes: 'Officina' },
        ],
      });

      expect(created.deadlines).toHaveLength(2);
      expect(created.deadlines[0]).toMatchObject({
        type: 'bollo',
        dueDate: '2026-11-30',
        notes: null,
        paused: false,
      });
      expect(created.deadlines[1].notes).toBe('Officina');
    });

    it('rejects two deadlines of the same standard kind', async () => {
      await expect(
        service.create({
          ...baseVehicle,
          deadlines: [
            { type: 'bollo', dueDate: '2026-11-30' },
            { type: 'bollo', dueDate: '2027-11-30' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create, custom deadlines', () => {
    it('keeps the title of a custom deadline', async () => {
      const created = await service.create({
        ...baseVehicle,
        deadlines: [
          { type: 'custom', title: 'Gomme invernali', dueDate: '2026-11-15' },
        ],
      });

      expect(created.deadlines[0]).toMatchObject({
        type: 'custom',
        title: 'Gomme invernali',
        dueDate: '2026-11-15',
      });
    });

    // The whole point of custom deadlines: unlike the standard kinds, a vehicle
    // may carry several of them.
    it('allows several custom deadlines on one vehicle', async () => {
      const created = await service.create({
        ...baseVehicle,
        deadlines: [
          { type: 'custom', title: 'Gomme invernali', dueDate: '2026-11-15' },
          { type: 'custom', title: 'Cambio batteria', dueDate: '2027-02-01' },
        ],
      });

      expect(created.deadlines).toHaveLength(2);
    });

    it('rejects a custom deadline without a title', async () => {
      await expect(
        service.create({
          ...baseVehicle,
          deadlines: [{ type: 'custom', dueDate: '2026-11-15' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    // Storing it would mean keeping a value the interface never shows, since a
    // standard deadline is named after its type.
    it('rejects a title on a standard deadline', async () => {
      await expect(
        service.create({
          ...baseVehicle,
          deadlines: [
            { type: 'bollo', title: 'Il mio bollo', dueDate: '2026-11-30' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('leaves the title null on standard deadlines', async () => {
      const created = await service.create({
        ...baseVehicle,
        deadlines: [{ type: 'bollo', dueDate: '2026-11-30' }],
      });

      expect(created.deadlines[0].title).toBeNull();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      repository.findOne.mockResolvedValue({
        id: 'a-uuid',
        ...baseVehicle,
        mileageKm: 78_400,
        deadlines: [],
      } as unknown as Vehicle);
    });

    it('updates the odometer on its own', async () => {
      const updated = await service.update('a-uuid', { mileageKm: 82_000 });

      expect(updated.mileageKm).toBe(82_000);
      expect(updated.make).toBe('Fiat');
    });

    // The regression that matters: `PartialType` copies property initializers,
    // so a default on the create DTO would silently zero the odometer here.
    it('leaves the odometer alone when the payload omits it', async () => {
      const updated = await service.update('a-uuid', { model: 'Panda 4x4' });

      expect(updated.mileageKm).toBe(78_400);
      expect(updated.model).toBe('Panda 4x4');
    });

    it('reports a missing vehicle', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('a-uuid', { mileageKm: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('reports a missing vehicle', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('a-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
