import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service';

@Injectable()
export class ComponentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { name: string; description?: string | null; isActive?: boolean }) {
    return this.prisma.component.create({
      data: {
        name: data.name,
        description: data.description ?? null,
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
    return this.prisma.component.findMany({
      where: {
        deletedAt: null,
        ...(typeof params.isActive === 'boolean' ? { isActive: params.isActive } : {}),
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
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  count(params: { isActive?: boolean; search?: string }) {
    return this.prisma.component.count({
      where: {
        deletedAt: null,
        ...(typeof params.isActive === 'boolean' ? { isActive: params.isActive } : {}),
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
    return this.prisma.component.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  findByName(name: string) {
    return this.prisma.component.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  }

  update(
    id: number,
    data: Partial<{
      name: string;
      description: string | null;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.component.update({
      where: { id },
      data,
    });
  }

  softDelete(id: number) {
    return this.prisma.component.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }
}
