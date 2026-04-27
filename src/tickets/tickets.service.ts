import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { EmailService } from '../email/email.service';
import { FilesService } from '../files/files.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { TicketPriority, TicketStatus } from '../generated/prisma/enums';
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

  async findAll(query: ListTicketsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.ticketsRepository.findAll({
        page,
        limit,
        status: query.status as TicketStatus | undefined,
        priority: query.priority as TicketPriority | undefined,
        assignedToId: query.assignedToId,
        createdById: query.createdById,
        search: query.search,
      }),
      this.ticketsRepository.count({
        status: query.status as TicketStatus | undefined,
        priority: query.priority as TicketPriority | undefined,
        assignedToId: query.assignedToId,
        createdById: query.createdById,
        search: query.search,
      }),
    ]);

    return {
      page,
      limit,
      total,
      data,
    };
  }

  async findOne(id: number) {
    const ticket = await this.ticketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async update(id: number, dto: UpdateTicketDto) {
    const ticket = await this.ticketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

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
    const ticket = await this.ticketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

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

    return updated;
  }

  async assign(id: number, dto: AssignTicketDto, changedById: number) {
    const ticket = await this.ticketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

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
    );

    return updated;
  }

  async remove(id: number) {
    const ticket = await this.ticketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

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

    const ticket = await this.findOne(ticketId);

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

  getAttachmentPath(ticketId: number, filename: string) {
    return this.filesService.resolveAttachmentAbsolutePath(ticketId, filename);
  }
}
