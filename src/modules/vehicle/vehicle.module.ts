import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleController } from './controllers/vehicle.controller';
import { VehicleService } from './services/vehicle.service';
import { VehicleBusinessRulesService } from './services/vehicle-business-rules.service';
import { VehicleRepository } from './repositories/vehicle.repository';
import { VehicleFactory } from './factories/vehicle.factory';
import { VehicleServiceFactory } from './factories/vehicle-service.factory';
import { FileUploadService } from './services/file-upload.service';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleService as VehicleServiceEntity } from './entities/vehicle-service.entity';
import { VehicleServiceService } from './services/vehicle-service.service';
import { VehicleServiceController } from './controllers/vehicle-service.controller';
import { VehicleShare } from './entities/vehicle-share.entity';
import { VehicleShareService } from './services/vehicle-share.service';
import { VehicleShareController } from './controllers/vehicle-share.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, VehicleServiceEntity, VehicleShare]),
    BlockchainModule,
    StorageModule,
  ],
  controllers: [
    VehicleController,
    VehicleServiceController,
    VehicleShareController,
  ],
  providers: [
    VehicleService,
    VehicleBusinessRulesService,
    VehicleRepository,
    VehicleFactory,
    VehicleServiceFactory,
    FileUploadService,
    VehicleServiceService,
    VehicleShareService,
  ],
  exports: [
    VehicleService,
    VehicleRepository,
    VehicleFactory,
    FileUploadService,
    VehicleServiceService,
    VehicleShareService,
  ],
})
export class VehicleModule {}
