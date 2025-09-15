import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';
import { VehicleService, ServiceStatus, ServiceType } from '../entities/vehicle-service.entity';
import { CreateVehicleServiceDto } from '../dto/create-vehicle-service.dto';
import { UpdateVehicleServiceDto } from '../dto/update-vehicle-service.dto';
import { BlockchainService } from '../../../blockchain/blockchain.service';

@Injectable()
export class VehicleServiceService {
  constructor(
    @InjectRepository(VehicleService)
    private vehicleServiceRepository: Repository<VehicleService>,
    private blockchainService: BlockchainService,
  ) {}

  async create(createVehicleServiceDto: CreateVehicleServiceDto): Promise<VehicleService> {
    // Criar o serviço no banco de dados
    const vehicleService = this.vehicleServiceRepository.create({
      ...createVehicleServiceDto,
      status: ServiceStatus.PENDING,
    });

    const savedService = await this.vehicleServiceRepository.save(vehicleService);

    // Tentar registrar na blockchain
    try {
      const blockchainResult = await this.blockchainService.submitServiceToBlockchain({
        serviceId: savedService.id,
        vehicleId: savedService.vehicleId,
        mileage: savedService.mileage,
        cost: savedService.cost,
        description: savedService.description,
        location: savedService.location,
        type: savedService.type,
      });

      if (blockchainResult.success) {
        // Atualizar o serviço com informações da blockchain
        savedService.blockchainHash = blockchainResult.transactionHash;
        savedService.status = ServiceStatus.CONFIRMED;
        savedService.isImmutable = true;
        savedService.canEdit = false;
        savedService.blockchainConfirmedAt = new Date();
        savedService.confirmedBy = 'blockchain';

        return await this.vehicleServiceRepository.save(savedService);
      }
    } catch (error) {
      console.error('Erro ao registrar na blockchain:', error);
      // O serviço foi criado no banco, mas falhou na blockchain
      // Pode ser processado posteriormente
    }

    return savedService;
  }

  async findAll(): Promise<VehicleService[]> {
    return await this.vehicleServiceRepository.find({
      relations: ['vehicle'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByVehicleId(vehicleId: string): Promise<VehicleService[]> {
    return await this.vehicleServiceRepository.find({
      where: { vehicleId },
      relations: ['vehicle'],
      order: { serviceDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<VehicleService> {
    const vehicleService = await this.vehicleServiceRepository.findOne({
      where: { id },
      relations: ['vehicle'],
    });

    if (!vehicleService) {
      throw new NotFoundException(`Serviço com ID ${id} não encontrado`);
    }

    return vehicleService;
  }

  async update(id: string, updateVehicleServiceDto: UpdateVehicleServiceDto): Promise<VehicleService> {
    const vehicleService = await this.findOne(id);

    if (vehicleService.isImmutable) {
      throw new BadRequestException('Este serviço não pode ser editado pois está na blockchain');
    }

    Object.assign(vehicleService, updateVehicleServiceDto);
    return await this.vehicleServiceRepository.save(vehicleService);
  }

  async remove(id: string): Promise<void> {
    const vehicleService = await this.findOne(id);

    if (vehicleService.isImmutable) {
      throw new BadRequestException('Este serviço não pode ser removido pois está na blockchain');
    }

    await this.vehicleServiceRepository.remove(vehicleService);
  }

  async updateBlockchainStatus(
    id: string,
    hash: string | null,
    confirmedBy: string,
  ): Promise<VehicleService> {
    const vehicleService = await this.findOne(id);

    // Se não foi fornecido hash, gerar um
    if (!hash) {
      const eventData = {
        serviceId: vehicleService.id,
        vehicleId: vehicleService.vehicleId,
        type: vehicleService.type,
        description: vehicleService.description,
        serviceDate: vehicleService.serviceDate,
        timestamp: new Date().toISOString()
      };
      hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(eventData)));
    }

    vehicleService.blockchainHash = hash;
    vehicleService.status = ServiceStatus.CONFIRMED;
    vehicleService.isImmutable = true;
    vehicleService.canEdit = false;
    vehicleService.blockchainConfirmedAt = new Date();
    vehicleService.confirmedBy = confirmedBy;

    return await this.vehicleServiceRepository.save(vehicleService);
  }

  async getServicesByType(type: ServiceType): Promise<VehicleService[]> {
    return await this.vehicleServiceRepository.find({
      where: { type },
      relations: ['vehicle'],
      order: { serviceDate: 'DESC' },
    });
  }

  async getServicesByStatus(status: ServiceStatus): Promise<VehicleService[]> {
    return await this.vehicleServiceRepository.find({
      where: { status },
      relations: ['vehicle'],
      order: { createdAt: 'DESC' },
    });
  }

  async getServicesByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<VehicleService[]> {
    return await this.vehicleServiceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.vehicle', 'vehicle')
      .where('service.serviceDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('service.serviceDate', 'DESC')
      .getMany();
  }

  async getServicesByMileageRange(
    minMileage: number,
    maxMileage: number,
  ): Promise<VehicleService[]> {
    return await this.vehicleServiceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.vehicle', 'vehicle')
      .where('service.mileage BETWEEN :minMileage AND :maxMileage', {
        minMileage,
        maxMileage,
      })
      .orderBy('service.mileage', 'DESC')
      .getMany();
  }

  async getTotalCostByVehicle(vehicleId: string): Promise<number> {
    const result = await this.vehicleServiceRepository
      .createQueryBuilder('service')
      .select('SUM(service.cost)', 'total')
      .where('service.vehicleId = :vehicleId', { vehicleId })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  async getServicesCountByVehicle(vehicleId: string): Promise<number> {
    return await this.vehicleServiceRepository.count({
      where: { vehicleId },
    });
  }
}
