import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from '../user/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../user/user.module';
import { jwtConstants } from './constants';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth.guard-jwt';

// ------------------------------------------------------------
// Authentication Module.
// ------------------------------------------------------------
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UsersModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.accessSecret
    }),
  ],
  providers: [
    AuthService,
    {
      // Registers the JwtAuthGuard globally. It will automatically protect all endpoints unless they use the @Public() decorator.
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    }
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
