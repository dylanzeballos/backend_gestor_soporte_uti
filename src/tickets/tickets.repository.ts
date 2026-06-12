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
      include: this.summaryInclude,
    });
  }

  findAll(params: {
    page: number;
    limit: number;
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: number;
    unassigned?: boolean;
    createdById?: number;
    excludeCreatedById?: number;
    search?: string;
  }) {
    const where = {
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.unassigned
        ? { assignedToId: null }
        : typeof params.assignedToId === 'number'
          ? { assignedToId: params.assignedToId }
          : {}),
      ...(params.createdById ? { createdById: params.createdById } : {}),
      ...(params.excludeCreatedById ? { createdById: { not: params.excludeCreatedById } } : {}),
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
      include: this.summaryInclude,
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
    unassigned?: boolean;
    createdById?: number;
    excludeCreatedById?: number;
    search?: string;
  }) {
    return this.prisma.ticket.count({
      where: {
        deletedAt: null,
        ...(params.status ? { status: params.status } : {}),
        ...(params.priority ? { priority: params.priority } : {}),
        ...(params.unassigned
          ? { assignedToId: null }
          : typeof params.assignedToId === 'number'
            ? { assignedToId: params.assignedToId }
            : {}),
        ...(params.createdById ? { createdById: params.createdById } : {}),
        ...(params.excludeCreatedById ? { createdById: { not: params.excludeCreatedById } } : {}),
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
      include: this.detailInclude,
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
      include: this.summaryInclude,
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

  async getCounts(currentUserId: number, userRole: 'admin' | 'agent' | 'user') {
    const isStaff = userRole === 'admin' || userRole === 'agent';

    const [unassigned, myAssignments, openTickets] = await Promise.all([
      this.prisma.ticket.count({
        where: {
          deletedAt: null,
          assignedToId: null,
          status: 'open' as TicketStatus,
        },
      }),
      this.prisma.ticket.count({
        where: {
          deletedAt: null,
          assignedToId: currentUserId,
          status: { in: ['open' as const, 'in_progress' as const] },
        },
      }),
      this.prisma.ticket.count({
        where: {
          deletedAt: null,
          status: 'open' as TicketStatus,
          ...(isStaff
            ? {}
            : { createdById: currentUserId, assignedToId: null }),
        },
      }),
    ]);

    return { unassigned, myAssignments, openTickets };
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

  private readonly summaryInclude = {
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
    service: {
      select: {
        id: true,
        name: true,
      },
    },
    report: {
      select: {
        id: true,
      },
    },
  };

  private readonly detailInclude = {
    ...this.summaryInclude,
    history: {
      orderBy: {
        changedAt: 'desc' as const,
      },
      take: 20,
    },
  };
}
