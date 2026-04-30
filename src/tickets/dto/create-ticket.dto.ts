import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '../../generated/prisma/enums';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ minLength: 5, maxLength: 200 })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.medium })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: keyof typeof TicketPriority;

  @ApiPropertyOptional({ enum: TicketStatus, default: TicketStatus.open })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: keyof typeof TicketStatus;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  assignedToId?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  emitterId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  serviceId?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(1)
  slaMinutes?: number;
}
