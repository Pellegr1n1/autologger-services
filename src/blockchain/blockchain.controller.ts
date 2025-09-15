import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { BlockchainService, ServiceSubmissionResult, BlockchainTransaction } from './blockchain.service';
import { BesuService } from './besu/besu.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('blockchain')
@UseGuards(JwtAuthGuard)
export class BlockchainController {
  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly besuService: BesuService,
  ) {}

  @Post('services/submit')
  async submitService(@Body() serviceData: {
    serviceId: string;
    vehicleId: string;
    mileage: number;
    cost: number;
    description: string;
    location?: string;
    type?: string;
  }): Promise<ServiceSubmissionResult> {
    return this.blockchainService.submitServiceToBlockchain(serviceData);
  }

  @Post('services/:serviceId/confirm')
  async confirmService(@Param('serviceId') serviceId: string): Promise<ServiceSubmissionResult> {
    return this.blockchainService.confirmService(serviceId);
  }

  @Get('services/:serviceId/status')
  async getServiceStatus(@Param('serviceId') serviceId: string): Promise<BlockchainTransaction> {
    return this.blockchainService.getServiceStatus(serviceId);
  }

  @Get('services')
  async getAllServices() {
    return this.blockchainService.getAllServices();
  }

  @Post('services/verify')
  async forceVerifyAllServices() {
    return this.blockchainService.forceVerifyAllServices();
  }

  @Post('services/register-hashes')
  async registerAllExistingHashes() {
    return this.blockchainService.registerAllExistingHashes();
  }

  @Post('services/fix-invalid-hashes')
  async fixInvalidHashes() {
    return this.blockchainService.fixInvalidHashes();
  }

  @Post('services/clean-orphan-hashes')
  async cleanOrphanHashes() {
    return this.blockchainService.cleanOrphanHashes();
  }

  @Get('network/health')
  async getNetworkHealth() {
    return this.blockchainService.getNetworkHealth();
  }

  // Endpoints específicos para rede Besu
  @Post('besu/hash/register')
  async registerHash(@Body() data: {
    hash: string;
    vehicleId: string;
    eventType: string;
  }) {
    return this.besuService.registerHash(data.hash, data.vehicleId, data.eventType);
  }

  @Get('besu/hash/verify/:hash')
  async verifyHash(@Param('hash') hash: string) {
    return this.besuService.verifyHash(hash);
  }

  @Post('besu/hash/verify/:hash')
  async verifyAndCount(@Param('hash') hash: string) {
    return this.besuService.verifyAndCount(hash);
  }

  @Get('besu/vehicle/:vehicleId/hashes')
  async getVehicleHashes(@Param('vehicleId') vehicleId: string) {
    return this.besuService.getVehicleHashes(vehicleId);
  }

  @Get('besu/owner/:address/hashes')
  async getOwnerHashes(@Param('address') address: string) {
    return this.besuService.getOwnerHashes(address);
  }

  @Get('besu/contract/stats')
  async getContractStats() {
    return this.besuService.getContractStats();
  }

  @Get('besu/network/info')
  async getNetworkInfo() {
    return this.besuService.getNetworkInfo();
  }

  @Get('besu/connection/status')
  async getConnectionStatus() {
    const isConnected = await this.besuService.isConnected();
    return { connected: isConnected };
  }
}
