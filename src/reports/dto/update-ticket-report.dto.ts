import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, ValidateNested } from 'class-validator';

import { CreateReportComponentItemDto } from './create-report-component-item.dto';
import { CreateTicketReportDto } from './create-ticket-report.dto';

export class UpdateTicketReportDto extends PartialType(CreateTicketReportDto) {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReportComponentItemDto)
  components?: CreateReportComponentItemDto[];
}
