import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';
import { VehicleService, ServiceStatus, ServiceType } from '../entities/vehicle-service.entity';
import { CreateVehicleServiceDto } from '../dto/create-vehicle-service.dto';
import { UpdateVehicleServiceDto } from '../dto/update-vehicle-service.dto';
import { BlockchainService } from '../../../blockchain/blockchain.service';
import { Vehicle } from '../entities/vehicle.entity';

@Injectable()
export class VehicleServiceService {
  constructor(
    @InjectRepository(VehicleService)
    private vehicleServiceRepository: Repository<VehicleService>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    private blockchainService: BlockchainService,
  ) {}

  async create(createVehicleServiceDto: CreateVehicleServiceDto): Promise<VehicleService> {
    // Verificar se o veículo existe e pertence ao usuário
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: createVehicleServiceDto.vehicleId },
    });

    if (!vehicle) {
      throw new BadRequestException('Veículo não encontrado');
    }

    // Criar o serviço no banco de dados
    const vehicleService = this.vehicleServiceRepository.create({
      ...createVehicleServiceDto,
      status: ServiceStatus.PENDING,
    });

    const savedService = await this.vehicleServiceRepository.save(vehicleService);

    // Processar blockchain de forma assíncrona (não bloquear a resposta)
    this.processBlockchainAsync(savedService).catch(error => {
      console.error('Erro ao processar blockchain de forma assíncrona:', error);
    });

    return savedService;
  }

  /**
   * Processa o registro na blockchain de forma assíncrona
   * @param service Serviço a ser processado
   */
  private async processBlockchainAsync(service: VehicleService): Promise<void> {
    try {
      console.log(`🔄 Iniciando processamento blockchain para serviço: ${service.id}`);
      
      // Primeiro, gerar o hash do serviço
      const eventData = {
        serviceId: service.id,
        vehicleId: service.vehicleId,
        type: service.type,
        description: service.description,
        serviceDate: service.serviceDate,
        timestamp: new Date().toISOString()
      };
      
      const serviceHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(eventData)));
      console.log(`🔑 Hash gerado para serviço ${service.id}: ${serviceHash}`);
      
      // Registrar o hash no contrato blockchain
      console.log(`📝 Tentando registrar hash no contrato blockchain...`);
      const hashResult = await this.blockchainService.registerHashInContract(
        serviceHash,
        service.vehicleId,
        service.type || 'MANUTENCAO'
      );

      console.log(`📊 Resultado do registro:`, hashResult);

      if (hashResult.success) {
        // Atualizar o serviço com informações da blockchain
        service.blockchainHash = serviceHash;
        service.status = ServiceStatus.CONFIRMED;
        service.isImmutable = true;
        service.canEdit = false;
        service.blockchainConfirmedAt = new Date();
        service.confirmedBy = 'blockchain';

        await this.vehicleServiceRepository.save(service);
        console.log(`✅ Serviço ${service.id} registrado na blockchain com sucesso - Hash: ${serviceHash}`);
      } else {
        // Marcar como rejeitado quando falha na blockchain
        service.status = ServiceStatus.REJECTED;
        service.canEdit = true; // Permite edição quando rejeitado
        
        await this.vehicleServiceRepository.save(service);
        console.warn(`⚠️ Serviço ${service.id} rejeitado pela blockchain: ${hashResult.error}`);
      }
    } catch (error) {
      // Marcar como rejeitado quando há exceção na blockchain
      service.status = ServiceStatus.REJECTED;
      service.canEdit = true; // Permite edição quando rejeitado
      
      await this.vehicleServiceRepository.save(service);
      console.error(`❌ Serviço ${service.id} rejeitado por erro na blockchain:`, error);
    }
  }

  async findAll(userId?: string): Promise<VehicleService[]> {
    const queryBuilder = this.vehicleServiceRepository
      .createQueryBuilder('vehicleService')
      .leftJoinAndSelect('vehicleService.vehicle', 'vehicle')
      .orderBy('vehicleService.createdAt', 'DESC');

    if (userId) {
      queryBuilder.where('vehicle.userId = :userId', { userId });
    }

    return await queryBuilder.getMany();
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

  async getServicesByType(type: ServiceType, userId?: string): Promise<VehicleService[]> {
    const queryBuilder = this.vehicleServiceRepository
      .createQueryBuilder('vehicleService')
      .leftJoinAndSelect('vehicleService.vehicle', 'vehicle')
      .where('vehicleService.type = :type', { type })
      .orderBy('vehicleService.serviceDate', 'DESC');

    if (userId) {
      queryBuilder.andWhere('vehicle.userId = :userId', { userId });
    }

    return await queryBuilder.getMany();
  }

  async getServicesByStatus(status: ServiceStatus, userId?: string): Promise<VehicleService[]> {
    const queryBuilder = this.vehicleServiceRepository
      .createQueryBuilder('vehicleService')
      .leftJoinAndSelect('vehicleService.vehicle', 'vehicle')
      .where('vehicleService.status = :status', { status })
      .orderBy('vehicleService.createdAt', 'DESC');

    if (userId) {
      queryBuilder.andWhere('vehicle.userId = :userId', { userId });
    }

    return await queryBuilder.getMany();
  }

  async getServicesByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<VehicleService[]> {
    const queryBuilder = this.vehicleServiceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.vehicle', 'vehicle')
      .where('service.serviceDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('service.serviceDate', 'DESC');

    if (userId) {
      queryBuilder.andWhere('vehicle.userId = :userId', { userId });
    }

    return await queryBuilder.getMany();
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
