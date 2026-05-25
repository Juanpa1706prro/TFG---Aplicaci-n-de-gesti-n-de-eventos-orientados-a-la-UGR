import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Event } from '../events/event.entity';
import { EventAttendance } from '../events/event-attendance.entity';
import { EventManagerAssignment } from '../events/event-manager-assignment.entity';
import { UsersModule } from '../user/user.module';
import { EventsModule } from '../events/events.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminEventsController } from './admin-events.controller';
import { AdminEventsService } from './admin-events.service';
import { RolesGuard } from './guards/roles.guard';

// -------------------------------------------------------------------
// Admin Module
// Operator panel: user and event management (ADMIN role only).
// -------------------------------------------------------------------
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Event,
      EventAttendance,
      EventManagerAssignment,
    ]),
    UsersModule,
    EventsModule,
  ],
  controllers: [AdminUsersController, AdminEventsController],
  providers: [AdminUsersService, AdminEventsService, RolesGuard],
})
export class AdminModule {}
