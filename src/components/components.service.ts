import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { ComponentsRepository } from './components.repository';
import { CreateComponentDto } from './dto/create-component.dto';
import { ListComponentsQueryDto } from './dto/list-components-query.dto';
import { UpdateComponentDto } from './dto/update-component.dto';

@Injectable()
export class ComponentsService {
  constructor(private readonly componentsRepository: ComponentsRepository) {}

  async create(createComponentDto: CreateComponentDto) {
    const normalizedName = createComponentDto.name.trim();
    const existing = await this.componentsRepository.findByName(normalizedName);
    if (existing) {
      throw new ConflictException('Component name already exists');
    }

    return this.componentsRepository.create({
      name: normalizedName,
      description: this.normalizeOptionalText(createComponentDto.description),
      isActive: createComponentDto.isActive ?? true,
    });
  }

  async findAll(query: ListComponentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim() || undefined;

    const data = await this.componentsRepository.findAll({
      page,
      limit,
      isActive: query.isActive,
      search,
    });
    const total = await this.componentsRepository.count({
      isActive: query.isActive,
      search,
    });

    return {
      page,
      limit,
      total,
      data,
    };
  }

  async findOne(id: number) {
    const component = await this.componentsRepository.findById(id);
    if (!component) {
      throw new NotFoundException(`Component with ID ${id} not found`);
    }

    return component;
  }

  async update(id: number, updateComponentDto: UpdateComponentDto) {
    const current = await this.componentsRepository.findById(id);
    if (!current) {
      throw new NotFoundException(`Component with ID ${id} not found`);
    }

    const payload: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (typeof updateComponentDto.name === 'string') {
      const normalizedName = updateComponentDto.name.trim();
      const existing = await this.componentsRepository.findByName(normalizedName);
      if (existing && existing.id !== id) {
        throw new ConflictException('Component name already exists');
      }
      payload.name = normalizedName;
    }

    if (Object.prototype.hasOwnProperty.call(updateComponentDto, 'description')) {
      payload.description = this.normalizeOptionalText(updateComponentDto.description);
    }

    if (typeof updateComponentDto.isActive === 'boolean') {
      payload.isActive = updateComponentDto.isActive;
    }

    return this.componentsRepository.update(id, payload);
  }

  async remove(id: number) {
    const component = await this.componentsRepository.findById(id);
    if (!component) {
      throw new NotFoundException(`Component with ID ${id} not found`);
    }

    await this.componentsRepository.softDelete(id);

    return {
      message: `Component ${id} archived successfully`,
    };
  }

  private normalizeOptionalText(value?: string | null) {
    if (typeof value !== 'string') {
      return value ?? null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
