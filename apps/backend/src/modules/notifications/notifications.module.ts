import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { EventInvitation } from './event-invitation.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

// -------------------------------------------------------------------
// Notifications Module
// In-app inbox and public event recommendations. Base route: /notifications
// -------------------------------------------------------------------
@Module({
  imports: [TypeOrmModule.forFeature([Notification, EventInvitation])],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
