import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource, QueryRunner } from 'typeorm';
import { configureApp } from './../src/app-setup.js';
import { AppModule } from './../src/app.module.js';
import { buildDataSourceOptions } from './../src/database/data-source.js';
import { Deadline } from './../src/vehicles/entities/deadline.entity.js';
import { Vehicle } from './../src/vehicles/entities/vehicle.entity.js';

/**
 * End-to-end tests against the real database, each one rolled back.
 *
 * How the isolation works: a transaction is opened on a dedicated query runner
 * before every test, and the repositories the application injects are replaced
 * with repositories bound to that runner's entity manager. Everything the
 * request handlers write therefore happens inside the transaction, and the
 * rollback in `afterEach` leaves the database exactly as it was.
 *
 * The alternative — truncating tables between tests — would empty a database
 * that in development also holds data the developer put there by hand.
 */
describe('Vehicles (e2e)', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  let app: INestApplication;

  beforeAll(async () => {
    dataSource = new DataSource(buildDataSourceOptions());
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(Vehicle))
      .useValue(queryRunner.manager.getRepository(Vehicle))
      .overrideProvider(getRepositoryToken(Deadline))
      .useValue(queryRunner.manager.getRepository(Deadline))
      .compile();

    app = configureApp(moduleFixture.createNestApplication());
    await app.init();
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
    await app.close();
  });

  const validVehicle = {
    make: 'Fiat',
    model: 'Panda',
    year: 2019,
    plate: 'GH456KL',
  };

  describe('POST /api/vehicles', () => {
    it('creates a vehicle, defaulting the odometer to zero', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/vehicles')
        .send(validVehicle)
        .expect(201);

      expect(response.body).toMatchObject({ ...validVehicle, mileageKm: 0 });
      expect(response.body.id).toBeTruthy();
    });

    it('stores the odometer reading when given', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/vehicles')
        .send({ ...validVehicle, mileageKm: 78_400 })
        .expect(201);

      expect(response.body.mileageKm).toBe(78_400);
    });

    it('creates the deadlines sent with the vehicle', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/vehicles')
        .send({
          ...validVehicle,
          deadlines: [{ type: 'bollo', dueDate: '2026-11-30' }],
        })
        .expect(201);

      expect(response.body.deadlines).toHaveLength(1);
      expect(response.body.deadlines[0]).toMatchObject({
        type: 'bollo',
        dueDate: '2026-11-30',
      });
    });

    it('normalizes the plate to uppercase without spaces', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/vehicles')
        .send({ ...validVehicle, plate: ' gh456 kl ' })
        .expect(201);

      expect(response.body.plate).toBe('GH456KL');
    });

    it('rejects a negative odometer reading', () => {
      return request(app.getHttpServer())
        .post('/api/vehicles')
        .send({ ...validVehicle, mileageKm: -1 })
        .expect(400);
    });

    it('rejects a date that does not exist', () => {
      return request(app.getHttpServer())
        .post('/api/vehicles')
        .send({
          ...validVehicle,
          deadlines: [{ type: 'bollo', dueDate: '2026-02-30' }],
        })
        .expect(400);
    });

    // `forbidNonWhitelisted` in the global pipe: a client cannot set a field
    // the endpoint never meant to accept.
    it('rejects an unknown property', () => {
      return request(app.getHttpServer())
        .post('/api/vehicles')
        .send({ ...validVehicle, owner: 'someone else' })
        .expect(400);
    });
  });

  describe('GET /api/vehicles', () => {
    it('lists what has been created', async () => {
      await request(app.getHttpServer())
        .post('/api/vehicles')
        .send(validVehicle)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/vehicles')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].plate).toBe('GH456KL');
    });

    it('starts from an empty list, proving the previous test rolled back', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/vehicles')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('PATCH /api/vehicles/:id', () => {
    it('updates the odometer on its own', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/vehicles')
        .send({ ...validVehicle, mileageKm: 78_400 });

      const response = await request(app.getHttpServer())
        .patch(`/api/vehicles/${created.body.id}`)
        .send({ mileageKm: 82_000 })
        .expect(200);

      expect(response.body.mileageKm).toBe(82_000);
      expect(response.body.make).toBe('Fiat');
    });

    it('leaves the odometer alone when the payload omits it', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/vehicles')
        .send({ ...validVehicle, mileageKm: 78_400 });

      const response = await request(app.getHttpServer())
        .patch(`/api/vehicles/${created.body.id}`)
        .send({ model: 'Panda 4x4' })
        .expect(200);

      expect(response.body.mileageKm).toBe(78_400);
    });

    it('answers 404 for a vehicle that does not exist', () => {
      return request(app.getHttpServer())
        .patch('/api/vehicles/00000000-0000-4000-8000-000000000000')
        .send({ mileageKm: 1 })
        .expect(404);
    });

    it('answers 400 for a malformed id', () => {
      return request(app.getHttpServer())
        .patch('/api/vehicles/not-a-uuid')
        .send({ mileageKm: 1 })
        .expect(400);
    });
  });

  describe('DELETE /api/vehicles/:id', () => {
    it('deletes the vehicle and its deadlines', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/vehicles')
        .send({
          ...validVehicle,
          deadlines: [{ type: 'bollo', dueDate: '2026-11-30' }],
        });

      await request(app.getHttpServer())
        .delete(`/api/vehicles/${created.body.id}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/vehicles/${created.body.id}`)
        .expect(404);

      const orphans = await queryRunner.manager.count(Deadline);
      expect(orphans).toBe(0);
    });
  });
});
