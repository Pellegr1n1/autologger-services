import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleController } from './controllers/vehicle.controller';
import { VehicleService } from './services/vehicle.service';
import { VehicleBusinessRulesService } from './services/vehicle-business-rules.service';
import { VehicleRepository } from './repositories/vehicle.repository';
import { VehicleFactory } from './factories/vehicle.factory';
import { FileUploadService } from './services/file-upload.service';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleService as VehicleServiceEntity } from './entities/vehicle-service.entity';
import { VehicleServiceService } from './services/vehicle-service.service';
import { VehicleServiceController } from './controllers/vehicle-service.controller';
import { BlockchainModule } from '../../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, VehicleServiceEntity]),
    BlockchainModule,
  ],
  controllers: [VehicleController, VehicleServiceController],
  providers: [
    VehicleService,
    VehicleBusinessRulesService,
    VehicleRepository,
    VehicleFactory,
    FileUploadService,
    VehicleServiceService,
  ],
  exports: [
    VehicleService,
    VehicleRepository,
    VehicleFactory,
    FileUploadService,
    VehicleServiceService,
  ],
})
export class VehicleModule {}