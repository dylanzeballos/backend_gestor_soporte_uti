import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { FilesModule } from '../files/files.module';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';
import { TicketsService } from './tickets.service';

@Module({
  imports: [FilesModule, EmailModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
