import { Injectable } from '@nestjs/common';

import { ServicesRepository } from './services.repository';

@Injectable()
export class ServicesService {
  constructor(private readonly servicesRepository: ServicesRepository) {}

  findAll() {
    return this.servicesRepository.findAllActive();
  }
}
