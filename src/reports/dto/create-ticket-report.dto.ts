import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { CreateReportComponentItemDto } from './create-report-component-item.dto';

export class CreateTicketReportDto {
  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(1)
  ticketId!: number;

  @ApiProperty({ minLength: 10, maxLength: 500 })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  summary!: string;

  @ApiProperty({ minLength: 10, maxLength: 5000 })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  workPerformed!: string;

  @ApiPropertyOptional({ example: 'hardware', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  resolutionType?: string;

  @ApiPropertyOptional({ example: '2026-04-28T14:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional({ example: '2026-04-28T15:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  finishedAt?: string;

  @ApiPropertyOptional({ type: [CreateReportComponentItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReportComponentItemDto)
  components?: CreateReportComponentItemDto[];
}
