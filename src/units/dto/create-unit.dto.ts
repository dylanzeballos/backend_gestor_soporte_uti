import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({ minLength: 5, maxLength: 30 })
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  name: string;
}
