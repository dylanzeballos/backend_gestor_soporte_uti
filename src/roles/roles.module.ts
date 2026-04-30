import { Module } from '@nestjs/common';

import { RolesController } from './roles.controller';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';
import { UsersService } from 'src/users/users.service';
import { UsersRepository } from 'src/users/users.repository';

@Module({
  controllers: [RolesController],
  providers: [RolesService, RolesRepository, UsersService, UsersRepository],
  exports: [RolesService],
})
export class RolesModule {}
