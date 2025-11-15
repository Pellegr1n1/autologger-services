import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VehicleServiceService } from './vehicle-service.service';
import { VehicleService, ServiceStatus, ServiceType } from '../entities/vehicle-service.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { VehicleServiceFactory } from '../factories/vehicle-service.factory';
import { CreateVehicleServiceDto } from '../dto/create-vehicle-service.dto';
import { UpdateVehicleServiceDto } from '../dto/update-vehicle-service.dto';

describe('VehicleServiceService', () => {
  let service: VehicleServiceService;
  let vehicleServiceRepository: jest.Mocked<Repository<VehicleService>>;
  let vehicleRepository: jest.Mocked<Repository<Vehicle>>;
  let blockchainService: jest.Mocked<BlockchainService>;

  const mockVehicle = {
    id: 'vehicle-123',
    brand: 'Toyota',
    model: 'Corolla',
    plate: 'ABC1234',
    year: 2020,
    userId: 'user-123',
    status: 'active' as any,
  };

  const mockVehicleService = {
    id: 'service-123',
    vehicleId: 'vehicle-123',
    type: ServiceType.MAINTENANCE,
    category: 'Oleo',
    description: 'Troca de oleo',
    serviceDate: new Date(),
    mileage: 50000,
    cost: 150,
    location: 'Oficina',
    status: ServiceStatus.PENDING,
    isImmutable: false,
    canEdit: true,
    blockchainHash: null,
    blockchainConfirmedAt: null,
    confirmedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockVehicleServiceRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockVehicleRepository = {
      findOne: jest.fn(),
    };

    const mockBlockchainService = {
      registerHashInContract: jest.fn(),
    };

    const mockVehicleServiceFactory = {
      toResponseDto: jest.fn((service) => Promise.resolve(service)),
      toResponseDtoArray: jest.fn((services) => Promise.resolve(services)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleServiceService,
        {
          provide: getRepositoryToken(VehicleService),
          useValue: mockVehicleServiceRepository,
        },
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockVehicleRepository,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
        {
          provide: VehicleServiceFactory,
          useValue: mockVehicleServiceFactory,
        },
      ],
    }).compile();

    service = module.get<VehicleServiceService>(VehicleServiceService);
    vehicleServiceRepository = module.get(getRepositoryToken(VehicleService));
    vehicleRepository = module.get(getRepositoryToken(Vehicle));
    blockchainService = module.get(BlockchainService);
    vehicleServiceFactory = module.get(VehicleServiceFactory);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create vehicle service successfully', async () => {
      const createDto: CreateVehicleServiceDto = {
        vehicleId: 'vehicle-123',
        type: ServiceType.MAINTENANCE,
        category: 'Oleo',
        description: 'Troca de oleo',
        serviceDate: new Date(),
        mileage: 50000,
        cost: 150,
        location: 'Oficina',
      };

      vehicleRepository.findOne.mockResolvedValue(mockVehicle as any);
      vehicleServiceRepository.create.mockReturnValue(mockVehicleService as any);
      vehicleServiceRepository.save.mockResolvedValue(mockVehicleService as any);
      blockchainService.registerHashInContract.mockResolvedValue({ success: true });

      const result = await service.create(createDto);

      expect(vehicleRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.vehicleId },
      });
      expect(vehicleServiceRepository.create).toHaveBeenCalledWith({
        ...createDto,
        status: ServiceStatus.PENDING,
      });
      expect(result).toEqual(mockVehicleService);
    });

    it('should throw BadRequestException when vehicle not found', async () => {
      const createDto: CreateVehicleServiceDto = {
        vehicleId: 'vehicle-999',
        type: ServiceType.MAINTENANCE,
        category: 'Oleo',
        description: 'Troca de oleo',
        serviceDate: new Date(),
        mileage: 50000,
        cost: 150,
        location: 'Oficina',
      };

      vehicleRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle blockchain processing error', async () => {
      const createDto: CreateVehicleServiceDto = {
        vehicleId: 'vehicle-123',
        type: ServiceType.MAINTENANCE,
        category: 'Oleo',
        description: 'Troca de oleo',
        serviceDate: new Date(),
        mileage: 50000,
        cost: 150,
        location: 'Oficina',
      };

      vehicleRepository.findOne.mockResolvedValue(mockVehicle as any);
      vehicleServiceRepository.create.mockReturnValue(mockVehicleService as any);
      vehicleServiceRepository.save.mockResolvedValue(mockVehicleService as any);
      blockchainService.registerHashInContract.mockRejectedValue(new Error('Blockchain error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.create(createDto);

      expect(result).toEqual(mockVehicleService);
      // Wait a bit for async processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      consoleSpy.mockRestore();
    });
  });

  describe('findAll', () => {
    it('should return all services when userId is provided', async () => {
      const services = [mockVehicleService];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(services),
      };

      vehicleServiceRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findAll('user-123');

      expect(queryBuilder.where).toHaveBeenCalledWith('vehicle.userId = :userId', { userId: 'user-123' });
      expect(result).toEqual(services);
    });

    it('should return all services when userId is not provided', async () => {
      const services = [mockVehicleService];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(services),
      };

      vehicleServiceRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findAll();

      expect(queryBuilder.where).not.toHaveBeenCalled();
      expect(result).toEqual(services);
    });
  });

  describe('findByVehicleId', () => {
    it('should return services by vehicle id', async () => {
      const services = [mockVehicleService];
      vehicleServiceRepository.find.mockResolvedValue(services as any);

      const result = await service.findByVehicleId('vehicle-123');

      expect(vehicleServiceRepository.find).toHaveBeenCalledWith({
        where: { vehicleId: 'vehicle-123' },
        relations: ['vehicle'],
        order: { serviceDate: 'DESC' },
      });
      expect(result).toEqual(services);
    });
  });

  describe('findOne', () => {
    it('should return service by id', async () => {
      vehicleServiceRepository.findOne.mockResolvedValue(mockVehicleService as any);

      const result = await service.findOne('service-123');

      expect(vehicleServiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'service-123' },
        relations: ['vehicle'],
      });
      expect(result).toEqual(mockVehicleService);
    });

    it('should throw NotFoundException when service not found', async () => {
      vehicleServiceRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('service-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update service successfully', async () => {
      const updateDto: UpdateVehicleServiceDto = {
        description: 'Nova descricao',
      };

      const serviceToUpdate = { ...mockVehicleService, isImmutable: false };
      const updatedService = { ...serviceToUpdate, description: 'Nova descricao' };
      vehicleServiceRepository.findOne.mockResolvedValue(serviceToUpdate as any);
      vehicleServiceRepository.save.mockResolvedValue(updatedService as any);

      const result = await service.update('service-123', updateDto);

      expect(vehicleServiceRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedService);
    });

    it('should throw BadRequestException when service is immutable', async () => {
      const updateDto: UpdateVehicleServiceDto = {
        description: 'Nova descricao',
      };

      const immutableService = { ...mockVehicleService, isImmutable: true };
      vehicleServiceRepository.findOne.mockResolvedValue(immutableService as any);

      await expect(service.update('service-123', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove service successfully', async () => {
      const serviceToRemove = { ...mockVehicleService, isImmutable: false };
      vehicleServiceRepository.findOne.mockResolvedValue(serviceToRemove as any);
      vehicleServiceRepository.remove.mockResolvedValue(serviceToRemove as any);

      await service.remove('service-123');

      expect(vehicleServiceRepository.remove).toHaveBeenCalledWith(serviceToRemove);
    });

    it('should throw BadRequestException when service is immutable', async () => {
      const immutableService = { ...mockVehicleService, isImmutable: true };
      vehicleServiceRepository.findOne.mockResolvedValue(immutableService as any);

      await expect(service.remove('service-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateBlockchainStatus', () => {
    it('should update blockchain status with provided hash', async () => {
      const hash = 'hash123';
      const confirmedBy = 'blockchain';

      const updatedService = {
        ...mockVehicleService,
        blockchainHash: hash,
        status: ServiceStatus.PENDING,
      };

      vehicleServiceRepository.findOne.mockResolvedValue(mockVehicleService as any);
      vehicleServiceRepository.save.mockResolvedValue(updatedService as any);

      const result = await service.updateBlockchainStatus('service-123', hash, confirmedBy);

      expect(vehicleServiceRepository.save).toHaveBeenCalled();
      expect(result.blockchainHash).toBe(hash);
    });

    it('should generate hash when not provided', async () => {
      const confirmedBy = 'blockchain';

      const updatedService = {
        ...mockVehicleService,
        blockchainHash: 'generated-hash',
        status: ServiceStatus.PENDING,
      };

      vehicleServiceRepository.findOne.mockResolvedValue(mockVehicleService as any);
      vehicleServiceRepository.save.mockResolvedValue(updatedService as any);

      const result = await service.updateBlockchainStatus('service-123', null, confirmedBy);

      expect(vehicleServiceRepository.save).toHaveBeenCalled();
      expect(result.blockchainHash).toBeDefined();
    });
  });

  describe('getServicesByType', () => {
    it('should return services by type with userId', async () => {
      const services = [mockVehicleService];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(services),
      };

      vehicleServiceRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getServicesByType(ServiceType.MAINTENANCE, 'user-123');

      expect(queryBuilder.where).toHaveBeenCalledWith('vehicleService.type = :type', { type: ServiceType.MAINTENANCE });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('vehicle.userId = :userId', { userId: 'user-123' });
      expect(result).toEqual(services);
    });

    it('should return services by type without userId', async () => {
      const services = [mockVehicleService];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(services),
      };

      vehicleServiceRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getServicesByType(ServiceType.MAINTENANCE);

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(services);
    });
  });

  describe('getServicesByStatus', () => {
    it('should return services by status with userId', async () => {
      const services = [mockVehicleService];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(services),
      };

      vehicleServiceRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getServicesByStatus(ServiceStatus.PENDING, 'user-123');

      expect(queryBuilder.where).toHaveBeenCalledWith('vehicleService.status = :status', { status: ServiceStatus.PENDING });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('vehicle.userId = :userId', { userId: 'user-123' });
      expect(result).toEqual(services);
    });
  });

  describe('getServicesByDateRange', () => {
    it('should return services by date range with userId', async () => {
      const services = [mockVehicleService];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(services),
      };

      vehicleServiceRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getServicesByDateRange(startDate, endDate, 'user-123');

      expect(queryBuilder.where).toHaveBeenCalledWith('service.serviceDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('vehicle.userId = :userId', { userId: 'user-123' });
      expect(result).toEqual(services);
    });
  });

  describe('getServicesByMileageRange', () => {
    it('should return services by mileage range', async () => {
      const services = [mockVehicleService];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(services),
      };

      vehicleServiceRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getServicesByMileageRange(0, 100000);

      expect(queryBuilder.where).toHaveBeenCalledWith('service.mileage BETWEEN :minMileage AND :maxMileage', {
        minMileage: 0,
        maxMileage: 100000,
      });
      expect(result).toEqual(services);
    });
  });

  describe('getTotalCostByVehicle', () => {
    it('should return total cost by vehicle', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '500' }),
      };

      vehicleServiceRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getTotalCostByVehicle('vehicle-123');

      expect(queryBuilder.select).toHaveBeenCalledWith('SUM(service.cost)', 'total');
      expect(queryBuilder.where).toHaveBeenCalledWith('service.vehicleId = :vehicleId', { vehicleId: 'vehicle-123' });
      expect(result).toBe(500);
    });

    it('should return 0 when total is null', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };

      vehicleServiceRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getTotalCostByVehicle('vehicle-123');

      expect(result).toBe(0);
    });
  });

  describe('getServicesCountByVehicle', () => {
    it('should return services count by vehicle', async () => {
      vehicleServiceRepository.count.mockResolvedValue(5);

      const result = await service.getServicesCountByVehicle('vehicle-123');

      expect(vehicleServiceRepository.count).toHaveBeenCalledWith({
        where: { vehicleId: 'vehicle-123' },
      });
      expect(result).toBe(5);
    });
  });
});

