import { Module } from '@nestjs/common';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { UnitsRepository } from './units.repository';
import { UsersService } from 'src/users/users.service';
import { UsersRepository } from 'src/users/users.repository';

@Module({
  controllers: [UnitsController],
  providers: [UnitsService, UnitsRepository, UsersService, UsersRepository],
})
export class UnitsModule {}
