import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity';
import { EventManagerAssignment } from './event-manager-assignment.entity';
import { EventAttendance } from './event-attendance.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { UsersModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventManagerAssignment, EventAttendance]),
    UsersModule,
  ],
  providers: [EventsService],
  controllers: [EventsController],
})
export class EventsModule {}
