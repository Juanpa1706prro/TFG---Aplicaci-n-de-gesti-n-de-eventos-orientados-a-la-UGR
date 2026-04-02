import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../user/user.module';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      global: true, // Hace que no tengas que importarlo en cada módulo
      secret: jwtConstants.secret, // En producción esto va en un archivo .env
      signOptions: { expiresIn: '3h' }, // <-- AQUÍ DECIDES LA CADUCIDAD
    }),
  ], // Registramos la entidad aquí
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}