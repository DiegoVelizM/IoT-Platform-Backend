import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  FailedNotification,
  FailedNotificationSchema,
} from './schemas/failed-notification.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: FailedNotification.name, schema: FailedNotificationSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
