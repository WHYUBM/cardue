import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource, QueryRunner } from 'typeorm';
import { Session } from './../src/auth/entities/session.entity.js';
import { User } from './../src/auth/entities/user.entity.js';
import { configureApp } from './../src/app-setup.js';
import { AppModule } from './../src/app.module.js';
import { Deadline } from './../src/vehicles/entities/deadline.entity.js';
import { Vehicle } from './../src/vehicles/entities/vehicle.entity.js';
import { createTestDataSource, signIn } from './test-database.js';

/**
 * What authentication is supposed to guarantee (ADR 0009).
 *
 * Two properties, and the second is the one that matters most: a session says
 * *who* is asking, the services decide *what* is theirs. A guard alone would
 * leave every vehicle readable by anyone signed in who guessed an identifier.
 */
describe('Auth (e2e)', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  let app: INestApplication;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
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
      .overrideProvider(getRepositoryToken(User))
      .useValue(queryRunner.manager.getRepository(User))
      .overrideProvider(getRepositoryToken(Session))
      .useValue(queryRunner.manager.getRepository(Session))
      .compile();

    app = configureApp(moduleFixture.createNestApplication());
    await app.init();
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
    await app.close();
  });

  const vehicle = {
    make: 'Fiat',
    model: 'Panda',
    year: 2019,
    plate: 'GH456KL',
  };

  describe('senza sessione', () => {
    it('rifiuta la lista dei veicoli', () => {
      return request(app.getHttpServer()).get('/api/vehicles').expect(401);
    });

    it('rifiuta la creazione di un veicolo', () => {
      return request(app.getHttpServer())
        .post('/api/vehicles')
        .send(vehicle)
        .expect(401);
    });

    it('rifiuta di dire chi sei', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('rifiuta un token di sessione inventato', () => {
      return request(app.getHttpServer())
        .get('/api/vehicles')
        .set('Cookie', 'cardue_session=non-esiste')
        .expect(401);
    });

    // La rotta dello scaffold è marcata `@Public()`: serve da liveness check e
    // deve rispondere anche a chi non ha una sessione.
    it('lascia passare la rotta pubblica', () => {
      return request(app.getHttpServer()).get('/api').expect(200);
    });
  });

  describe('con una sessione', () => {
    it('dice chi sei', async () => {
      const { cookie } = await signIn(queryRunner.manager, 'me@example.com');

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(200);

      expect(response.body.email).toBe('me@example.com');
      expect(response.body).not.toHaveProperty('keycloakSub');
    });

    it('chiude la sessione al logout, che smette di funzionare', async () => {
      const { cookie } = await signIn(queryRunner.manager, 'bye@example.com');

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .expect(201);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(401);
    });
  });

  describe('isolamento fra account', () => {
    it('non mostra a un account i veicoli di un altro', async () => {
      const alice = await signIn(queryRunner.manager, 'alice@example.com');
      const bob = await signIn(queryRunner.manager, 'bob@example.com');

      await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Cookie', alice.cookie)
        .send(vehicle)
        .expect(201);

      const mine = await request(app.getHttpServer())
        .get('/api/vehicles')
        .set('Cookie', alice.cookie)
        .expect(200);
      expect(mine.body).toHaveLength(1);

      const theirs = await request(app.getHttpServer())
        .get('/api/vehicles')
        .set('Cookie', bob.cookie)
        .expect(200);
      expect(theirs.body).toEqual([]);
    });

    // Il caso che una guard da sola non copre: l'identificatore è noto.
    it('risponde 404, non 403, sul veicolo di un altro', async () => {
      const alice = await signIn(queryRunner.manager, 'alice2@example.com');
      const bob = await signIn(queryRunner.manager, 'bob2@example.com');

      const created = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Cookie', alice.cookie)
        .send(vehicle);

      // 404 e non 403: un 403 confermerebbe che quel veicolo esiste.
      await request(app.getHttpServer())
        .get(`/api/vehicles/${created.body.id}`)
        .set('Cookie', bob.cookie)
        .expect(404);

      await request(app.getHttpServer())
        .patch(`/api/vehicles/${created.body.id}`)
        .set('Cookie', bob.cookie)
        .send({ mileageKm: 1 })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/vehicles/${created.body.id}`)
        .set('Cookie', bob.cookie)
        .expect(404);

      // E il veicolo di Alice è ancora lì.
      await request(app.getHttpServer())
        .get(`/api/vehicles/${created.body.id}`)
        .set('Cookie', alice.cookie)
        .expect(200);
    });
  });

  describe('cancellazione logica (ADR 0010)', () => {
    it('nasconde il veicolo ma conserva la riga come tombstone', async () => {
      const { cookie } = await signIn(queryRunner.manager, 'soft@example.com');

      const created = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Cookie', cookie)
        .send({ ...vehicle, deadlines: [{ type: 'bollo', dueDate: '2027-01-31' }] });

      await request(app.getHttpServer())
        .delete(`/api/vehicles/${created.body.id}`)
        .set('Cookie', cookie)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/vehicles/${created.body.id}`)
        .set('Cookie', cookie)
        .expect(404);

      // La riga c'è ancora, con la data di cancellazione: è ciò che permetterà
      // a un altro dispositivo di sapere che è stata cancellata, invece di
      // rimetterla.
      const rows: { deleted_at: Date | null }[] = await queryRunner.manager.query(
        'select deleted_at from vehicles where id = $1',
        [created.body.id],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].deleted_at).not.toBeNull();
    });
  });
});
