import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';
import {
  VehicleService,
  ServiceStatus,
  ServiceType,
  IntegrityStatus,
} from '../entities/vehicle-service.entity';
import { CreateVehicleServiceDto } from '../dto/create-vehicle-service.dto';
import { UpdateVehicleServiceDto } from '../dto/update-vehicle-service.dto';
import { BlockchainService } from '@/modules/blockchain/blockchain.service';
import { Vehicle } from '../entities/vehicle.entity';
import { VehicleServiceFactory } from '../factories/vehicle-service.factory';
import { LoggerService } from '../../../common/logger/logger.service';

@Injectable()
export class VehicleServiceService {
  constructor(
    @InjectRepository(VehicleService)
    private vehicleServiceRepository: Repository<VehicleService>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    private blockchainService: BlockchainService,
    private vehicleServiceFactory: VehicleServiceFactory,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('VehicleServiceService');
  }

  async create(
    createVehicleServiceDto: CreateVehicleServiceDto,
  ): Promise<VehicleService> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: createVehicleServiceDto.vehicleId },
    });

    if (!vehicle) {
      this.logger.warn(
        'Tentativa de criar serviço para veículo inexistente',
        'VehicleServiceService',
        {
          vehicleId: createVehicleServiceDto.vehicleId,
        },
      );
      throw new BadRequestException('Veículo não encontrado');
    }

    const vehicleService = this.vehicleServiceRepository.create({
      ...createVehicleServiceDto,
      status: ServiceStatus.PENDING,
    });

    const savedService =
      await this.vehicleServiceRepository.save(vehicleService);

    this.processBlockchainAsync(savedService).catch((error) => {
      this.logger.error(
        'Erro ao processar serviço na blockchain de forma assíncrona',
        error.stack,
        'VehicleServiceService',
        {
          serviceId: savedService.id,
          errorMessage: error.message,
        },
      );
    });

    return savedService;
  }

  /**
   * Processa o registro na blockchain de forma assíncrona
   * @param service Serviço a ser processado
   */
  private async processBlockchainAsync(service: VehicleService): Promise<void> {
    try {
      const eventData = {
        serviceId: service.id,
        vehicleId: service.vehicleId,
        type: service.type,
        description: service.description,
        serviceDate: service.serviceDate,
        timestamp: new Date().toISOString(),
      };

      const serviceHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(eventData)),
      );

      this.logger.log(
        `INICIANDO: Registro do serviço ${service.id} na blockchain`,
        'VehicleServiceService',
        {
          serviceId: service.id,
          vehicleId: service.vehicleId,
          hash: serviceHash.substring(0, 20) + '...',
          type: service.type,
          status: 'PENDING',
          timestamp: new Date().toISOString(),
        },
      );

      const hashResult = await this.blockchainService.registerHashInContract(
        serviceHash,
        service.vehicleId,
        service.type || 'MANUTENCAO',
      );

      if (hashResult.success) {
        const blockchainHash = serviceHash;

        service.blockchainHash = blockchainHash;
        // ✅ Armazenar o transactionHash para uso na verificação
        service.transactionHash = hashResult.transactionHash || undefined;
        service.status = ServiceStatus.CONFIRMED;
        service.isImmutable = true;
        service.canEdit = false;
        service.blockchainConfirmedAt = new Date();
        service.confirmedBy = 'blockchain';

        await this.vehicleServiceRepository.save(service);

        this.logger.log(
          `SUCESSO: Serviço ${service.id} CONFIRMADO na blockchain! Status atualizado para CONFIRMED no banco de dados.`,
          'VehicleServiceService',
          {
            serviceId: service.id,
            vehicleId: service.vehicleId,
            status: 'CONFIRMED',
            blockchainHash: blockchainHash.substring(0, 20) + '...',
            transactionHash: hashResult.transactionHash
              ? hashResult.transactionHash.substring(0, 20) + '...'
              : 'N/A',
            blockchainConfirmedAt: service.blockchainConfirmedAt.toISOString(),
            isImmutable: true,
            canEdit: false,
            type: service.type,
            description: service.description?.substring(0, 50) + '...',
          },
        );
      } else {
        this.logger.warn(
          'Falha ao registrar serviço na blockchain',
          'VehicleServiceService',
          {
            serviceId: service.id,
            error: hashResult.error,
          },
        );

        service.status = ServiceStatus.REJECTED;
        service.canEdit = true;

        await this.vehicleServiceRepository.save(service);
      }
    } catch (error) {
      this.logger.error(
        'Erro ao processar serviço na blockchain',
        error.stack,
        'VehicleServiceService',
        {
          serviceId: service.id,
          errorMessage: error.message,
        },
      );

      service.status = ServiceStatus.REJECTED;
      service.canEdit = true;

      await this.vehicleServiceRepository.save(service);
    }
  }

  async findAll(userId?: string): Promise<VehicleService[]> {
    try {
      const queryBuilder = this.vehicleServiceRepository
        .createQueryBuilder('vehicleService')
        .leftJoinAndSelect('vehicleService.vehicle', 'vehicle')
        .orderBy('vehicleService.createdAt', 'DESC');

      if (userId) {
        queryBuilder.where('vehicle.userId = :userId', { userId });
      }

      const services = await queryBuilder.getMany();

      const validServices = services.filter(
        (service) => service.vehicle !== null,
      );

      return await this.vehicleServiceFactory.toResponseDtoArray(validServices);
    } catch (error) {
      this.logger.error(
        'Erro ao buscar serviços de veículos',
        error.stack,
        'VehicleServiceService',
        { userId },
      );
      throw error;
    }
  }

  async findByVehicleId(vehicleId: string): Promise<VehicleService[]> {
    const services = await this.vehicleServiceRepository.find({
      where: { vehicleId },
      relations: ['vehicle'],
      order: { serviceDate: 'DESC' },
    });
    return await this.vehicleServiceFactory.toResponseDtoArray(services);
  }

  async findOne(id: string): Promise<VehicleService> {
    const vehicleService = await this.vehicleServiceRepository.findOne({
      where: { id },
      relations: ['vehicle'],
    });

    if (!vehicleService) {
      throw new NotFoundException(`Serviço com ID ${id} não encontrado`);
    }

    // Verificar integridade se o serviço foi confirmado na blockchain
    // Fazer de forma assíncrona para não bloquear a resposta
    if (
      vehicleService.blockchainHash &&
      vehicleService.blockchainConfirmedAt &&
      vehicleService.status === ServiceStatus.CONFIRMED
    ) {
      this.blockchainService
        .verifyServiceIntegrity(id)
        .then((verification) => {
          if (verification.integrityStatus === IntegrityStatus.VIOLATED) {
            this.logger.warn(
              `Serviço ${id} com integridade violada detectada`,
              'VehicleServiceService',
              {
                serviceId: id,
                currentHash: verification.currentHash,
                blockchainHash: verification.blockchainHash,
              },
            );
          }
        })
        .catch((error) => {
          this.logger.debug(
            `Erro ao verificar integridade do serviço ${id}: ${error.message}`,
            'VehicleServiceService',
          );
        });
    }

    return await this.vehicleServiceFactory.toResponseDto(vehicleService);
  }

  async update(
    id: string,
    updateVehicleServiceDto: UpdateVehicleServiceDto,
  ): Promise<VehicleService> {
    const vehicleService = await this.findOne(id);

    if (vehicleService.isImmutable) {
      throw new BadRequestException(
        'Este serviço não pode ser editado pois está na blockchain',
      );
    }

    Object.assign(vehicleService, updateVehicleServiceDto);
    return await this.vehicleServiceRepository.save(vehicleService);
  }

  async remove(id: string): Promise<void> {
    const vehicleService = await this.findOne(id);

    if (vehicleService.isImmutable) {
      this.logger.warn(
        'Tentativa de remover serviço imutável na blockchain',
        'VehicleServiceService',
        {
          serviceId: id,
        },
      );
      throw new BadRequestException(
        'Este serviço não pode ser removido pois está na blockchain',
      );
    }

    await this.vehicleServiceRepository.remove(vehicleService);
  }

  async updateBlockchainStatus(
    id: string,
    hash: string | null,
    _confirmedBy: string,
  ): Promise<VehicleService> {
    const vehicleService = await this.findOne(id);

    if (!hash) {
      const eventData = {
        serviceId: vehicleService.id,
        vehicleId: vehicleService.vehicleId,
        type: vehicleService.type,
        description: vehicleService.description,
        serviceDate: vehicleService.serviceDate,
        timestamp: new Date().toISOString(),
      };
      hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(eventData)));
    }

    vehicleService.blockchainHash = hash;
    vehicleService.status = ServiceStatus.PENDING;
    vehicleService.isImmutable = false;
    vehicleService.canEdit = true;
    vehicleService.blockchainConfirmedAt = null;
    vehicleService.confirmedBy = null;

    return await this.vehicleServiceRepository.save(vehicleService);
  }

  async getServicesByType(
    type: ServiceType,
    userId?: string,
  ): Promise<VehicleService[]> {
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

  async getServicesByStatus(
    status: ServiceStatus,
    userId?: string,
  ): Promise<VehicleService[]> {
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
