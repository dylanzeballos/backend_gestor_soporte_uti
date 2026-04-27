import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitsRepository } from './units.repository';

@Injectable()
export class UnitsService {
  constructor(private readonly unitsRepository: UnitsRepository) {}

  async create(createUnitDto: CreateUnitDto) {
    const normalizedName = createUnitDto.name.trim();
    const existingUnit = await this.unitsRepository.findByName(normalizedName);
    if (existingUnit) {
      throw new ConflictException('Unit name already exists');
    }

    return this.unitsRepository.create({
      name: normalizedName,
      isActive: createUnitDto.isActive ?? true,
    });
  }

  async findAll(query: ListUnitsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.unitsRepository.findAll({
        page,
        limit,
        isActive: query.isActive,
        search: query.search,
      }),
      this.unitsRepository.count({
        isActive: query.isActive,
        search: query.search,
      }),
    ]);

    return {
      page,
      limit,
      total,
      data,
    };
  }

  async findOne(id: number) {
    const unit = await this.unitsRepository.findById(id);
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
    return unit;
  }

  async update(id: number, updateUnitDto: UpdateUnitDto) {
    const currentUnit = await this.unitsRepository.findById(id);
    if (!currentUnit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    if (updateUnitDto.name) {
      const normalizedName = updateUnitDto.name.trim();
      const existingUnit = await this.unitsRepository.findByName(normalizedName);
      if (existingUnit && existingUnit.id !== id) {
        throw new ConflictException('Unit name already exists');
      }
      updateUnitDto.name = normalizedName;
    }

    return this.unitsRepository.update(id, updateUnitDto);
  }

  async remove(id: number) {
    const unit = await this.unitsRepository.findById(id);
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    await this.unitsRepository.softDelete(id);

    return {
      message: `Unit ${id} archived successfully`,
    };
  }
}
