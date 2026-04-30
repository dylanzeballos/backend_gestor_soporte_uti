import { Injectable } from '@nestjs/common';

import { TicketStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma.service';

type ReportComponentPayload = {
  componentId: number;
  quantity: number;
  note?: string | null;
};

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findTicketById(ticketId: number) {
    return this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });
  }

  findActiveComponentsByIds(componentIds: number[]) {
    return this.prisma.component.findMany({
      where: {
        id: {
          in: componentIds,
        },
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
  }

  findById(id: number) {
    return this.prisma.ticketReport.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: this.detailInclude,
    });
  }

  findByTicketId(ticketId: number, excludeId?: number) {
    return this.prisma.ticketReport.findFirst({
      where: {
        ticketId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
      },
    });
  }

  create(data: {
    ticketId: number;
    createdById: number;
    summary: string;
    workPerformed: string;
    resolutionType?: string | null;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    components: ReportComponentPayload[];
  }) {
    return this.prisma.ticketReport.create({
      data: {
        ticketId: data.ticketId,
        createdById: data.createdById,
        summary: data.summary,
        workPerformed: data.workPerformed,
        resolutionType: data.resolutionType ?? null,
        startedAt: data.startedAt ?? null,
        finishedAt: data.finishedAt ?? null,
        components: {
          create: data.components.map((component) => ({
            componentId: component.componentId,
            quantity: component.quantity,
            note: component.note ?? null,
          })),
        },
      },
      include: this.detailInclude,
    });
  }

  findAll(params: {
    page: number;
    limit: number;
    ticketId?: number;
    createdById?: number;
    componentId?: number;
    ticketStatus?: TicketStatus;
    fromDate?: Date;
    toDate?: Date;
  }) {
    return this.prisma.ticketReport.findMany({
      where: {
        deletedAt: null,
        ...(params.ticketId ? { ticketId: params.ticketId } : {}),
        ...(params.createdById ? { createdById: params.createdById } : {}),
        ...(params.componentId
          ? {
              components: {
                some: {
                  componentId: params.componentId,
                },
              },
            }
          : {}),
        ...(params.ticketStatus
          ? {
              ticket: {
                status: params.ticketStatus,
              },
            }
          : {}),
        ...(params.fromDate || params.toDate
          ? {
              createdAt: {
                ...(params.fromDate ? { gte: params.fromDate } : {}),
                ...(params.toDate ? { lte: params.toDate } : {}),
              },
            }
          : {}),
      },
      include: this.summaryInclude,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  count(params: {
    ticketId?: number;
    createdById?: number;
    componentId?: number;
    ticketStatus?: TicketStatus;
    fromDate?: Date;
    toDate?: Date;
  }) {
    return this.prisma.ticketReport.count({
      where: {
        deletedAt: null,
        ...(params.ticketId ? { ticketId: params.ticketId } : {}),
        ...(params.createdById ? { createdById: params.createdById } : {}),
        ...(params.componentId
          ? {
              components: {
                some: {
                  componentId: params.componentId,
                },
              },
            }
          : {}),
        ...(params.ticketStatus
          ? {
              ticket: {
                status: params.ticketStatus,
              },
            }
          : {}),
        ...(params.fromDate || params.toDate
          ? {
              createdAt: {
                ...(params.fromDate ? { gte: params.fromDate } : {}),
                ...(params.toDate ? { lte: params.toDate } : {}),
              },
            }
          : {}),
      },
    });
  }

  update(
    id: number,
    data: {
      ticketId?: number;
      summary?: string;
      workPerformed?: string;
      resolutionType?: string | null;
      startedAt?: Date | null;
      finishedAt?: Date | null;
      components?: ReportComponentPayload[];
    },
  ) {
    return this.prisma.ticketReport.update({
      where: { id },
      data: {
        ticketId: data.ticketId,
        summary: data.summary,
        workPerformed: data.workPerformed,
        resolutionType: data.resolutionType,
        startedAt: data.startedAt,
        finishedAt: data.finishedAt,
        ...(data.components
          ? {
              components: {
                deleteMany: {},
                create: data.components.map((component) => ({
                  componentId: component.componentId,
                  quantity: component.quantity,
                  note: component.note ?? null,
                })),
              },
            }
          : {}),
      },
      include: this.detailInclude,
    });
  }

  softDelete(id: number) {
    return this.prisma.ticketReport.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  countSummary(fromDate?: Date, toDate?: Date) {
    return this.prisma.ticketReport.count({
      where: {
        deletedAt: null,
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
    });
  }

  groupByTicketStatus(fromDate?: Date, toDate?: Date) {
    return this.prisma.ticketReport.groupBy({
      by: ['ticketId'],
      where: {
        deletedAt: null,
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      _count: {
        _all: true,
      },
    });
  }

  findTicketsByIds(ids: number[]) {
    return this.prisma.ticket.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  groupByCreator(fromDate?: Date, toDate?: Date) {
    return this.prisma.ticketReport.groupBy({
      by: ['createdById'],
      where: {
        deletedAt: null,
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      _count: {
        _all: true,
      },
    });
  }

  findUsersByIds(ids: number[]) {
    return this.prisma.user.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
  }

  groupByComponent(fromDate?: Date, toDate?: Date) {
    return this.prisma.ticketReportComponent.groupBy({
      by: ['componentId'],
      where: {
        ticketReport: {
          deletedAt: null,
          ...(fromDate || toDate
            ? {
                createdAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              }
            : {}),
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _count: {
          componentId: 'desc',
        },
      },
      take: 10,
    });
  }

  findComponentsByIds(ids: number[]) {
    return this.prisma.component.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });
  }

  private readonly summaryInclude = {
    ticket: {
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        assignedTo: {
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
      },
    },
    createdBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    components: {
      include: {
        component: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        id: 'asc' as const,
      },
    },
  };

  private readonly detailInclude = {
    ticket: {
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        createdById: true,
        assignedToId: true,
        emitterId: true,
        serviceId: true,
        slaMinutes: true,
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
      },
    },
    createdBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    components: {
      include: {
        component: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        id: 'asc' as const,
      },
    },
  };
}
