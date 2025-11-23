import { ApiProperty } from '@nestjs/swagger';
import { VehicleStatus } from '../enums/vehicle-status.enum';

export class VehicleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  plate: string;

  @ApiProperty()
  brand: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  year: number;

  @ApiProperty()
  color: string;

  @ApiProperty()
  mileage: number;

  @ApiProperty({ required: false })
  photoUrl?: string;

  @ApiProperty({ enum: VehicleStatus })
  status: VehicleStatus;

  @ApiProperty({ required: false })
  soldAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<VehicleResponseDto>) {
    Object.assign(this, partial);
  }
}
