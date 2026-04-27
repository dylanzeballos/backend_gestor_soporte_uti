import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateRoleDto } from './dto/create-role.dto';
import { ListRolesQueryDto } from './dto/list-roles-query.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async create(createRoleDto: CreateRoleDto) {
    const normalizedName = this.normalizeRoleName(createRoleDto.name);
    const existingRole = await this.rolesRepository.findByName(normalizedName);
    if (existingRole) {
      throw new ConflictException('Role name already exists');
    }

    return this.rolesRepository.create({
      name: normalizedName,
      description: this.normalizeOptionalText(createRoleDto.description),
    });
  }

  async findAll(query: ListRolesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.rolesRepository.findAll({
        page,
        limit,
        search: query.search?.trim() || undefined,
      }),
      this.rolesRepository.count({
        search: query.search?.trim() || undefined,
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
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const currentRole = await this.rolesRepository.findById(id);
    if (!currentRole) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const payload: {
      name?: string;
      description?: string | null;
    } = {};

    if (typeof updateRoleDto.name === 'string') {
      const normalizedName = this.normalizeRoleName(updateRoleDto.name);
      const existingRole = await this.rolesRepository.findByName(normalizedName);
      if (existingRole && existingRole.id !== id) {
        throw new ConflictException('Role name already exists');
      }
      payload.name = normalizedName;
    }

    if (Object.prototype.hasOwnProperty.call(updateRoleDto, 'description')) {
      payload.description = this.normalizeOptionalText(updateRoleDto.description);
    }

    return this.rolesRepository.update(id, payload);
  }

  async remove(id: number) {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (role.name === 'admin') {
      throw new ConflictException('Admin role cannot be deleted');
    }

    const assignedUsers = await this.rolesRepository.countUsersByRoleId(id);
    if (assignedUsers > 0) {
      throw new ConflictException('Role is assigned to users and cannot be deleted');
    }

    await this.rolesRepository.delete(id);

    return {
      message: `Role ${id} deleted successfully`,
    };
  }

  private normalizeRoleName(name: string) {
    return name.trim().toLowerCase();
  }

  private normalizeOptionalText(value?: string | null) {
    if (typeof value !== 'string') {
      return value ?? null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
