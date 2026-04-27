import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service';

@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { name: string; isActive?: boolean }) {
    return this.prisma.corporation.create({
      data: {
        name: data.name,
        isActive: data.isActive ?? true,
      },
    });
  }

  findAll(params: {
    page: number;
    limit: number;
    isActive?: boolean;
    search?: string;
  }) {
    const where = {
      ...(typeof params.isActive === 'boolean' ? { isActive: params.isActive } : {}),
      ...(params.search
        ? {
            name: {
              contains: params.search,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    return this.prisma.corporation.findMany({
      where,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  count(params: { isActive?: boolean; search?: string }) {
    return this.prisma.corporation.count({
      where: {
        ...(typeof params.isActive === 'boolean' ? { isActive: params.isActive } : {}),
        ...(params.search
          ? {
              name: {
                contains: params.search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
    });
  }

  findById(id: number) {
    return this.prisma.corporation.findFirst({
      where: {
        id,
        isActive: true,
      },
    });
  }

  findByName(name: string) {
    return this.prisma.corporation.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        isActive: true,
      },
    });
  }

  update(
    id: number,
    data: Partial<{
      name: string;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.corporation.update({
      where: { id },
      data,
    });
  }

  softDelete(id: number) {
    return this.prisma.corporation.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
