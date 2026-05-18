import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { User } from './modules/user/user.entity';
import { UserProfile } from './modules/user/user-profile.entity';
import { StudentProfile } from './modules/user/student-profile.entity';
import { StaffProfile } from './modules/user/staff-profile.entity';
import { UserStaffFunction } from './modules/user/user-staff-function.entity';
import { Event } from './modules/events/event.entity';
import { EventManagerAssignment } from './modules/events/event-manager-assignment.entity';
import { FacultyDelegation } from './modules/delegation/faculty-delegation.entity';
import { DelegationMembership } from './modules/delegation/delegation-membership.entity';

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
      entities: [
        User,
        UserProfile,
        StudentProfile,
        StaffProfile,
        UserStaffFunction,
        Event,
        EventManagerAssignment,
        FacultyDelegation,
        DelegationMembership,
      ],
      synchronize: true,        // Auto-crea las tablas (útil en desarrollo) . Set to false in production.
    }),
    // ------------------------------------------------------------
    // 2. Feature Modules.
    // ------------------------------------------------------------
    AuthModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}