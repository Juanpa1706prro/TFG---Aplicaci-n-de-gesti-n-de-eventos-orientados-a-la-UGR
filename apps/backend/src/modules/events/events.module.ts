import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity';
import { EventManagerAssignment } from './event-manager-assignment.entity';
import { EventAttendance } from './event-attendance.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { UsersModule } from '../user/user.module';

// -------------------------------------------------------------------
// Events Module
// Event CRUD, map markers, attendance and photo storage.
// -------------------------------------------------------------------
@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventManagerAssignment, EventAttendance]),
    UsersModule,
  ],
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
