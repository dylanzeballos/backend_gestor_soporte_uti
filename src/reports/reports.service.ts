import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { TicketStatus } from '../generated/prisma/enums';
import { CreateTicketReportDto } from './dto/create-ticket-report.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ReportStatsQueryDto } from './dto/report-stats-query.dto';
import { UpdateTicketReportDto } from './dto/update-ticket-report.dto';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async create(createTicketReportDto: CreateTicketReportDto, currentUserId: number) {
    const componentPayload = this.normalizeComponents(createTicketReportDto.components);

    const ticket = await this.reportsRepository.findTicketById(createTicketReportDto.ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const existingReport = await this.reportsRepository.findByTicketId(
      createTicketReportDto.ticketId,
    );
    if (existingReport) {
      throw new ConflictException('Ticket already has a report');
    }

    await this.assertComponentsExist(componentPayload.map((component) => component.componentId));

    const startedAt = this.parseDate(createTicketReportDto.startedAt);
    const finishedAt = this.parseDate(createTicketReportDto.finishedAt);
    this.assertDateRange(startedAt, finishedAt);

    return this.reportsRepository.create({
      ticketId: createTicketReportDto.ticketId,
      createdById: currentUserId,
      summary: createTicketReportDto.summary.trim(),
      workPerformed: createTicketReportDto.workPerformed.trim(),
      resolutionType: this.normalizeOptionalText(createTicketReportDto.resolutionType),
      startedAt,
      finishedAt,
      components: componentPayload,
    });
  }

  async findAll(query: ListReportsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const includeTotal = query.includeTotal !== false;
    const fromDate = this.parseDate(query.fromDate);
    const toDate = this.parseDate(query.toDate);
    this.assertDateRange(fromDate, toDate);

    const data = await this.reportsRepository.findAll({
      page,
      limit,
      ticketId: query.ticketId,
      createdById: query.createdById,
      componentId: query.componentId,
      ticketStatus: query.ticketStatus as TicketStatus | undefined,
      fromDate: fromDate ?? undefined,
      toDate: toDate ?? undefined,
    });

    const total = includeTotal
      ? await this.reportsRepository.count({
          ticketId: query.ticketId,
          createdById: query.createdById,
          componentId: query.componentId,
          ticketStatus: query.ticketStatus as TicketStatus | undefined,
          fromDate: fromDate ?? undefined,
          toDate: toDate ?? undefined,
        })
      : data.length;

    return {
      page,
      limit,
      total,
      data,
    };
  }

  async findOne(id: number) {
    const report = await this.reportsRepository.findById(id);
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async findCustomerVisibleSummaryByTicketId(
    ticketId: number,
    currentUserId: number,
  ) {
    const report = await this.reportsRepository.findCustomerVisibleByTicketId(ticketId);
    if (!report || report.ticket?.createdById !== currentUserId) {
      throw new NotFoundException('Report not found');
    }

    return {
      id: report.id,
      ticketId: report.ticketId,
      summary: report.summary,
      workPerformed: report.workPerformed,
      resolutionType: report.resolutionType,
      startedAt: report.startedAt,
      finishedAt: report.finishedAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      technician: report.createdBy
        ? {
            id: report.createdBy.id,
            name:
              `${report.createdBy.firstName ?? ''} ${report.createdBy.lastName ?? ''}`.trim() ||
              report.createdBy.email,
          }
        : null,
      components: (report.components ?? []).map((component) => ({
        id: component.id,
        componentId: component.componentId,
        quantity: component.quantity,
        name: component.component?.name ?? `Componente #${component.componentId}`,
      })),
    };
  }

  async update(id: number, updateTicketReportDto: UpdateTicketReportDto) {
    const currentReport = await this.reportsRepository.findById(id);
    if (!currentReport) {
      throw new NotFoundException('Report not found');
    }

    if (
      typeof updateTicketReportDto.ticketId === 'number' &&
      updateTicketReportDto.ticketId !== currentReport.ticketId
    ) {
      const ticket = await this.reportsRepository.findTicketById(updateTicketReportDto.ticketId);
      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      const existingReport = await this.reportsRepository.findByTicketId(
        updateTicketReportDto.ticketId,
        id,
      );
      if (existingReport) {
        throw new ConflictException('Ticket already has a report');
      }
    }

    const startedAt = this.parseDate(updateTicketReportDto.startedAt);
    const finishedAt = this.parseDate(updateTicketReportDto.finishedAt);
    this.assertDateRange(startedAt, finishedAt);

    const componentPayload = updateTicketReportDto.components
      ? this.normalizeComponents(updateTicketReportDto.components)
      : undefined;

    if (componentPayload) {
      await this.assertComponentsExist(componentPayload.map((component) => component.componentId));
    }

    return this.reportsRepository.update(id, {
      ticketId: updateTicketReportDto.ticketId,
      summary:
        typeof updateTicketReportDto.summary === 'string'
          ? updateTicketReportDto.summary.trim()
          : undefined,
      workPerformed:
        typeof updateTicketReportDto.workPerformed === 'string'
          ? updateTicketReportDto.workPerformed.trim()
          : undefined,
      resolutionType: Object.prototype.hasOwnProperty.call(updateTicketReportDto, 'resolutionType')
        ? this.normalizeOptionalText(updateTicketReportDto.resolutionType)
        : undefined,
      startedAt: Object.prototype.hasOwnProperty.call(updateTicketReportDto, 'startedAt')
        ? startedAt
        : undefined,
      finishedAt: Object.prototype.hasOwnProperty.call(updateTicketReportDto, 'finishedAt')
        ? finishedAt
        : undefined,
      components: componentPayload,
    });
  }

  async remove(id: number) {
    const report = await this.reportsRepository.findById(id);
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    await this.reportsRepository.softDelete(id);

    return {
      message: `Report ${id} archived successfully`,
    };
  }

  async getSummaryStats(query: ReportStatsQueryDto) {
    const fromDate = this.parseDate(query.fromDate);
    const toDate = this.parseDate(query.toDate);
    this.assertDateRange(fromDate, toDate);

    const filters = {
      fromDate: fromDate ?? undefined,
      toDate: toDate ?? undefined,
      corporationId: query.corporationId,
    };

    const [
      totalTickets,
      totalReports,
      statusGroups,
      priorityGroups,
      creatorGroups,
      serviceGroups,
      unitTickets,
      resolvedTickets,
      componentGroups,
    ] = await Promise.all([
      this.reportsRepository.countTicketsSummary(filters),
      this.reportsRepository.countReportedTicketsSummary(filters),
      this.reportsRepository.groupTicketsByStatus(filters),
      this.reportsRepository.groupTicketsByPriority(filters),
      this.reportsRepository.groupByCreator(filters),
      this.reportsRepository.groupTicketsByService(filters),
      this.reportsRepository.findTicketsForUnitSummary(filters),
      this.reportsRepository.findResolvedTicketsForSummary(filters),
      this.reportsRepository.groupComponentsForSummary(filters),
    ]);

    const creatorIds = creatorGroups.map((group) => group.createdById);
    const creators = creatorIds.length
      ? await this.reportsRepository.findUsersByIds(creatorIds)
      : [];
    const creatorById = new Map(creators.map((creator) => [creator.id, creator]));

    const byTechnician = creatorGroups.map((group) => {
      const creator = creatorById.get(group.createdById);
      return {
        userId: group.createdById,
        name: creator
          ? `${creator.firstName ?? ''} ${creator.lastName ?? ''}`.trim() || creator.email
          : `User ${group.createdById}`,
        count: group._count._all,
      };
    });

    const componentIds = componentGroups.map((group) => group.componentId);
    const components = componentIds.length
      ? await this.reportsRepository.findComponentsByIds(componentIds)
      : [];
    const componentById = new Map(components.map((component) => [component.id, component]));

    const topComponents = componentGroups.map((group) => {
      const component = componentById.get(group.componentId);
      return {
        componentId: group.componentId,
        name: component?.name ?? `Component ${group.componentId}`,
        usageCount: group._count._all,
        totalQuantity: group._sum.quantity ?? 0,
      };
    });

    const statusCounts = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      cancelled: 0,
    };

    for (const group of statusGroups) {
      statusCounts[group.status] = group._count._all;
    }

    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    const byPriority = priorityGroups.map((group) => ({
      priority: group.priority,
      count: group._count._all,
    }));

    const serviceIds = serviceGroups
      .map((group) => group.serviceId)
      .filter((serviceId): serviceId is number => typeof serviceId === 'number');
    const services = serviceIds.length
      ? await this.reportsRepository.findServicesByIds(serviceIds)
      : [];
    const serviceById = new Map(services.map((service) => [service.id, service]));

    const topServices = serviceGroups
      .filter((group): group is typeof group & { serviceId: number } => typeof group.serviceId === 'number')
      .map((group) => ({
        serviceId: group.serviceId,
        name: serviceById.get(group.serviceId)?.name ?? `Servicio #${group.serviceId}`,
        count: group._count._all,
      }));

    const unitMap = new Map<
      number | 'without-unit',
      { corporationId: number | null; name: string; count: number }
    >();

    for (const ticket of unitTickets) {
      const corporation = ticket.createdBy.corporation;
      const key = corporation?.id ?? 'without-unit';
      const current = unitMap.get(key);

      if (current) {
        current.count += 1;
        continue;
      }

      unitMap.set(key, {
        corporationId: corporation?.id ?? null,
        name: corporation?.name ?? 'Sin unidad',
        count: 1,
      });
    }

    const byUnit = Array.from(unitMap.values()).sort((left, right) => right.count - left.count);

    const averageResolutionHours =
      resolvedTickets.length > 0
        ? Number(
            (
              resolvedTickets.reduce((total, ticket) => {
                if (!ticket.resolvedAt) {
                  return total;
                }

                return (
                  total +
                  (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)
                );
              }, 0) / resolvedTickets.length
            ).toFixed(1),
          )
        : null;

    return {
      filters: {
        fromDate: fromDate?.toISOString() ?? null,
        toDate: toDate?.toISOString() ?? null,
        corporationId: query.corporationId ?? null,
      },
      totals: {
        tickets: totalTickets,
        reports: totalReports,
        open: statusCounts.open,
        inProgress: statusCounts.in_progress,
        resolved: statusCounts.resolved,
        closed: statusCounts.closed,
        cancelled: statusCounts.cancelled,
        averageResolutionHours,
      },
      byStatus,
      byPriority,
      byUnit,
      topServices,
      byTechnician,
      topComponents,
    };
  }

  private normalizeComponents(
    components: { componentId: number; quantity?: number; note?: string }[],
  ) {
    const componentIds = components.map((component) => component.componentId);
    const uniqueIds = new Set(componentIds);
    if (uniqueIds.size !== componentIds.length) {
      throw new ConflictException('Duplicated components are not allowed in the same report');
    }

    return components.map((component) => ({
      componentId: component.componentId,
      quantity: component.quantity ?? 1,
      note: this.normalizeOptionalText(component.note),
    }));
  }

  private async assertComponentsExist(componentIds: number[]) {
    const existingComponents = await this.reportsRepository.findActiveComponentsByIds(componentIds);
    if (existingComponents.length !== componentIds.length) {
      throw new NotFoundException('One or more components are invalid or inactive');
    }
  }

  private parseDate(value?: string) {
    if (!value) {
      return null;
    }

    return new Date(value);
  }

  private assertDateRange(startedAt?: Date | null, finishedAt?: Date | null) {
    if (!startedAt || !finishedAt) {
      return;
    }

    if (finishedAt.getTime() < startedAt.getTime()) {
      throw new ConflictException('finishedAt cannot be earlier than startedAt');
    }
  }

  private normalizeOptionalText(value?: string | null) {
    if (typeof value !== 'string') {
      return value ?? null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
