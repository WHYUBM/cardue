import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Session } from './entities/session.entity.js';
import { User } from './entities/user.entity.js';
import { OidcService } from './oidc.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Session])],
  controllers: [AuthController],
  providers: [AuthService, OidcService],
  // The guard is registered globally in AppModule and needs AuthService.
  exports: [AuthService],
})
export class AuthModule {}
