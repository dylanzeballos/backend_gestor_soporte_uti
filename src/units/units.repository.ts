import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; isActive?: boolean }) {
    return this.prisma.corporation.create({
      data: {
        name: data.name,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    isActive?: boolean;
    search?: string;
  }) {
    return this.prisma.corporation.findMany({
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
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(params: { isActive?: boolean; search?: string }) {
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

  async findById(id: number) {
    return this.prisma.corporation.findFirst({
      where: {
        id,
        isActive: true,
      },
    });
  }

  async findByName(name: string) {
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

  async update(id: number, data: { name?: string; isActive?: boolean }) {
    return this.prisma.corporation.update({ where: { id }, data });
  }

  async softDelete(id: number) {
    return this.prisma.corporation.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
