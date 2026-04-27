import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string }) {
    return this.prisma.corporation.create({ data });
  }

  async findAll() {
    return this.prisma.corporation.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.corporation.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: { name?: string; isActive?: boolean }) {
    return this.prisma.corporation.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.corporation.delete({ where: { id } });
  }
}
