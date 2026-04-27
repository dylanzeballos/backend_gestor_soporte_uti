import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketsService } from './tickets.service';
import { ticketsMulterOptions } from '../files/multer.config';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create ticket' })
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser('sub') currentUserId: number,
  ) {
    return this.ticketsService.create(dto, currentUserId);
  }

  @Get()
  @ApiOperation({ summary: 'List tickets with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'assignedToId', required: false, type: Number })
  @ApiQuery({ name: 'createdById', required: false, type: Number })
  @ApiQuery({ name: 'excludeCreatedById', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query() query: ListTicketsQueryDto,
    @CurrentUser('sub') currentUserId: number,
  ) {
    return this.ticketsService.findAll(query, currentUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by id' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') currentUserId: number,
  ) {
    return this.ticketsService.findOne(id, currentUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket basic fields' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @CurrentUser('sub') currentUserId: number,
  ) {
    return this.ticketsService.update(id, dto, currentUserId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change ticket status' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser('sub') currentUserId: number,
  ) {
    return this.ticketsService.updateStatus(id, dto, currentUserId);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign ticket to user' })
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTicketDto,
    @CurrentUser('sub') currentUserId: number,
  ) {
    return this.ticketsService.assign(id, dto, currentUserId);
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Upload ticket attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file', ticketsMulterOptions))
  uploadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') currentUserId: number,
  ) {
    return this.ticketsService.registerAttachment(id, file, currentUserId);
  }

  @Get(':id/attachments/:filename')
  @ApiOperation({ summary: 'Download ticket attachment' })
  @ApiParam({ name: 'filename', type: String })
  async downloadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('filename') filename: string,
    @CurrentUser('sub') currentUserId: number,
    @Res() response: Response,
  ) {
    const path = await this.ticketsService.getAttachmentPath(
      id,
      filename,
      currentUserId,
    );
    return response.download(path, filename);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive ticket (soft delete)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') currentUserId: number,
  ) {
    return this.ticketsService.remove(id, currentUserId);
  }
}
