import {
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType } from '../entities/vehicle-service.entity';

export class CreateVehicleServiceDto {
  @IsString()
  vehicleId: string;

  @IsEnum(ServiceType)
  type: ServiceType;

  @IsString()
  category: string;

  @IsString()
  description: string;

  @Type(() => Date)
  @IsDate()
  serviceDate: Date;

  @IsNumber()
  mileage: number;

  @IsNumber()
  cost: number;

  @IsString()
  location: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsString()
  technician?: string;

  @IsOptional()
  @IsBoolean()
  warranty?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextServiceDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
