import { IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkVehicleSoldDto {
  @ApiProperty({ 
    description: 'Data da venda (opcional, usa data atual se não fornecida)',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  soldAt?: string;
}