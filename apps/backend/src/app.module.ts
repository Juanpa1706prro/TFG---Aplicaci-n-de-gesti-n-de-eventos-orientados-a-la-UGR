import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Importar el conector
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/user.entity'; // Importar la entidad que movimos antes

@Module({
  imports: [
    // 1. Configuración de la conexión a la DB (según tu docker-compose)
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'ugr_events_db',    // Nombre del servicio en tu docker-compose
      port: 5432,               // Puerto interno de Docker
      username: 'juaner',       // Usuario de tu YAML
      password: 'juaner0',      // Contraseña de tu YAML
      database: 'events_db',    // Nombre de la DB de tu YAML
      entities: [User],         // Registramos aquí la entidad de usuario
      synchronize: true,        // Auto-crea las tablas (útil en desarrollo)
    }),
    // 2. Tu módulo de autenticación
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}