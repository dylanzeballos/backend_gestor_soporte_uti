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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateTicketReportDto } from './dto/create-ticket-report.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ReportStatsQueryDto } from './dto/report-stats-query.dto';
import { UpdateTicketReportDto } from './dto/update-ticket-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @Roles('admin', 'agent', 'tecnico')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create ticket report (admin/agent/tecnico)' })
  @ApiForbiddenResponse({ description: 'Access denied. Staff role required.' })
  @ApiNotFoundResponse({ description: 'Ticket or components not found' })
  @ApiConflictResponse({
    description: 'Ticket already has a report or duplicated components in payload',
  })
  create(
    @Body() createTicketReportDto: CreateTicketReportDto,
    @CurrentUser('sub') currentUserId: number,
  ) {
    return this.reportsService.create(createTicketReportDto, currentUserId);
  }

  @Get()
  @Roles('admin', 'agent', 'tecnico')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List ticket reports with optional pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'ticketId', required: false, type: Number })
  @ApiQuery({ name: 'createdById', required: false, type: Number })
  @ApiQuery({ name: 'componentId', required: false, type: Number })
  @ApiQuery({ name: 'ticketStatus', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  findAll(@Query() query: ListReportsQueryDto) {
    return this.reportsService.findAll(query);
  }

  @Get('stats/summary')
  @Roles('admin', 'agent', 'tecnico')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get report summary stats (admin/agent/tecnico)' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  getSummaryStats(@Query() query: ReportStatsQueryDto) {
    return this.reportsService.getSummaryStats(query);
  }

  @Get(':id')
  @Roles('admin', 'agent', 'tecnico')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get one report by id' })
  @ApiNotFoundResponse({ description: 'Report not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'agent', 'tecnico')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a report (admin/agent/tecnico)' })
  @ApiForbiddenResponse({ description: 'Access denied. Staff role required.' })
  @ApiNotFoundResponse({ description: 'Report/ticket/components not found' })
  @ApiConflictResponse({
    description: 'Ticket already has a report or duplicated components in payload',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTicketReportDto: UpdateTicketReportDto,
  ) {
    return this.reportsService.update(id, updateTicketReportDto);
  }

  @Delete(':id')
  @Roles('admin', 'agent', 'tecnico')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Archive a report (admin/agent/tecnico)' })
  @ApiForbiddenResponse({ description: 'Access denied. Staff role required.' })
  @ApiNotFoundResponse({ description: 'Report not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.remove(id);
  }
}
