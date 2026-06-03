import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from '../user/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../user/user.module';
import { jwtConstants } from './constants';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/auth.guard-jwt';

// -------------------------------------------------------------------
// Authentication Module
// Registers auth controller, service, JWT and global JwtAuthGuard.
// -------------------------------------------------------------------
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UsersModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.accessSecret,
    }),
  ],
  providers: [
    AuthService,
    {
      // Registers JwtAuthGuard globally; protects all routes unless @Public() is set.
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
