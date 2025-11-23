import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleServiceDto } from './create-vehicle-service.dto';

export class UpdateVehicleServiceDto extends PartialType(
  CreateVehicleServiceDto,
) {}
