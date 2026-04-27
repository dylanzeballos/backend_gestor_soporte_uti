import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { name: string; description?: string | null }) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description ?? null,
      },
      include: this.defaultInclude,
    });
  }

  findAll(params: { page: number; limit: number; search?: string }) {
    return this.prisma.role.findMany({
      where: {
        ...(params.search
          ? {
              OR: [
                {
                  name: {
                    contains: params.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  description: {
                    contains: params.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      include: this.defaultInclude,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  count(params: { search?: string }) {
    return this.prisma.role.count({
      where: {
        ...(params.search
          ? {
              OR: [
                {
                  name: {
                    contains: params.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  description: {
                    contains: params.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
    });
  }

  findById(id: number) {
    return this.prisma.role.findFirst({
      where: { id },
      include: this.defaultInclude,
    });
  }

  findByName(name: string) {
    return this.prisma.role.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      include: this.defaultInclude,
    });
  }

  update(id: number, data: { name?: string; description?: string | null }) {
    return this.prisma.role.update({
      where: { id },
      data,
      include: this.defaultInclude,
    });
  }

  delete(id: number) {
    return this.prisma.role.delete({
      where: { id },
    });
  }

  countUsersByRoleId(roleId: number) {
    return this.prisma.user.count({
      where: {
        roleId,
      },
    });
  }

  private readonly defaultInclude = {
    _count: {
      select: {
        users: true,
      },
    },
  };
}
