import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  providers: [NotificationsGateway, NotificationsService, JwtService],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
