import { IsString, IsInt, IsOptional, Length, Min, Max, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({ description: 'Placa do veículo', example: 'ABC1234' })
  @IsString()
  @Length(7, 8)
  @Matches(/^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/, {
    message: 'Placa deve estar no formato brasileiro (ABC1234 ou ABC1D23)'
  })
  plate: string;

  @ApiProperty({ description: 'Marca do veículo', example: 'Toyota' })
  @IsString()
  @Length(1, 50)
  brand: string;

  @ApiProperty({ description: 'Modelo do veículo', example: 'Corolla' })
  @IsString()
  @Length(1, 50)
  model: string;

  @ApiProperty({ description: 'Ano do veículo', example: 2020 })
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiProperty({ description: 'Cor do veículo', example: 'Branco' })
  @IsString()
  @Length(1, 30)
  color: string;

  @ApiProperty({ description: 'RENAVAM do veículo', example: '12345678901' })
  @IsString()
  @Length(11, 11)
  @Matches(/^[0-9]{11}$/, { message: 'RENAVAM deve conter exatamente 11 dígitos' })
  renavam: string;

  @ApiProperty({ description: 'Quilometragem atual', example: 50000, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;
}