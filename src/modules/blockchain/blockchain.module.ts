import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { ConfigModule } from '@nestjs/config';
import { BesuService } from './besu/besu.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleService } from '../vehicle/entities/vehicle-service.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([VehicleService])],
  providers: [BlockchainService, BesuService],
  controllers: [BlockchainController],
  exports: [BlockchainService, BesuService],
})
export class BlockchainModule {}
