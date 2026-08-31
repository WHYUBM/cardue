import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator.js';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // The scaffold route, kept as a liveness check: it must answer without a
  // session, or it could not say whether the service is up.
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
