import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { BesuService } from './besu/besu.service';

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

      expect(blockchainService.getAllServices).toHaveBeenCalledWith(
        'user-123',
      );
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
});

