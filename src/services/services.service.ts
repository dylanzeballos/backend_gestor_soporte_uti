import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateServiceDto } from './dto/create-service.dto';
import { ListServicesQueryDto } from './dto/list-services-query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesRepository } from './services.repository';

@Injectable()
export class ServicesService {
  constructor(private readonly servicesRepository: ServicesRepository) {}

  async create(createServiceDto: CreateServiceDto) {
    const normalizedName = createServiceDto.name.trim();
    const existingService = await this.servicesRepository.findByName(normalizedName);
    if (existingService) {
      throw new ConflictException('Service name already exists');
    }

    return this.servicesRepository.create({
      name: normalizedName,
      isActive: createServiceDto.isActive ?? true,
    });
  }

  async findAll(query: ListServicesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const data = await this.servicesRepository.findAll({
      page,
      limit,
      isActive: query.isActive,
      search: query.search,
    });

    const total = await this.servicesRepository.count({
      isActive: query.isActive,
      search: query.search,
    });

    return {
      page,
      limit,
      total,
      data,
    };
  }

  async findOne(id: number) {
    const service = await this.servicesRepository.findById(id);
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async update(id: number, updateServiceDto: UpdateServiceDto) {
    const currentService = await this.servicesRepository.findById(id);
    if (!currentService) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    const payload: { name?: string; isActive?: boolean } = {};

    if (typeof updateServiceDto.name === 'string') {
      const normalizedName = updateServiceDto.name.trim();
      const existingService = await this.servicesRepository.findByName(normalizedName);
      if (existingService && existingService.id !== id) {
        throw new ConflictException('Service name already exists');
      }
      payload.name = normalizedName;
    }

    if (typeof updateServiceDto.isActive === 'boolean') {
      payload.isActive = updateServiceDto.isActive;
    }

    return this.servicesRepository.update(id, payload);
  }

  async remove(id: number) {
    const service = await this.servicesRepository.findById(id);
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    await this.servicesRepository.softDelete(id);

    return {
      message: `Service ${id} archived successfully`,
    };
  }
}
