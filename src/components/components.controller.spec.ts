import { Test, TestingModule } from '@nestjs/testing';

jest.mock('../common/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

jest.mock('../common/guards/roles.guard', () => ({
  RolesGuard: class RolesGuard {},
}));

jest.mock('./components.service', () => ({
  ComponentsService: class ComponentsService {},
}));

import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';

describe('ComponentsController', () => {
  let controller: ComponentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComponentsController],
      providers: [
        {
          provide: ComponentsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ComponentsController>(ComponentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
