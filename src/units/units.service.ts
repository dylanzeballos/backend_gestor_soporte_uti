import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitsRepository } from './units.repository';

@Injectable()
export class UnitsService {
  constructor(private readonly unitsRepository: UnitsRepository) {}

  async create(createUnitDto: CreateUnitDto) {
    return this.unitsRepository.create(createUnitDto);
  }

  async findAll() {
    return this.unitsRepository.findAll();
  }

  async findOne(id: number) {
    const unit = await this.unitsRepository.findById(id);
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
    return unit;
  }

  async update(id: number, updateUnitDto: UpdateUnitDto) {
    const unit = await this.unitsRepository.findById(id);
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
    return this.unitsRepository.update(id, updateUnitDto);
  }

  async remove(id: number) {
    const unit = await this.unitsRepository.findById(id);
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
    return this.unitsRepository.update(id, { isActive: false });
  }
}
