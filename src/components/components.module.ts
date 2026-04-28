import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { ComponentsController } from './components.controller';
import { ComponentsRepository } from './components.repository';
import { ComponentsService } from './components.service';

@Module({
  imports: [UsersModule],
  controllers: [ComponentsController],
  providers: [ComponentsService, ComponentsRepository],
  exports: [ComponentsService, ComponentsRepository],
})
export class ComponentsModule {}
