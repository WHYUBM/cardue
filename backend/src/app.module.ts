import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { buildDataSourceOptions } from './database/data-source.js';
import { AuthModule } from './auth/auth.module.js';
import { SessionGuard } from './auth/session.guard.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Fail at startup on a missing or malformed variable rather than at the
      // first query, when the cause is much further from the symptom.
      validate: (env) => {
        const required = [
          'POSTGRES_HOST',
          'POSTGRES_PORT',
          'POSTGRES_USER',
          'POSTGRES_PASSWORD',
          'POSTGRES_DB',
        ];
        const missing = required.filter((key) => !env[key]);
        if (missing.length > 0) {
          throw new Error(
            `Missing environment variables: ${missing.join(', ')}. ` +
              'Copy backend/.env.example to backend/.env.',
          );
        }
        if (Number.isNaN(Number(env.POSTGRES_PORT))) {
          throw new Error('POSTGRES_PORT must be a number.');
        }
        return env;
      },
    }),
    // `forRootAsync` rather than `forRoot` so the factory runs after
    // ConfigModule has loaded and validated `.env` into `process.env`.
    // The options come from the same builder the TypeORM CLI uses, so the
    // running app and the generated migrations can never disagree about the
    // schema they describe.
    TypeOrmModule.forRootAsync({
      useFactory: () => buildDataSourceOptions(process.env),
    }),
    AuthModule,
    VehiclesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Registered globally so protection is the default: a new route is closed
    // until someone marks it `@Public()`.
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
