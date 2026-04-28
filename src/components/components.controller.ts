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

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ComponentsService } from './components.service';
import { CreateComponentDto } from './dto/create-component.dto';
import { ListComponentsQueryDto } from './dto/list-components-query.dto';
import { UpdateComponentDto } from './dto/update-component.dto';

@ApiTags('Components')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('components')
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Post()
  @Roles('admin', 'agent', 'tecnico')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a component (admin/agent/tecnico)' })
  @ApiForbiddenResponse({ description: 'Access denied. Staff role required.' })
  @ApiConflictResponse({ description: 'Component name already exists' })
  create(@Body() createComponentDto: CreateComponentDto) {
    return this.componentsService.create(createComponentDto);
  }

  @Get()
  @Roles('admin', 'agent', 'tecnico')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List components with optional pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query() query: ListComponentsQueryDto) {
    return this.componentsService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'agent', 'tecnico')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get one component by id' })
  @ApiNotFoundResponse({ description: 'Component not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.componentsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'agent', 'tecnico')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a component (admin/agent/tecnico)' })
  @ApiForbiddenResponse({ description: 'Access denied. Staff role required.' })
  @ApiConflictResponse({ description: 'Component name already exists' })
  @ApiNotFoundResponse({ description: 'Component not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateComponentDto: UpdateComponentDto,
  ) {
    return this.componentsService.update(id, updateComponentDto);
  }

  @Delete(':id')
  @Roles('admin', 'agent', 'tecnico')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Archive a component (admin/agent/tecnico)' })
  @ApiForbiddenResponse({ description: 'Access denied. Staff role required.' })
  @ApiNotFoundResponse({ description: 'Component not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.componentsService.remove(id);
  }
}
