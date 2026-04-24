import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    ci: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string | null;
    cell?: string | null;
    roleId: number;
    corporationId?: number | null;
    isActive?: boolean;
  }) {
    return this.prisma.user.create({
      data,
      include: {
        role: true,
        corporation: true,
      },
    });
  }

  findAll(params: { page: number; limit: number; isActive?: boolean }) {
    const { page, limit, isActive } = params;
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: {
        role: true,
        corporation: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  countActiveUsers(isActive?: boolean) {
    return this.prisma.user.count({
      where: {
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
    });
  }

  findById(id: number) {
    return this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        role: true,
        corporation: true,
      },
    });
  }

  findByIdForAuth(id: number) {
    return this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  update(
    id: number,
    data: Partial<{
      ci: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone: string | null;
      cell: string | null;
      roleId: number;
      corporationId: number | null;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        role: true,
        corporation: true,
      },
    });
  }

  softDelete(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }
}
