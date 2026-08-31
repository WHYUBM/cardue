import { type INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Applies the configuration shared by every instance of the application.
 *
 * It lives apart from `bootstrap` so the end-to-end tests can build an app that
 * behaves like the real one. Configuring only the production entry point would
 * mean testing routes without the `/api` prefix and payloads without
 * validation — that is, testing an application that never runs anywhere.
 */
export function configureApp<T extends INestApplication>(app: T): T {
  // Every route lives under /api, which is what the Vite dev proxy and, later,
  // the production reverse proxy forward to this service.
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      // Drop properties with no matching DTO rule instead of passing them on:
      // a client cannot set a field the endpoint never meant to accept.
      whitelist: true,
      forbidNonWhitelisted: true,
      // Turn the plain JSON body into an instance of the DTO class, so the
      // declared types (numbers, dates) hold rather than staying strings.
      transform: true,
    }),
  );

  return app;
}
