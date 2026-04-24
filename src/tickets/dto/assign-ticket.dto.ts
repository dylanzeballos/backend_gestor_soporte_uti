import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AssignTicketDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  assignedToId!: number;
}
