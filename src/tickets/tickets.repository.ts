import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service';
import { TicketPriority, TicketStatus } from '../generated/prisma/enums';

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    title: string;
    description: string;
    priority?: TicketPriority;
    status?: TicketStatus;
    createdById: number;
    assignedToId?: number | null;
    emitterId?: number | null;
    serviceId?: number | null;
    slaMinutes?: number | null;
  }) {
    return this.prisma.ticket.create({
      data,
      include: this.defaultInclude,
    });
  }

  findAll(params: {
    page: number;
    limit: number;
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: number;
    createdById?: number;
    search?: string;
  }) {
    const where = {
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
      ...(params.createdById ? { createdById: params.createdById } : {}),
      ...(params.search
        ? {
            title: {
              contains: params.search,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    return this.prisma.ticket.findMany({
      where,
      include: this.defaultInclude,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  count(params: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: number;
    createdById?: number;
    search?: string;
  }) {
    return this.prisma.ticket.count({
      where: {
        deletedAt: null,
        ...(params.status ? { status: params.status } : {}),
        ...(params.priority ? { priority: params.priority } : {}),
        ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
        ...(params.createdById ? { createdById: params.createdById } : {}),
        ...(params.search
          ? {
              title: {
                contains: params.search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
    });
  }

  findById(id: number) {
    return this.prisma.ticket.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: this.defaultInclude,
    });
  }

  update(
    id: number,
    data: Partial<{
      title: string;
      description: string;
      priority: TicketPriority;
      status: TicketStatus;
      assignedToId: number | null;
      emitterId: number | null;
      serviceId: number | null;
      slaMinutes: number | null;
      resolvedAt: Date | null;
    }>,
  ) {
    return this.prisma.ticket.update({
      where: { id },
      data,
      include: this.defaultInclude,
    });
  }

  softDelete(id: number) {
    return this.prisma.ticket.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  createHistory(data: {
    ticketId: number;
    changedById?: number | null;
    previousStatus?: TicketStatus | null;
    newStatus: TicketStatus;
    comment?: string | null;
  }) {
    return this.prisma.ticketHistory.create({
      data,
    });
  }

  private readonly defaultInclude = {
    createdBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    assignedTo: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    emitter: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    service: true,
    history: {
      orderBy: {
        changedAt: 'desc' as const,
      },
      take: 20,
    },
  };
}
