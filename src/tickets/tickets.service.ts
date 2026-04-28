import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { EmailService } from '../email/email.service';
import { FilesService } from '../files/files.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { TicketPriority, TicketStatus } from '../generated/prisma/enums';
import { UsersService } from '../users/users.service';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketsRepository } from './tickets.repository';

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly filesService: FilesService,
    private readonly emailService: EmailService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly usersService: UsersService,
  ) {}

  async create(createTicketDto: CreateTicketDto, currentUserId: number) {
    const createdTicket = await this.ticketsRepository.create({
      title: createTicketDto.title,
      description: createTicketDto.description,
      priority: createTicketDto.priority as TicketPriority | undefined,
      status: createTicketDto.status as TicketStatus | undefined,
      createdById: currentUserId,
      assignedToId: createTicketDto.assignedToId ?? null,
      emitterId: createTicketDto.emitterId ?? null,
      serviceId: createTicketDto.serviceId ?? null,
      slaMinutes: createTicketDto.slaMinutes ?? null,
    });

    await this.ticketsRepository.createHistory({
      ticketId: createdTicket.id,
      changedById: currentUserId,
      previousStatus: null,
      newStatus: createdTicket.status,
      comment: 'Ticket created',
    });

    if (createdTicket.assignedTo?.email) {
      await this.emailService.send({
        to: createdTicket.assignedTo.email,
        subject: `Nuevo ticket asignado #${createdTicket.id}`,
        text: `Se te asignó el ticket ${createdTicket.title}`,
      });
    }

    // WebSocket notification to admins and staff
    this.notificationsGateway.emitTicketCreated(
      createdTicket.id,
      createdTicket.title,
      createdTicket.priority,
      currentUserId,
    );

    return createdTicket;
  }

  async findAll(query: ListTicketsQueryDto, currentUserId: number) {
    const actor = await this.getActorContext(currentUserId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const createdById = actor.role === 'user' ? actor.userId : query.createdById;
    const excludeCreatedById =
      actor.role === 'user' || createdById ? undefined : query.excludeCreatedById;

    const data = await this.ticketsRepository.findAll({
      page,
      limit,
      status: query.status as TicketStatus | undefined,
      priority: query.priority as TicketPriority | undefined,
      assignedToId: query.assignedToId,
      unassigned: query.unassigned,
      createdById,
      excludeCreatedById,
      search: query.search,
    });

    const total = await this.ticketsRepository.count({
      status: query.status as TicketStatus | undefined,
      priority: query.priority as TicketPriority | undefined,
      assignedToId: query.assignedToId,
      unassigned: query.unassigned,
      createdById,
      excludeCreatedById,
      search: query.search,
    });

    return {
      page,
      limit,
      total,
      data,
    };
  }

  async findOne(id: number, currentUserId: number) {
    const ticket = await this.ticketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const actor = await this.getActorContext(currentUserId);
    if (actor.role === 'user' && ticket.createdById !== actor.userId) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async update(id: number, dto: UpdateTicketDto, currentUserId: number) {
    await this.assertStaffAccess(currentUserId);
    const ticket = await this.findOne(id, currentUserId);

    return this.ticketsRepository.update(id, {
      title: dto.title,
      description: dto.description,
      priority: dto.priority as TicketPriority | undefined,
      status: dto.status as TicketStatus | undefined,
      assignedToId:
        typeof dto.assignedToId === 'number'
          ? dto.assignedToId
          : dto.assignedToId === null
            ? null
            : undefined,
      emitterId:
        typeof dto.emitterId === 'number'
          ? dto.emitterId
          : dto.emitterId === null
            ? null
            : undefined,
      serviceId:
        typeof dto.serviceId === 'number'
          ? dto.serviceId
          : dto.serviceId === null
            ? null
            : undefined,
      slaMinutes: dto.slaMinutes ?? undefined,
    });
  }

  async updateStatus(
    id: number,
    dto: UpdateTicketStatusDto,
    changedById: number,
  ) {
    await this.assertStaffAccess(changedById);
    const ticket = await this.findOne(id, changedById);

    const updated = await this.ticketsRepository.update(id, {
      status: dto.status as TicketStatus,
      resolvedAt:
        dto.status === TicketStatus.resolved ? new Date() : ticket.resolvedAt,
    });

    await this.ticketsRepository.createHistory({
      ticketId: id,
      changedById,
      previousStatus: ticket.status,
      newStatus: dto.status as TicketStatus,
      comment: dto.comment ?? null,
    });

    if (updated.createdBy?.email) {
      await this.emailService.send({
        to: updated.createdBy.email,
        subject: `Ticket #${id} actualizado a ${dto.status}`,
        text: `El ticket '${updated.title}' cambió de estado a ${dto.status}.`,
      });
    }

    await this.notificationsGateway.emitTicketStatusChanged(
      updated.id,
      updated.title,
      ticket.status,
      dto.status as TicketStatus,
      changedById,
      updated.createdById,
    );

    return updated;
  }

  async assign(id: number, dto: AssignTicketDto, changedById: number) {
    await this.assertStaffAccess(changedById);
    const ticket = await this.findOne(id, changedById);

    const updated = await this.ticketsRepository.update(id, {
      assignedToId: dto.assignedToId,
    });

    await this.ticketsRepository.createHistory({
      ticketId: id,
      changedById,
      previousStatus: ticket.status,
      newStatus: ticket.status,
      comment: `Ticket assigned to user ${dto.assignedToId}`,
    });

    if (updated.assignedTo?.email) {
      await this.emailService.send({
        to: updated.assignedTo.email,
        subject: `Ticket #${updated.id} asignado`,
        text: `Se te asignó el ticket '${updated.title}'.`,
      });
    }

    // WebSocket notification to assigned user
    this.notificationsGateway.emitTicketAssigned(
      dto.assignedToId,
      updated.id,
      updated.title,
      changedById,
      updated.assignedTo
        ? `${updated.assignedTo.firstName ?? ''} ${updated.assignedTo.lastName ?? ''}`.trim() ||
            updated.assignedTo.email
        : undefined,
    );

    return updated;
  }

  async remove(id: number, currentUserId: number) {
    await this.assertStaffAccess(currentUserId);
    await this.findOne(id, currentUserId);

    await this.ticketsRepository.softDelete(id);

    return {
      message: `Ticket ${id} archived successfully`,
    };
  }

  async registerAttachment(
    ticketId: number,
    file: Express.Multer.File | undefined,
    changedById: number,
  ) {
    if (!file) {
      throw new UnprocessableEntityException('File is required');
    }

    const ticket = await this.findOne(ticketId, changedById);

    await this.ticketsRepository.createHistory({
      ticketId,
      changedById,
      previousStatus: ticket.status,
      newStatus: ticket.status,
      comment: `Attachment uploaded: ${file.originalname}`,
    });

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: this.filesService.getAttachmentPublicUrl(ticketId, file.filename),
    };
  }

  async getAttachmentPath(
    ticketId: number,
    filename: string,
    currentUserId: number,
  ) {
    await this.findOne(ticketId, currentUserId);
    return this.filesService.resolveAttachmentAbsolutePath(ticketId, filename);
  }

  private async getActorContext(userId: number) {
    const currentUser = await this.usersService.findOne(userId);
    const role = this.resolveRoleName(
      (currentUser as { role?: string | { name?: string | null } | null }).role,
    );

    return {
      userId: currentUser.id,
      role,
    };
  }

  private async assertStaffAccess(userId: number) {
    const actor = await this.getActorContext(userId);
    if (actor.role === 'user') {
      throw new ForbiddenException('No tienes permisos para gestionar tickets');
    }
  }

  private resolveRoleName(role: string | { name?: string | null } | null | undefined) {
    if (typeof role === 'string') {
      const normalizedRole = role.trim().toLowerCase();
      if (normalizedRole === 'tecnico') {
        return 'agent' as const;
      }

      if (normalizedRole === 'admin' || normalizedRole === 'agent' || normalizedRole === 'user') {
        return normalizedRole;
      }
    }

    if (role && typeof role === 'object') {
      const normalizedRole = role.name?.trim().toLowerCase();
      if (normalizedRole === 'tecnico') {
        return 'agent' as const;
      }

      if (normalizedRole === 'admin' || normalizedRole === 'agent' || normalizedRole === 'user') {
        return normalizedRole;
      }
    }

    return 'user' as const;
  }
}
