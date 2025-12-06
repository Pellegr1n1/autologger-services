import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { BesuService } from './besu/besu.service';
import { LoggerService } from '@/common/logger/logger.service';
import { LoggerServiceTestHelper } from '@/common/test-helpers/logger-service.test-helper';

describe('BlockchainController', () => {
  let controller: BlockchainController;
  let blockchainService: jest.Mocked<BlockchainService>;
  let besuService: jest.Mocked<BesuService>;

  beforeEach(async () => {
    const mockBlockchainService = {
      submitServiceToBlockchain: jest.fn(),
      confirmService: jest.fn(),
      getServiceStatus: jest.fn(),
      getAllServices: jest.fn(),
      forceVerifyAllServices: jest.fn(),
      registerAllExistingHashes: jest.fn(),
      fixInvalidHashes: jest.fn(),
      cleanOrphanHashes: jest.fn(),
      fixFailingHashes: jest.fn(),
      fixIncorrectDates: jest.fn(),
      getNetworkHealth: jest.fn(),
      resendFailedService: jest.fn(),
      resetRetryCount: jest.fn(),
      resetAllFailedRetries: jest.fn(),
      registerHashInContract: jest.fn(),
      verifyServiceIntegrity: jest.fn(),
      verifyAllServicesIntegrity: jest.fn(),
    };

    const mockBesuService = {
      registerHash: jest.fn(),
      verifyHash: jest.fn(),
      verifyAndCount: jest.fn(),
      getVehicleHashes: jest.fn(),
      getOwnerHashes: jest.fn(),
      getContractStats: jest.fn(),
      getNetworkInfo: jest.fn(),
      isConnected: jest.fn(),
      diagnoseNetwork: jest.fn(),
    };

    const mockLoggerService = LoggerServiceTestHelper.createMockLoggerService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockchainController],
      providers: [
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
        {
          provide: BesuService,
          useValue: mockBesuService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    controller = module.get<BlockchainController>(BlockchainController);
    blockchainService = module.get(BlockchainService);
    besuService = module.get(BesuService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('submitService', () => {
    it('should submit service to blockchain', async () => {
      const serviceData = {
        serviceId: 'service-123',
        vehicleId: 'vehicle-123',
        mileage: 50000,
        cost: 1000,
        description: 'Oil change',
      };

      const result = {
        success: true,
        transactionHash: 'tx-hash-123',
        status: 'SUBMITTED',
      };

      blockchainService.submitServiceToBlockchain.mockResolvedValue(
        result as any,
      );

      const response = await controller.submitService(serviceData);

      expect(blockchainService.submitServiceToBlockchain).toHaveBeenCalledWith(
        serviceData,
      );
      expect(response).toEqual(result);
    });
  });

  describe('resetRetryCount', () => {
    it('should reset retry count for a service', async () => {
      const result = { success: true };
      blockchainService.resetRetryCount.mockResolvedValue(result as any);

      const response = await controller.resetRetryCount('service-123');

      expect(blockchainService.resetRetryCount).toHaveBeenCalledWith(
        'service-123',
      );
      expect(response).toEqual(result);
    });
  });

  describe('resetAllRetries', () => {
    it('should reset all failed retries', async () => {
      const result = { success: true, resetCount: 5 };
      blockchainService.resetAllFailedRetries.mockResolvedValue(result as any);

      const response = await controller.resetAllRetries();

      expect(blockchainService.resetAllFailedRetries).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('forceVerifyAllServices', () => {
    it('should force verify all services', async () => {
      const result = { success: true, verified: 10 };
      blockchainService.forceVerifyAllServices.mockResolvedValue(result as any);

      const response = await controller.forceVerifyAllServices();

      expect(blockchainService.forceVerifyAllServices).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('registerAllExistingHashes', () => {
    it('should register all existing hashes', async () => {
      const result = { success: true, registered: 5 };
      blockchainService.registerAllExistingHashes.mockResolvedValue(
        result as any,
      );

      const response = await controller.registerAllExistingHashes();

      expect(blockchainService.registerAllExistingHashes).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('fixInvalidHashes', () => {
    it('should fix invalid hashes', async () => {
      const result = { success: true, fixed: 3 };
      blockchainService.fixInvalidHashes.mockResolvedValue(result as any);

      const response = await controller.fixInvalidHashes();

      expect(blockchainService.fixInvalidHashes).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('cleanOrphanHashes', () => {
    it('should clean orphan hashes', async () => {
      const result = { success: true, cleaned: 2 };
      blockchainService.cleanOrphanHashes.mockResolvedValue(result as any);

      const response = await controller.cleanOrphanHashes();

      expect(blockchainService.cleanOrphanHashes).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('fixFailingHashes', () => {
    it('should fix failing hashes', async () => {
      const result = { success: true, fixed: 4 };
      blockchainService.fixFailingHashes.mockResolvedValue(result as any);

      const response = await controller.fixFailingHashes();

      expect(blockchainService.fixFailingHashes).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('fixIncorrectDates', () => {
    it('should fix incorrect dates', async () => {
      const result = { success: true, fixed: 1 };
      blockchainService.fixIncorrectDates.mockResolvedValue(result as any);

      const response = await controller.fixIncorrectDates({} as any);

      expect(blockchainService.fixIncorrectDates).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('verifyAndCount', () => {
    it('should verify hash and count', async () => {
      const result = { exists: true, count: 1 };
      besuService.verifyAndCount.mockResolvedValue(result as any);

      const response = await controller.verifyAndCount('hash-123');

      expect(besuService.verifyAndCount).toHaveBeenCalledWith('hash-123');
      expect(response).toEqual(result);
    });
  });

  describe('getVehicleHashes', () => {
    it('should get vehicle hashes', async () => {
      const result = { hashes: ['hash1', 'hash2'] };
      besuService.getVehicleHashes.mockResolvedValue(result as any);

      const response = await controller.getVehicleHashes('vehicle-123');

      expect(besuService.getVehicleHashes).toHaveBeenCalledWith('vehicle-123');
      expect(response).toEqual(result);
    });
  });

  describe('getOwnerHashes', () => {
    it('should get owner hashes', async () => {
      const result = { hashes: ['hash1'] };
      besuService.getOwnerHashes.mockResolvedValue(result as any);

      const response = await controller.getOwnerHashes('0x123');

      expect(besuService.getOwnerHashes).toHaveBeenCalledWith('0x123');
      expect(response).toEqual(result);
    });
  });

  describe('getNetworkInfo', () => {
    it('should get network info', async () => {
      const result = { chainId: '1337', blockNumber: 100 };
      besuService.getNetworkInfo.mockResolvedValue(result as any);

      const response = await controller.getNetworkInfo();

      expect(besuService.getNetworkInfo).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('diagnoseNetwork', () => {
    it('should diagnose network', async () => {
      const result = { connected: true, blockNumber: 100 };
      besuService.diagnoseNetwork.mockResolvedValue(result as any);

      const response = await controller.diagnoseNetwork();

      expect(besuService.diagnoseNetwork).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('confirmService', () => {
    it('should confirm service', async () => {
      const result = {
        success: true,
        status: 'CONFIRMED',
      };

      blockchainService.confirmService.mockResolvedValue(result as any);

      const response = await controller.confirmService('service-123');

      expect(blockchainService.confirmService).toHaveBeenCalledWith(
        'service-123',
      );
      expect(response).toEqual(result);
    });
  });

  describe('getServiceStatus', () => {
    it('should get service status', async () => {
      const result = {
        hash: 'service-123',
        status: 'CONFIRMED',
      };

      blockchainService.getServiceStatus.mockResolvedValue(result as any);

      const response = await controller.getServiceStatus('service-123');

      expect(blockchainService.getServiceStatus).toHaveBeenCalledWith(
        'service-123',
      );
      expect(response).toEqual(result);
    });
  });

  describe('getAllServices', () => {
    it('should get all services', async () => {
      const services = [
        {
          id: 'service-123',
          vehicleId: 'vehicle-123',
          status: 'CONFIRMED',
        },
      ];

      blockchainService.getAllServices.mockResolvedValue(services as any);

      const request = { user: { id: 'user-123' } };
      const response = await controller.getAllServices(request);

      expect(blockchainService.getAllServices).toHaveBeenCalledWith('user-123');
      expect(response).toEqual(services);
    });
  });

  describe('resendFailedService', () => {
    it('should resend failed service', async () => {
      const result = {
        success: true,
        status: 'CONFIRMED',
      };

      blockchainService.resendFailedService.mockResolvedValue(result as any);

      const response = await controller.resendFailedService('service-123');

      expect(blockchainService.resendFailedService).toHaveBeenCalledWith(
        'service-123',
      );
      expect(response).toEqual(result);
    });
  });

  describe('getNetworkHealth', () => {
    it('should get network health', async () => {
      const result = {
        status: 'HEALTHY',
        blockNumber: 100,
      };

      blockchainService.getNetworkHealth.mockResolvedValue(result as any);

      const response = await controller.getNetworkHealth();

      expect(blockchainService.getNetworkHealth).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('registerHash', () => {
    it('should register hash', async () => {
      const data = {
        hash: 'hash-123',
        vehicleId: 'vehicle-123',
        eventType: 'MANUTENCAO',
      };

      const result = {
        success: true,
        transactionHash: 'tx-hash-123',
      };

      besuService.registerHash.mockResolvedValue(result as any);

      const response = await controller.registerHash(data);

      expect(besuService.registerHash).toHaveBeenCalledWith(
        data.hash,
        data.vehicleId,
        data.eventType,
      );
      expect(response).toEqual(result);
    });
  });

  describe('verifyHash', () => {
    it('should verify hash', async () => {
      const result = {
        exists: true,
      };

      besuService.verifyHash.mockResolvedValue(result as any);

      const response = await controller.verifyHash('hash-123');

      expect(besuService.verifyHash).toHaveBeenCalledWith('hash-123');
      expect(response).toEqual(result);
    });
  });

  describe('getContractStats', () => {
    it('should get contract stats', async () => {
      const result = {
        totalHashes: 10,
        totalServices: 5,
      };

      besuService.getContractStats.mockResolvedValue(result as any);

      const response = await controller.getContractStats();

      expect(besuService.getContractStats).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('getConnectionStatus', () => {
    it('should get connection status', async () => {
      besuService.isConnected.mockResolvedValue(true);

      const response = await controller.getConnectionStatus();

      expect(besuService.isConnected).toHaveBeenCalled();
      expect(response).toEqual({ connected: true });
    });
  });

  describe('verifyServiceIntegrity', () => {
    it('should verify service integrity', async () => {
      const result = {
        isValid: true,
        integrityStatus: 'valid',
        currentHash: '0xhash123',
        blockchainHash: '0xhash123',
        hashMatches: true,
        existsInBlockchain: true,
        message: 'Valid',
      };

      blockchainService.verifyServiceIntegrity.mockResolvedValue(result as any);

      const response = await controller.verifyServiceIntegrity('service-123');

      expect(blockchainService.verifyServiceIntegrity).toHaveBeenCalledWith('service-123');
      expect(response).toEqual(result);
    });

    it('should handle errors', async () => {
      blockchainService.verifyServiceIntegrity.mockRejectedValue(new Error('Service not found'));

      await expect(controller.verifyServiceIntegrity('service-123')).rejects.toThrow('Service not found');
    });
  });

  describe('verifyAllServicesIntegrity', () => {
    it('should verify all services integrity', async () => {
      const result = {
        total: 5,
        valid: 3,
        violated: 1,
        unknown: 1,
        notVerified: 0,
        results: [],
      };

      blockchainService.verifyAllServicesIntegrity.mockResolvedValue(result as any);

      const response = await controller.verifyAllServicesIntegrity();

      expect(blockchainService.verifyAllServicesIntegrity).toHaveBeenCalled();
      expect(response).toEqual(result);
    });

    it('should handle errors', async () => {
      blockchainService.verifyAllServicesIntegrity.mockRejectedValue(new Error('Database error'));

      await expect(controller.verifyAllServicesIntegrity()).rejects.toThrow('Database error');
    });
  });
});
