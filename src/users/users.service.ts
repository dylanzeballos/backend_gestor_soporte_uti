import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.usersRepository.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    const createdUser = await this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      corporationId: createUserDto.corporationId ?? null,
      phone: createUserDto.phone ?? null,
      cell: createUserDto.cell ?? null,
      isActive: createUserDto.isActive ?? true,
    });

    return this.sanitizeUser(createdUser);
  }

  async findAll(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [data, total] = await Promise.all([
      this.usersRepository.findAll({
        page,
        limit,
        isActive: query.isActive,
      }),
      this.usersRepository.countActiveUsers(query.isActive),
    ]);

    return {
      page,
      limit,
      total,
      data: data.map((user) => this.sanitizeUser(user)),
    };
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findByEmail(updateUserDto.email);
      if (existingUser && existingUser.id !== user.id) {
        throw new ConflictException('Email already exists');
      }
    }

    const payload: UpdateUserDto = { ...updateUserDto };
    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, 12);
    }

    const updatedUser = await this.usersRepository.update(id, {
      ...payload,
      corporationId:
        typeof payload.corporationId === 'number'
          ? payload.corporationId
          : payload.corporationId === null
            ? null
            : undefined,
      phone: payload.phone ?? undefined,
      cell: payload.cell ?? undefined,
    });

    return this.sanitizeUser(updatedUser);
  }

  async remove(id: number) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.softDelete(id);

    return {
      message: `User ${id} archived successfully`,
    };
  }

  findByEmailForAuth(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  findByIdForAuth(id: number) {
    return this.usersRepository.findByIdForAuth(id);
  }

  private sanitizeUser<T extends { password?: string }>(user: T) {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }
}
