import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { User } from './modules/user/user.entity';

// ------------------------------------------------------------
// Root application module that bundles all feature modules and 
// core configurations.
// ------------------------------------------------------------
@Module({
  imports: [
    // ------------------------------------------------------------
    // 1. Database Configuration.
    // ------------------------------------------------------------
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'ugr_events_db',    // Docker Compose service name
      port: 5432,               // Internal Docker database port
      username: 'juaner',       // Database username
      password: 'juaner0',      // Database password
      database: 'events_db',    // Target database name
      entities: [User],         // Registered entities
      synchronize: true,        // Auto-crea las tablas (útil en desarrollo) . Set to false in production.
    }),
    // ------------------------------------------------------------
    // 2. Feature Modules.
    // ------------------------------------------------------------
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}