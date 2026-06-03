import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity';
import { EventManagerAssignment } from './event-manager-assignment.entity';
import { EventAttendance } from './event-attendance.entity';
import { EventParticipant } from './event-participant.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { UsersModule } from '../user/user.module';
import { FriendsModule } from '../friends/friends.module';
import { NotificationsModule } from '../notifications/notifications.module';

// -------------------------------------------------------------------
// Events Module
// Event CRUD, map markers, attendance and photo storage.
// -------------------------------------------------------------------
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      EventManagerAssignment,
      EventAttendance,
      EventParticipant,
    ]),
    UsersModule,
    FriendsModule,
    NotificationsModule,
  ],
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
