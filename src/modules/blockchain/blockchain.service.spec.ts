import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { BlockchainService } from './blockchain.service';
import { BesuService } from './besu/besu.service';
import {
  VehicleService,
  ServiceStatus,
  IntegrityStatus,
} from '../vehicle/entities/vehicle-service.entity';
import { LoggerService } from '@/common/logger/logger.service';
import { LoggerServiceTestHelper } from '@/common/test-helpers/logger-service.test-helper';

const hashCache = new Map<string, string>();
let hashCounter = 0;

jest.mock('ethers', () => ({
  ethers: {
    keccak256: jest.fn((data) => {
      const dataStr = data.toString();
      if (!hashCache.has(dataStr)) {
        const hash = '0x' + (hashCounter++).toString(16).padStart(64, '0');
        hashCache.set(dataStr, hash);
      }
      return hashCache.get(dataStr)!;
    }),
    toUtf8Bytes: jest.fn((str) => Buffer.from(str)),
  },
}));

describe('BlockchainService', () => {
  let service: BlockchainService;
  let besuService: jest.Mocked<BesuService>;
  let vehicleServiceRepository: jest.Mocked<Repository<VehicleService>>;

  let mockQueryBuilder: any;

  beforeEach(() => {
    // Limpar cache de hash antes de cada teste
    hashCache.clear();
    hashCounter = 0;
  });

  beforeEach(async () => {
    const mockBesuService = {
      isConnected: jest.fn(),
      registerService: jest.fn(),
      registerHash: jest.fn(),
      verifyHashInContract: jest.fn(),
      isTransactionConfirmed: jest.fn(),
      getContractStats: jest.fn(),
      getNetworkInfo: jest.fn(),
      verifyHash: jest.fn(),
    };

    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockLoggerService = LoggerServiceTestHelper.createMockLoggerService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: BesuService,
          useValue: mockBesuService,
        },
        {
          provide: getRepositoryToken(VehicleService),
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<BlockchainService>(BlockchainService);
    besuService = module.get(BesuService);
    vehicleServiceRepository = module.get(getRepositoryToken(VehicleService));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitServiceToBlockchain', () => {
    it('should submit service to blockchain successfully', async () => {
      const serviceData = {
        serviceId: 'service-123',
        vehicleId: 'vehicle-123',
        mileage: 50000,
        cost: 1000,
        description: 'Oil change',
        type: 'MANUTENCAO',
      };

      besuService.isConnected.mockResolvedValue(true);
      besuService.registerService.mockResolvedValue({
        success: true,
        transactionHash: 'tx-hash-123',
        serviceId: 1,
      });

      const result = await service.submitServiceToBlockchain(serviceData);

      expect(besuService.isConnected).toHaveBeenCalled();
      expect(besuService.registerService).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.status).toBe('SUBMITTED');
    });

    it('should return failure when Besu is not connected', async () => {
      const serviceData = {
        serviceId: 'service-123',
        vehicleId: 'vehicle-123',
        mileage: 50000,
        cost: 1000,
        description: 'Oil change',
      };

      besuService.isConnected.mockResolvedValue(false);

      const result = await service.submitServiceToBlockchain(serviceData);

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
    });

    it('should handle Besu errors', async () => {
      const serviceData = {
        serviceId: 'service-123',
        vehicleId: 'vehicle-123',
        mileage: 50000,
        cost: 1000,
        description: 'Oil change',
      };

      besuService.isConnected.mockResolvedValue(true);
      besuService.registerService.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await service.submitServiceToBlockchain(serviceData);

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
    });
  });

  describe('confirmService', () => {
    it('should confirm service successfully', async () => {
      besuService.isConnected.mockResolvedValue(true);

      const result = await service.confirmService('service-123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('CONFIRMED');
    });

    it('should return failure when Besu is not connected', async () => {
      besuService.isConnected.mockResolvedValue(false);

      const result = await service.confirmService('service-123');

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
    });
  });

  describe('getServiceStatus', () => {
    it('should return service status when connected', async () => {
      besuService.isConnected.mockResolvedValue(true);

      const result = await service.getServiceStatus('service-123');

      expect(result.status).toBe('CONFIRMED');
      expect(result.hash).toBe('service-123');
    });

    it('should return failed status when not connected', async () => {
      besuService.isConnected.mockResolvedValue(false);

      const result = await service.getServiceStatus('service-123');

      expect(result.status).toBe('FAILED');
    });
  });

  describe('getNetworkHealth', () => {
    it('should return healthy status when connected', async () => {
      besuService.isConnected.mockResolvedValue(true);
      besuService.getNetworkInfo.mockResolvedValue({
        blockNumber: 100,
        gasPrice: '1000000000',
        chainId: 1337,
        networkName: 'Besu Network',
      });

      const result = await service.getNetworkHealth();

      expect(result.status).toBe('HEALTHY');
      expect(result.blockNumber).toBe(100);
    });

    it('should return unhealthy status when not connected', async () => {
      besuService.isConnected.mockResolvedValue(false);

      const result = await service.getNetworkHealth();

      expect(result.status).toBe('UNHEALTHY');
    });
  });

  describe('resendFailedService', () => {
    it('should resend failed service successfully and store transactionHash', async () => {
      const mockService = {
        id: 'service-123',
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO',
        description: 'Oil change',
        serviceDate: new Date(),
        status: ServiceStatus.REJECTED,
        blockchainHash: null,
        transactionHash: null,
      };

      vehicleServiceRepository.findOne.mockResolvedValue(mockService as any);
      besuService.isConnected.mockResolvedValue(true);
      besuService.verifyHashInContract.mockResolvedValue(false);
      besuService.registerHash.mockResolvedValue({
        success: true,
        transactionHash: 'tx-hash-123',
      });
      
      const savedService = {
        ...mockService,
        blockchainHash: '0xhash123',
        transactionHash: 'tx-hash-123',
        status: ServiceStatus.CONFIRMED,
      };
      vehicleServiceRepository.save.mockResolvedValue(savedService as any);

      const result = await service.resendFailedService('service-123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('CONFIRMED');
      
      expect(vehicleServiceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionHash: 'tx-hash-123',
        })
      );
    });

    it('should return failure when service not found', async () => {
      vehicleServiceRepository.findOne.mockResolvedValue(null);

      const result = await service.resendFailedService('service-123');

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
    });
  });

  describe('resetRetryCount', () => {
    it('should reset retry count successfully', async () => {
      vehicleServiceRepository.update.mockResolvedValue(undefined);

      const result = await service.resetRetryCount('service-123');

      expect(result.success).toBe(true);
      expect(vehicleServiceRepository.update).toHaveBeenCalled();
    });
  });

  describe('resetAllFailedRetries', () => {
    it('should reset all failed retries', async () => {
      const failedServices = [
        { id: 'service-1', status: ServiceStatus.REJECTED },
        { id: 'service-2', status: ServiceStatus.EXPIRED },
      ];

      vehicleServiceRepository.find.mockResolvedValue(failedServices as any);
      vehicleServiceRepository.update.mockResolvedValue(undefined);

      const result = await service.resetAllFailedRetries();

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });

    it('should handle errors when resetting retries', async () => {
      vehicleServiceRepository.find.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.resetAllFailedRetries();

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
    });
  });

  describe('forceVerifyAllServices', () => {
    it('should verify all services successfully', async () => {
      const mockServices = [
        {
          id: 'service-1',
          blockchainHash: 'hash-1',
          status: ServiceStatus.PENDING,
          blockchainConfirmedAt: null,
        },
        {
          id: 'service-2',
          blockchainHash: 'hash-2',
          status: ServiceStatus.CONFIRMED,
          blockchainConfirmedAt: new Date(),
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      besuService.verifyHashInContract.mockResolvedValue(true);
      vehicleServiceRepository.update.mockResolvedValue(undefined);

      const result = await service.forceVerifyAllServices();

      expect(result).toHaveLength(2);
      expect(besuService.verifyHashInContract).toHaveBeenCalledTimes(2);
    });

    it('should handle services without hash', async () => {
      const mockServices = [
        {
          id: 'service-1',
          blockchainHash: null,
          status: ServiceStatus.PENDING,
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);

      const result = await service.forceVerifyAllServices();

      expect(result).toHaveLength(1);
      expect(besuService.verifyHashInContract).not.toHaveBeenCalled();
    });

    it('should update service status when hash exists in blockchain', async () => {
      const mockService = {
        id: 'service-1',
        blockchainHash: 'hash-1',
        status: ServiceStatus.PENDING,
        blockchainConfirmedAt: null,
      };

      vehicleServiceRepository.find.mockResolvedValue([mockService] as any);
      besuService.verifyHashInContract.mockResolvedValue(true);
      vehicleServiceRepository.update.mockResolvedValue(undefined);

      await service.forceVerifyAllServices();

      expect(vehicleServiceRepository.update).toHaveBeenCalledWith(
        { id: 'service-1' },
        expect.objectContaining({
          status: ServiceStatus.CONFIRMED,
        }),
      );
    });

    it('should mark service as rejected when hash does not exist', async () => {
      const mockService = {
        id: 'service-1',
        blockchainHash: 'hash-1',
        status: ServiceStatus.CONFIRMED,
        blockchainConfirmedAt: new Date(),
        vehicleId: 'vehicle-1',
        type: 'MANUTENCAO',
        description: 'Test service',
        serviceDate: new Date(),
        createdAt: new Date(),
      };

      vehicleServiceRepository.find.mockResolvedValue([mockService] as any);
      besuService.verifyHashInContract.mockResolvedValue(false);
      besuService.isTransactionConfirmed.mockResolvedValue(false);
      vehicleServiceRepository.update.mockResolvedValue(undefined);

      await service.forceVerifyAllServices();

      expect(vehicleServiceRepository.update).toHaveBeenCalledWith(
        { id: 'service-1' },
        expect.objectContaining({
          status: ServiceStatus.REJECTED,
        }),
      );
    });

    it('should handle errors during verification', async () => {
      const mockService = {
        id: 'service-1',
        blockchainHash: 'hash-1',
        status: ServiceStatus.PENDING,
      };

      vehicleServiceRepository.find.mockResolvedValue([mockService] as any);
      besuService.verifyHashInContract.mockRejectedValue(
        new Error('Verification error'),
      );

      const result = await service.forceVerifyAllServices();

      expect(result).toHaveLength(1);
      expect(result[0].blockchainVerified).toBe(false);
    });

    it('should throw error when repository fails', async () => {
      vehicleServiceRepository.find.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.forceVerifyAllServices()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('fixInvalidHashes', () => {
    it('should fix invalid hashes successfully', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          type: 'MANUTENCAO',
          description: 'Oil change',
          serviceDate: new Date(),
          blockchainHash: 'pending-hash',
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      vehicleServiceRepository.update.mockResolvedValue(undefined);
      besuService.registerHash.mockResolvedValue({
        success: true,
        transactionHash: 'tx-hash-123',
      });

      const result = await service.fixInvalidHashes();

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(besuService.registerHash).toHaveBeenCalled();
    });

    it('should handle errors when fixing hashes', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          type: 'MANUTENCAO',
          description: 'Oil change',
          serviceDate: new Date(),
          blockchainHash: 'pending-hash',
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      vehicleServiceRepository.update.mockResolvedValue(undefined);
      besuService.registerHash.mockResolvedValue({
        success: false,
        error: 'Registration failed',
      });

      const result = await service.fixInvalidHashes();

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(1);
    });

    it('should handle exceptions during hash fixing', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          type: 'MANUTENCAO',
          description: 'Oil change',
          serviceDate: new Date(),
          blockchainHash: 'pending-hash',
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      vehicleServiceRepository.update.mockRejectedValue(
        new Error('Update error'),
      );

      // The method catches errors and increments errorCount, it doesn't throw
      const result = await service.fixInvalidHashes();

      expect(result.success).toBe(true);
      expect(result.errorCount).toBeGreaterThan(0);
    });
  });

  describe('cleanOrphanHashes', () => {
    it('should detect orphan hashes', async () => {
      const mockServices = [
        {
          id: 'service-1',
          blockchainHash: 'hash-1',
        },
        {
          id: 'service-2',
          blockchainHash: 'hash-2',
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      besuService.getContractStats.mockResolvedValue({
        totalHashes: 5,
        contractBalance: '1000',
      });

      const result = await service.cleanOrphanHashes();

      expect(result.success).toBe(true);
      expect(result.orphanCount).toBe(3);
    });

    it('should return zero orphan count when none exist', async () => {
      const mockServices = [
        {
          id: 'service-1',
          blockchainHash: 'hash-1',
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      besuService.getContractStats.mockResolvedValue({
        totalHashes: 1,
        contractBalance: '1000',
      });

      const result = await service.cleanOrphanHashes();

      expect(result.success).toBe(true);
      expect(result.orphanCount).toBe(0);
    });

    it('should handle errors during cleanup', async () => {
      vehicleServiceRepository.find.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.cleanOrphanHashes()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('registerAllExistingHashes', () => {
    it('should register all existing hashes and store transactionHash', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          type: 'MANUTENCAO',
          blockchainHash: 'hash-1',
        },
        {
          id: 'service-2',
          vehicleId: 'vehicle-2',
          type: 'MANUTENCAO',
          blockchainHash: 'hash-2',
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      besuService.verifyHashInContract
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      besuService.registerHash.mockResolvedValue({
        success: true,
        transactionHash: 'tx-hash-123',
      });
      vehicleServiceRepository.update.mockResolvedValue(undefined);

      const result = await service.registerAllExistingHashes();

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      
      expect(vehicleServiceRepository.update).toHaveBeenCalledWith(
        { id: 'service-1' },
        { transactionHash: 'tx-hash-123' }
      );
      
      expect(besuService.registerHash).toHaveBeenCalledTimes(1);
    });
    it('should register all existing hashes successfully', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          type: 'MANUTENCAO',
          blockchainHash: 'hash-1',
        },
        {
          id: 'service-2',
          vehicleId: 'vehicle-2',
          type: 'REPAIR',
          blockchainHash: 'hash-2',
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      besuService.verifyHashInContract
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      besuService.registerHash.mockResolvedValue({
        success: true,
        transactionHash: 'tx-hash-123',
      });

      const result = await service.registerAllExistingHashes();

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(besuService.registerHash).toHaveBeenCalledTimes(1);
    });

    it('should skip hashes that already exist', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          type: 'MANUTENCAO',
          blockchainHash: 'hash-1',
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      besuService.verifyHashInContract.mockResolvedValue(true);

      const result = await service.registerAllExistingHashes();

      expect(result.success).toBe(true);
      expect(besuService.registerHash).not.toHaveBeenCalled();
    });

    it('should handle errors during registration', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          type: 'MANUTENCAO',
          blockchainHash: 'hash-1',
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      besuService.verifyHashInContract.mockResolvedValue(false);
      besuService.registerHash.mockRejectedValue(
        new Error('Registration error'),
      );

      const result = await service.registerAllExistingHashes();

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(1);
    });

    it('should throw error when repository fails', async () => {
      vehicleServiceRepository.find.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.registerAllExistingHashes()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('fixFailingHashes', () => {
    it('should fix failing hashes successfully and store transactionHash', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          type: 'MANUTENCAO',
          blockchainHash: 'hash-1',
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      besuService.verifyHashInContract.mockResolvedValue(false);
      besuService.registerHash.mockResolvedValue({
        success: true,
        transactionHash: 'tx-hash-123',
      });
      vehicleServiceRepository.update.mockResolvedValue(undefined);

      const result = await service.fixFailingHashes();

      expect(result.success).toBe(true);
      expect(result.fixedCount).toBe(1);
      expect(result.successCount).toBe(1);
      
      expect(vehicleServiceRepository.update).toHaveBeenCalledWith(
        { id: 'service-1' },
        expect.objectContaining({
          transactionHash: 'tx-hash-123',
        })
      );
    });

    it('should skip hashes that already exist', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          type: 'MANUTENCAO',
          blockchainHash: 'hash-1',
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      besuService.verifyHashInContract.mockResolvedValue(true);

      const result = await service.fixFailingHashes();

      expect(result.success).toBe(true);
      expect(result.fixedCount).toBe(0);
      expect(besuService.registerHash).not.toHaveBeenCalled();
    });

    it('should handle errors during fixing', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          type: 'MANUTENCAO',
          blockchainHash: 'hash-1',
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      besuService.verifyHashInContract.mockRejectedValue(
        new Error('Verification error'),
      );

      const result = await service.fixFailingHashes();

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(1);
    });

    it('should throw error when repository fails', async () => {
      vehicleServiceRepository.find.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.fixFailingHashes()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('fixIncorrectDates', () => {
    it('should fix incorrect dates successfully', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 2);

      const mockServices = [
        {
          id: 'service-1',
          serviceDate: oneYearAgo,
          createdAt: new Date(),
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      vehicleServiceRepository.update.mockResolvedValue(undefined);

      const result = await service.fixIncorrectDates();

      expect(result.success).toBe(true);
      expect(result.correctedCount).toBe(1);
      expect(vehicleServiceRepository.update).toHaveBeenCalled();
    });

    it('should fix future creation dates', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const mockServices = [
        {
          id: 'service-1',
          serviceDate: new Date(),
          createdAt: futureDate,
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      vehicleServiceRepository.update.mockResolvedValue(undefined);

      const result = await service.fixIncorrectDates();

      expect(result.success).toBe(true);
      expect(result.correctedCount).toBe(1);
    });

    it('should not fix correct dates', async () => {
      const mockServices = [
        {
          id: 'service-1',
          serviceDate: new Date(),
          createdAt: new Date(),
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);

      const result = await service.fixIncorrectDates();

      expect(result.success).toBe(true);
      expect(result.correctedCount).toBe(0);
      expect(vehicleServiceRepository.update).not.toHaveBeenCalled();
    });

    it('should handle errors during date fixing', async () => {
      vehicleServiceRepository.find.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.fixIncorrectDates()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('getAllServices', () => {
    it('should return services with transactionHash when available', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          type: 'MANUTENCAO',
          category: 'Oleo',
          description: 'Troca de oleo',
          serviceDate: new Date('2024-01-15'),
          createdAt: new Date('2024-01-15'),
          mileage: 50000,
          cost: 150,
          location: 'Oficina',
          status: ServiceStatus.CONFIRMED,
          blockchainHash: '0xcontenthash123',
          transactionHash: '0xtransactionhash456',
          blockchainConfirmedAt: new Date('2024-01-15T10:00:00Z'),
          vehicle: {
            brand: 'Toyota',
            model: 'Corolla',
            plate: 'ABC1234',
            year: 2020,
          },
        },
        {
          id: 'service-2',
          vehicleId: 'vehicle-2',
          type: 'MANUTENCAO',
          category: 'Filtro',
          description: 'Troca de filtro',
          serviceDate: new Date('2024-01-16'),
          createdAt: new Date('2024-01-16'),
          mileage: 51000,
          cost: 80,
          location: 'Oficina',
          status: ServiceStatus.CONFIRMED,
          blockchainHash: '0xcontenthash789',
          transactionHash: null,
          blockchainConfirmedAt: new Date('2024-01-16T10:00:00Z'),
          vehicle: {
            brand: 'Honda',
            model: 'Civic',
            plate: 'XYZ5678',
            year: 2021,
          },
        },
      ];

      besuService.isConnected.mockResolvedValue(true);
      mockQueryBuilder.getMany.mockResolvedValue(mockServices as any);
      besuService.getContractStats.mockResolvedValue({
        totalHashes: 2,
        contractBalance: '1000',
      });
      besuService.verifyHashInContract
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      besuService.isTransactionConfirmed.mockResolvedValue(false);
      vehicleServiceRepository.update.mockResolvedValue(undefined);
      
    
      jest.spyOn(service as any, 'verifyServicesInBlockchain').mockResolvedValue(
        mockServices.map((s) => ({
          ...s,
          blockchainVerified: true,
        })) as any
      );

      const result = await service.getAllServices();

      expect(result).toHaveLength(2);
      expect(result[0].transactionHash).toBe('0xtransactionhash456');
      expect(result[1].transactionHash).toBe('0xcontenthash789');
    });
    it('should get all services when connected', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          blockchainHash: 'hash-1',
          blockchainConfirmedAt: new Date(),
          status: ServiceStatus.CONFIRMED,
          vehicle: {
            brand: 'Toyota',
            model: 'Corolla',
            plate: 'ABC-1234',
            year: 2020,
          },
        },
      ];

      besuService.isConnected.mockResolvedValue(true);
      mockQueryBuilder.getMany.mockResolvedValue(mockServices as any);
      besuService.getContractStats.mockResolvedValue({
        totalHashes: 1,
        contractBalance: '1000',
      });
      besuService.verifyHashInContract.mockResolvedValue(true);

      const result = await service.getAllServices();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('CONFIRMED');
    });

    it('should filter by userId when provided', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          blockchainHash: 'hash-1',
          status: ServiceStatus.PENDING,
          vehicle: {
            userId: 'user-123',
            brand: 'Toyota',
            model: 'Corolla',
            plate: 'ABC-1234',
            year: 2020,
          },
        },
      ];

      besuService.isConnected.mockResolvedValue(true);
      mockQueryBuilder.getMany.mockResolvedValue(mockServices as any);
      besuService.getContractStats.mockResolvedValue({
        totalHashes: 1,
        contractBalance: '1000',
      });
      besuService.verifyHashInContract.mockResolvedValue(false);

      await service.getAllServices('user-123');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'vehicle.userId = :userId',
        { userId: 'user-123' },
      );
    });

    it('should return empty array when not connected', async () => {
      besuService.isConnected.mockResolvedValue(false);

      const result = await service.getAllServices();

      expect(result).toEqual([]);
    });

    it('should handle services without hash', async () => {
      const mockServices = [
        {
          id: 'service-1',
          vehicleId: 'vehicle-1',
          blockchainHash: null,
          status: ServiceStatus.PENDING,
        },
      ];

      besuService.isConnected.mockResolvedValue(true);
      mockQueryBuilder.getMany.mockResolvedValue(mockServices as any);
      besuService.getContractStats.mockResolvedValue({
        totalHashes: 0,
        contractBalance: '0',
      });

      const result = await service.getAllServices();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PENDING');
    });

    it('should handle errors gracefully', async () => {
      besuService.isConnected.mockResolvedValue(true);
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      const result = await service.getAllServices();

      expect(result).toEqual([]);
    });
  });

  describe('resendFailedService', () => {
    it('should handle service already in blockchain', async () => {
      const mockService = {
        id: 'service-123',
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO',
        description: 'Oil change',
        serviceDate: new Date(),
        status: ServiceStatus.CONFIRMED,
        blockchainHash: 'hash-123',
      };

      vehicleServiceRepository.findOne.mockResolvedValue(mockService as any);
      besuService.isConnected.mockResolvedValue(true);
      besuService.verifyHashInContract.mockResolvedValue(true);

      const result = await service.resendFailedService('service-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('já está registrado');
    });

    it('should handle timeout during verification', async () => {
      const mockService = {
        id: 'service-123',
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO',
        description: 'Oil change',
        serviceDate: new Date(),
        status: ServiceStatus.REJECTED,
        blockchainHash: null,
      };

      vehicleServiceRepository.findOne.mockResolvedValue(mockService as any);
      besuService.isConnected.mockResolvedValue(true);

      // When service can be resent directly (REJECTED status), it skips verification
      besuService.registerHash.mockResolvedValue({
        success: true,
        transactionHash: 'tx-hash-123',
      });
      vehicleServiceRepository.save.mockResolvedValue(mockService as any);
      vehicleServiceRepository.update.mockResolvedValue(undefined);

      const result = await service.resendFailedService('service-123');
      expect(result.success).toBe(true);
    });

    it('should handle registration failure', async () => {
      const mockService = {
        id: 'service-123',
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO',
        description: 'Oil change',
        serviceDate: new Date(),
        status: ServiceStatus.REJECTED,
        blockchainHash: null,
      };

      vehicleServiceRepository.findOne.mockResolvedValue(mockService as any);
      besuService.isConnected.mockResolvedValue(true);
      besuService.registerHash.mockResolvedValue({
        success: false,
        error: 'Registration failed',
      });
      vehicleServiceRepository.save.mockResolvedValue(mockService as any);

      const result = await service.resendFailedService('service-123');

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
    });

    it('should handle service with pending-hash', async () => {
      const mockService = {
        id: 'service-123',
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO',
        description: 'Oil change',
        serviceDate: new Date(),
        status: ServiceStatus.PENDING,
        blockchainHash: 'pending-hash',
      };

      vehicleServiceRepository.findOne.mockResolvedValue(mockService as any);
      besuService.isConnected.mockResolvedValue(true);
      besuService.registerHash.mockResolvedValue({
        success: true,
        transactionHash: 'tx-hash-123',
      });
      vehicleServiceRepository.save.mockResolvedValue(mockService as any);
      vehicleServiceRepository.update.mockResolvedValue(undefined);

      const result = await service.resendFailedService('service-123');

      expect(result.success).toBe(true);
      expect(result.status).toBe('CONFIRMED');
    });
  });

  describe('registerHashInContract', () => {
    it('should register hash successfully', async () => {
      besuService.isConnected.mockResolvedValue(true);
      besuService.registerHash.mockResolvedValue({
        success: true,
        transactionHash: 'tx-hash-123',
      });

      const result = await service.registerHashInContract(
        'hash-123',
        'vehicle-123',
        'SERVICE',
      );

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBe('tx-hash-123');
    });

    it('should return failure when not connected', async () => {
      besuService.isConnected.mockResolvedValue(false);

      const result = await service.registerHashInContract(
        'hash-123',
        'vehicle-123',
        'SERVICE',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('não disponível');
    });

    it('should handle timeout during registration', async () => {
      besuService.isConnected.mockResolvedValue(true);

      // Mock Promise.race to reject with timeout
      const originalPromiseRace = Promise.race;
      Promise.race = jest
        .fn()
        .mockRejectedValue(new Error('Timeout no registro (25s)'));

      try {
        const result = await service.registerHashInContract(
          'hash-123',
          'vehicle-123',
          'SERVICE',
        );
        expect(result.success).toBe(false);
        expect(result.error).toContain('Timeout');
      } finally {
        Promise.race = originalPromiseRace;
      }
    });

    it('should handle registration errors', async () => {
      besuService.isConnected.mockResolvedValue(true);
      besuService.registerHash.mockRejectedValue(new Error('Network error'));

      const result = await service.registerHashInContract(
        'hash-123',
        'vehicle-123',
        'SERVICE',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Falha na rede Besu');
    });

    it('should handle general errors', async () => {
      besuService.isConnected.mockRejectedValue(new Error('Connection error'));

      const result = await service.registerHashInContract(
        'hash-123',
        'vehicle-123',
        'SERVICE',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection error');
    });
  });

  describe('getNetworkHealth', () => {
    it('should handle network info errors', async () => {
      besuService.isConnected.mockResolvedValue(true);
      besuService.getNetworkInfo.mockRejectedValue(new Error('Network error'));

      const result = await service.getNetworkHealth();

      expect(result.status).toBe('UNHEALTHY');
    });

    it('should handle general errors', async () => {
      besuService.isConnected.mockRejectedValue(new Error('Connection error'));

      const result = await service.getNetworkHealth();

      expect(result.status).toBe('UNHEALTHY');
      expect(result.network).toBe('Erro de conexão');
    });
  });

  describe('submitServiceToBlockchain', () => {
    it('should handle general errors', async () => {
      const serviceData = {
        serviceId: 'service-123',
        vehicleId: 'vehicle-123',
        mileage: 50000,
        cost: 1000,
        description: 'Oil change',
      };

      besuService.isConnected.mockRejectedValue(new Error('Connection error'));

      const result = await service.submitServiceToBlockchain(serviceData);

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
    });
  });

  describe('confirmService', () => {
    it('should handle errors', async () => {
      besuService.isConnected.mockRejectedValue(new Error('Connection error'));

      const result = await service.confirmService('service-123');

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
    });
  });

  describe('getServiceStatus', () => {
    it('should handle errors', async () => {
      besuService.isConnected.mockRejectedValue(new Error('Connection error'));

      const result = await service.getServiceStatus('service-123');

      expect(result.status).toBe('FAILED');
    });
  });

  describe('calculateServiceHash', () => {
    it('should calculate hash correctly for a service', () => {
      const mockService = {
        id: 'service-123',
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO',
        category: 'Oleo',
        description: 'Troca de oleo',
        serviceDate: new Date('2024-01-15'),
        mileage: 50000,
        cost: 150,
        location: 'Oficina',
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      const hash = (service as any).calculateServiceHash(mockService);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should produce same hash for same service data', () => {
      const mockService = {
        id: 'service-123',
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO',
        category: 'Oleo',
        description: 'Troca de oleo',
        serviceDate: new Date('2024-01-15'),
        mileage: 50000,
        cost: 150,
        location: 'Oficina',
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      const hash1 = (service as any).calculateServiceHash(mockService);
      const hash2 = (service as any).calculateServiceHash(mockService);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different service data', () => {
      const mockService1 = {
        id: 'service-123',
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO',
        category: 'Oleo',
        description: 'Troca de oleo',
        serviceDate: new Date('2024-01-15'),
        mileage: 50000,
        cost: 150,
        location: 'Oficina',
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      const mockService2 = {
        id: 'service-456',
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO',
        category: 'Filtro',
        description: 'Troca de filtro',
        serviceDate: new Date('2024-01-16'),
        mileage: 51000,
        cost: 150,
        location: 'Oficina',
        createdAt: new Date('2024-01-16T10:00:00Z'),
      };

      const hash1 = (service as any).calculateServiceHash(mockService1);
      const hash2 = (service as any).calculateServiceHash(mockService2);

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyServiceIntegrity', () => {
    it('should return NOT_VERIFIED when service not confirmed in blockchain', async () => {
      const mockService = {
        id: 'service-123',
        blockchainHash: null,
        blockchainConfirmedAt: null,
      };

      vehicleServiceRepository.findOne.mockResolvedValue(mockService as any);

      const result = await service.verifyServiceIntegrity('service-123');

      expect(result.integrityStatus).toBe(IntegrityStatus.NOT_VERIFIED);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('não foi confirmado');
    });

    it('should return VALID when hash matches and exists in blockchain', async () => {
      const mockService = {
        id: 'service-123',
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO',
        category: 'Oleo',
        description: 'Troca de oleo',
        serviceDate: new Date('2024-01-15'),
        mileage: 50000,
        cost: 150,
        location: 'Oficina',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        blockchainHash: '0xhash123',
        blockchainConfirmedAt: new Date('2024-01-15T10:00:00Z'),
      };

      vehicleServiceRepository.findOne.mockResolvedValue(mockService as any);
      besuService.verifyHashInContract.mockResolvedValue(true);
      vehicleServiceRepository.save.mockResolvedValue(mockService as any);

      jest.spyOn(service as any, 'calculateServiceHash').mockReturnValue('0xhash123');

      const result = await service.verifyServiceIntegrity('service-123');

      expect(result.integrityStatus).toBe(IntegrityStatus.VALID);
      expect(result.isValid).toBe(true);
      expect(result.hashMatches).toBe(true);
      expect(result.existsInBlockchain).toBe(true);
      expect(vehicleServiceRepository.save).toHaveBeenCalled();
    });

    it('should return VIOLATED when hash does not match', async () => {
      const mockService = {
        id: 'service-123',
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO',
        category: 'Oleo',
        description: 'Troca de oleo',
        serviceDate: new Date('2024-01-15'),
        mileage: 50000,
        cost: 150,
        location: 'Oficina',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        blockchainHash: '0xhash123',
        blockchainConfirmedAt: new Date('2024-01-15T10:00:00Z'),
      };

      vehicleServiceRepository.findOne.mockResolvedValue(mockService as any);
      besuService.verifyHashInContract.mockResolvedValue(true);
      vehicleServiceRepository.save.mockResolvedValue(mockService as any);

      jest.spyOn(service as any, 'calculateServiceHash').mockReturnValue('0xdifferenthash');

      const result = await service.verifyServiceIntegrity('service-123');

      expect(result.integrityStatus).toBe(IntegrityStatus.VIOLATED);
      expect(result.isValid).toBe(false);
      expect(result.hashMatches).toBe(false);
      expect(result.message).toContain('INTEGRIDADE VIOLADA');
    });

    it('should return UNKNOWN when hash not found in blockchain', async () => {
      const mockService = {
        id: 'service-123',
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO',
        category: 'Oleo',
        description: 'Troca de oleo',
        serviceDate: new Date('2024-01-15'),
        mileage: 50000,
        cost: 150,
        location: 'Oficina',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        blockchainHash: '0xhash123',
        blockchainConfirmedAt: new Date('2024-01-15T10:00:00Z'),
      };

      vehicleServiceRepository.findOne.mockResolvedValue(mockService as any);
      besuService.verifyHashInContract.mockResolvedValue(false);
      vehicleServiceRepository.save.mockResolvedValue(mockService as any);

      jest.spyOn(service as any, 'calculateServiceHash').mockReturnValue('0xhash123');

      const result = await service.verifyServiceIntegrity('service-123');

      expect(result.integrityStatus).toBe(IntegrityStatus.UNKNOWN);
      expect(result.isValid).toBe(false);
      expect(result.existsInBlockchain).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      vehicleServiceRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.verifyServiceIntegrity('service-123')).rejects.toThrow();
    });
  });

  describe('verifyAllServicesIntegrity', () => {
    it('should verify all confirmed services', async () => {
      const mockServices = [
        {
          id: 'service-1',
          blockchainHash: '0xhash1',
          blockchainConfirmedAt: new Date(),
        },
        {
          id: 'service-2',
          blockchainHash: '0xhash2',
          blockchainConfirmedAt: new Date(),
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);

      jest.spyOn(service, 'verifyServiceIntegrity')
        .mockResolvedValueOnce({
          isValid: true,
          integrityStatus: IntegrityStatus.VALID,
          currentHash: '0xhash1',
          blockchainHash: '0xhash1',
          hashMatches: true,
          existsInBlockchain: true,
          message: 'Valid',
        })
        .mockResolvedValueOnce({
          isValid: true,
          integrityStatus: IntegrityStatus.VALID,
          currentHash: '0xhash2',
          blockchainHash: '0xhash2',
          hashMatches: true,
          existsInBlockchain: true,
          message: 'Valid',
        });

      const result = await service.verifyAllServicesIntegrity();

      expect(result.total).toBe(2);
      expect(result.valid).toBe(2);
      expect(result.violated).toBe(0);
      expect(result.unknown).toBe(0);
      expect(result.notVerified).toBe(0);
    });

    it('should handle services with different integrity statuses', async () => {
      const mockServices = [
        {
          id: 'service-1',
          blockchainHash: '0xhash1',
          blockchainConfirmedAt: new Date(),
        },
        {
          id: 'service-2',
          blockchainHash: '0xhash2',
          blockchainConfirmedAt: new Date(),
        },
        {
          id: 'service-3',
          blockchainHash: '0xhash3',
          blockchainConfirmedAt: new Date(),
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);

      jest.spyOn(service, 'verifyServiceIntegrity')
        .mockResolvedValueOnce({
          isValid: true,
          integrityStatus: IntegrityStatus.VALID,
          currentHash: '0xhash1',
          blockchainHash: '0xhash1',
          hashMatches: true,
          existsInBlockchain: true,
          message: 'Valid',
        })
        .mockResolvedValueOnce({
          isValid: false,
          integrityStatus: IntegrityStatus.VIOLATED,
          currentHash: '0xdifferent',
          blockchainHash: '0xhash2',
          hashMatches: false,
          existsInBlockchain: true,
          message: 'Violated',
        })
        .mockResolvedValueOnce({
          isValid: false,
          integrityStatus: IntegrityStatus.UNKNOWN,
          currentHash: '0xhash3',
          blockchainHash: '0xhash3',
          hashMatches: true,
          existsInBlockchain: false,
          message: 'Unknown',
        });

      const result = await service.verifyAllServicesIntegrity();

      expect(result.total).toBe(3);
      expect(result.valid).toBe(1);
      expect(result.violated).toBe(1);
      expect(result.unknown).toBe(1);
      expect(result.notVerified).toBe(0);
    });

    it('should handle empty services list', async () => {
      vehicleServiceRepository.find.mockResolvedValue([]);

      const result = await service.verifyAllServicesIntegrity();

      expect(result.total).toBe(0);
      expect(result.valid).toBe(0);
      expect(result.violated).toBe(0);
      expect(result.unknown).toBe(0);
      expect(result.notVerified).toBe(0);
    });

    it('should handle errors during verification', async () => {
      const mockServices = [
        {
          id: 'service-1',
          blockchainHash: '0xhash1',
          blockchainConfirmedAt: new Date(),
        },
      ];

      vehicleServiceRepository.find.mockResolvedValue(mockServices as any);
      jest.spyOn(service, 'verifyServiceIntegrity').mockRejectedValue(new Error('Verification error'));

      const result = await service.verifyAllServicesIntegrity();

      expect(result.total).toBe(1);
      expect(result.notVerified).toBe(1);
    });
  });
});
