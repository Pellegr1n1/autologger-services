import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleController } from './controllers/vehicle.controller';
import { VehicleService } from './services/vehicle.service';
import { VehicleBusinessRulesService } from './services/vehicle-business-rules.service';
import { VehicleRepository } from './repositories/vehicle.repository';
import { VehicleFactory } from './factories/vehicle.factory';
import { Vehicle } from './entities/vehicle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle]),
  ],
  controllers: [VehicleController],
  providers: [
    VehicleService,
    VehicleBusinessRulesService,
    VehicleRepository,
    VehicleFactory,
  ],
  exports: [
    VehicleService,
    VehicleRepository,
    VehicleFactory,
  ],
})
export class VehicleModule {}