import { Test, TestingModule } from '@nestjs/testing';

jest.mock('./components.repository', () => ({
  ComponentsRepository: class ComponentsRepository {},
}));

import { ComponentsRepository } from './components.repository';
import { ComponentsService } from './components.service';

describe('ComponentsService', () => {
  let service: ComponentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComponentsService,
        {
          provide: ComponentsRepository,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ComponentsService>(ComponentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
