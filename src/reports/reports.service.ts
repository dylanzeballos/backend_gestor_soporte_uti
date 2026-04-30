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

    const totalReports = await this.reportsRepository.countSummary(
      fromDate ?? undefined,
      toDate ?? undefined,
    );

    const ticketStatusGroups = await this.reportsRepository.groupByTicketStatus(
      fromDate ?? undefined,
      toDate ?? undefined,
    );
    const ticketIds = ticketStatusGroups.map((group) => group.ticketId);
    const tickets = ticketIds.length
      ? await this.reportsRepository.findTicketsByIds(ticketIds)
      : [];
    const ticketStatusById = new Map(tickets.map((ticket) => [ticket.id, ticket.status]));

    const byStatusMap = new Map<string, number>();
    for (const group of ticketStatusGroups) {
      const status = ticketStatusById.get(group.ticketId) ?? 'open';
      byStatusMap.set(status, (byStatusMap.get(status) ?? 0) + group._count._all);
    }

    const byStatus = Array.from(byStatusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    const creatorGroups = await this.reportsRepository.groupByCreator(
      fromDate ?? undefined,
      toDate ?? undefined,
    );
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

    const componentGroups = await this.reportsRepository.groupByComponent(
      fromDate ?? undefined,
      toDate ?? undefined,
    );
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

    return {
      totalReports,
      byStatus,
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
