import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BesuService } from './besu.service';

describe('BesuService', () => {
  let service: BesuService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          BESU_RPC_URL: 'http://localhost:8545',
          BESU_PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          BESU_CONTRACT_ADDRESS: '0xContractAddress',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BesuService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BesuService>(BesuService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerService', () => {
    it('should register service successfully', async () => {
      const serviceData = {
        vehicleId: 'vehicle-123',
        mileage: 50000,
        cost: 1000,
        description: 'Oil change',
        serviceType: 'MAINTENANCE',
      };

      // Mock contract
      (service as any).contract = {
        registerService: jest.fn().mockResolvedValue({
          hash: '0x1234567890abcdef',
          wait: jest.fn().mockResolvedValue({
            blockNumber: 1,
            logs: [],
          }),
        }),
        interface: {
          parseLog: jest.fn().mockReturnValue({
            name: 'ServiceRegistered',
            args: { serviceId: BigInt(1) },
          }),
        },
      };

      const result = await service.registerService(serviceData);

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBeDefined();
    });

    it('should return error when contract is not initialized', async () => {
      (service as any).contract = null;

      const serviceData = {
        vehicleId: 'vehicle-123',
        mileage: 50000,
        cost: 1000,
        description: 'Oil change',
        serviceType: 'MAINTENANCE',
      };

      const result = await service.registerService(serviceData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contrato não inicializado');
    });

    it('should handle timeout when waiting for transaction', async () => {
      const serviceData = {
        vehicleId: 'vehicle-123',
        mileage: 50000,
        cost: 1000,
        description: 'Oil change',
        serviceType: 'MAINTENANCE',
      };

      // Mock wait to never resolve (simulating timeout)
      const mockWait = jest.fn().mockImplementation(() => {
        return new Promise(() => {
          // Never resolves to simulate timeout
        });
      });

      (service as any).contract = {
        registerService: jest.fn().mockResolvedValue({
          hash: '0x1234567890abcdef',
          wait: mockWait,
        }),
        interface: {
          parseLog: jest.fn(),
        },
      };

      // Mock Promise.race to immediately reject with timeout
      const originalPromiseRace = Promise.race;
      Promise.race = jest.fn().mockRejectedValue(new Error('Timeout aguardando mineração (20s)'));

      try {
        const result = await service.registerService(serviceData);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Timeout');
      } finally {
        Promise.race = originalPromiseRace;
      }
    });

    it('should extract serviceId from event', async () => {
      const serviceData = {
        vehicleId: 'vehicle-123',
        mileage: 50000,
        cost: 1000,
        description: 'Oil change',
        serviceType: 'MAINTENANCE',
      };

      const mockLog = {
        topics: [],
        data: '0x',
      };

      (service as any).contract = {
        registerService: jest.fn().mockResolvedValue({
          hash: '0x1234567890abcdef',
          wait: jest.fn().mockResolvedValue({
            blockNumber: 1,
            logs: [mockLog],
          }),
        }),
        interface: {
          parseLog: jest.fn().mockReturnValue({
            name: 'ServiceRegistered',
            args: { serviceId: BigInt(1) },
          }),
        },
      };

      const result = await service.registerService(serviceData);

      expect(result.success).toBe(true);
      expect(result.serviceId).toBe(1);
    });
  });

  describe('registerHash', () => {
    it('should register hash successfully', async () => {
      (service as any).contract = {
        registerHash: jest.fn().mockResolvedValue({
          hash: '0x1234567890abcdef',
          wait: jest.fn().mockResolvedValue({
            blockNumber: 1,
          }),
        }),
      };

      const result = await service.registerHash('hash-123', 'vehicle-123', 'SERVICE');

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBeDefined();
    });

    it('should return error when contract is not initialized', async () => {
      (service as any).contract = null;

      const result = await service.registerHash('hash-123', 'vehicle-123', 'SERVICE');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contrato não inicializado');
    });

    it('should handle timeout when waiting for transaction', async () => {
      // Mock wait to never resolve (simulating timeout)
      const mockWait = jest.fn().mockImplementation(() => {
        return new Promise(() => {
          // Never resolves to simulate timeout
        });
      });

      (service as any).contract = {
        registerHash: jest.fn().mockResolvedValue({
          hash: '0x1234567890abcdef',
          wait: mockWait,
        }),
      };

      // Mock Promise.race to immediately reject with timeout
      const originalPromiseRace = Promise.race;
      Promise.race = jest.fn().mockRejectedValue(new Error('Timeout aguardando mineração (20s)'));

      try {
        const result = await service.registerHash('hash-123', 'vehicle-123', 'SERVICE');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Timeout');
      } finally {
        Promise.race = originalPromiseRace;
      }
    });
  });

  describe('verifyService', () => {
    it('should verify service exists', async () => {
      const mockService = {
        serviceId: BigInt(1),
        vehicleId: 'vehicle-123',
        mileage: BigInt(50000),
        cost: BigInt(1000),
        description: 'Oil change',
        serviceType: 'MAINTENANCE',
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        serviceProvider: '0xProvider',
        isVerified: true,
      };

      (service as any).contract = {
        getService: jest.fn().mockResolvedValue(mockService),
      };

      const result = await service.verifyService(1);

      expect(result.exists).toBe(true);
      expect(result.info).toBeDefined();
      expect(result.info?.serviceId).toBe(1);
    });

    it('should return exists false when service not found', async () => {
      (service as any).contract = {
        getService: jest.fn().mockResolvedValue({
          serviceId: BigInt(0),
        }),
      };

      const result = await service.verifyService(1);

      expect(result.exists).toBe(false);
    });

    it('should return exists false when contract is not initialized', async () => {
      (service as any).contract = null;

      const result = await service.verifyService(1);

      expect(result.exists).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (service as any).contract = {
        getService: jest.fn().mockRejectedValue(new Error('Contract error')),
      };

      const result = await service.verifyService(1);

      expect(result.exists).toBe(false);
    });
  });

  describe('verifyHash', () => {
    it('should verify hash exists', async () => {
      // Mock verifyHashInContract
      jest.spyOn(service as any, 'verifyHashInContract').mockResolvedValue(true);

      const result = await service.verifyHash('hash-123');

      expect(result.exists).toBe(true);
      expect(result.info).toBeDefined();
    });

    it('should return exists false when hash not found', async () => {
      jest.spyOn(service as any, 'verifyHashInContract').mockResolvedValue(false);

      const result = await service.verifyHash('hash-123');

      expect(result.exists).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(service as any, 'verifyHashInContract').mockRejectedValue(new Error('Error'));

      const result = await service.verifyHash('hash-123');

      expect(result.exists).toBe(false);
    });
  });

  describe('verifyAndCount', () => {
    it('should verify and count successfully', async () => {
      (service as any).contract = {
        verifyAndCount: jest.fn().mockResolvedValue({
          hash: '0x1234567890abcdef',
          wait: jest.fn().mockResolvedValue({
            blockNumber: 1,
          }),
        }),
      };

      const result = await service.verifyAndCount('hash-123');

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBeDefined();
    });

    it('should return error when contract is not initialized', async () => {
      (service as any).contract = null;

      const result = await service.verifyAndCount('hash-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contrato não inicializado');
    });

    it('should handle errors gracefully', async () => {
      (service as any).contract = {
        verifyAndCount: jest.fn().mockRejectedValue(new Error('Contract error')),
      };

      const result = await service.verifyAndCount('hash-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contract error');
    });
  });

  describe('getVehicleHashes', () => {
    it('should get vehicle hashes', async () => {
      (service as any).contract = {
        getVehicleHashes: jest.fn().mockResolvedValue(['hash1', 'hash2']),
      };

      const result = await service.getVehicleHashes('vehicle-123');

      expect(result).toEqual(['hash1', 'hash2']);
    });

    it('should return empty array when contract is not initialized', async () => {
      (service as any).contract = null;

      const result = await service.getVehicleHashes('vehicle-123');

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      (service as any).contract = {
        getVehicleHashes: jest.fn().mockRejectedValue(new Error('Error')),
      };

      const result = await service.getVehicleHashes('vehicle-123');

      expect(result).toEqual([]);
    });
  });

  describe('getOwnerHashes', () => {
    it('should get owner hashes', async () => {
      (service as any).contract = {
        getOwnerHashes: jest.fn().mockResolvedValue(['hash1', 'hash2']),
      };

      const result = await service.getOwnerHashes('0xOwner');

      expect(result).toEqual(['hash1', 'hash2']);
    });

    it('should return empty array when contract is not initialized', async () => {
      (service as any).contract = null;

      const result = await service.getOwnerHashes('0xOwner');

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      (service as any).contract = {
        getOwnerHashes: jest.fn().mockRejectedValue(new Error('Error')),
      };

      const result = await service.getOwnerHashes('0xOwner');

      expect(result).toEqual([]);
    });
  });

  describe('getContractStats', () => {
    it('should get contract stats', async () => {
      (service as any).contract = {
        getStats: jest.fn().mockResolvedValue([
          BigInt(100),
          BigInt(50),
          BigInt(1000000000000000000),
        ]),
        getRegisteredHashesCount: jest.fn().mockResolvedValue(BigInt(200)),
      };

      const result = await service.getContractStats();

      expect(result.totalHashes).toBe(200);
      expect(result.contractBalance).toBeDefined();
    });

    it('should initialize contract if not initialized', async () => {
      (service as any).contract = null;
      const initializeSpy = jest.spyOn(service as any, 'initializeBesu').mockResolvedValue(undefined);

      // After initialization, set the contract
      initializeSpy.mockImplementation(async () => {
        (service as any).contract = {
          getStats: jest.fn().mockResolvedValue([
            BigInt(100),
            BigInt(50),
            BigInt(1000000000000000000),
          ]),
          getRegisteredHashesCount: jest.fn().mockResolvedValue(BigInt(200)),
        };
      });

      await service.getContractStats();

      expect(initializeSpy).toHaveBeenCalled();
    });

    it('should return default values on error', async () => {
      (service as any).contract = {
        getStats: jest.fn().mockRejectedValue(new Error('Error')),
      };

      const result = await service.getContractStats();

      expect(result.totalHashes).toBe(0);
      expect(result.contractBalance).toBe('0');
    });
  });

  describe('getNetworkInfo', () => {
    it('should get network info', async () => {
      (service as any).provider = {
        getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(1337), name: 'besu' }),
        getBlockNumber: jest.fn().mockResolvedValue(100),
        getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigInt(1000000000) }),
      };

      const result = await service.getNetworkInfo();

      expect(result.chainId).toBe(1337);
      expect(result.blockNumber).toBe(100);
      expect(result.networkName).toBe('besu');
    });

    it('should initialize provider if not initialized', async () => {
      (service as any).provider = null;
      const initializeSpy = jest.spyOn(service as any, 'initializeBesu').mockImplementation(async () => {
        (service as any).provider = {
          getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(1337), name: 'besu' }),
          getBlockNumber: jest.fn().mockResolvedValue(100),
          getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigInt(1000000000) }),
        };
      });

      await service.getNetworkInfo();

      expect(initializeSpy).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      (service as any).provider = {
        getNetwork: jest.fn().mockRejectedValue(new Error('Network error')),
        getBlockNumber: jest.fn().mockResolvedValue(100),
        getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigInt(1000000000) }),
      };

      await expect(service.getNetworkInfo()).rejects.toThrow('Network error');
    });
  });

  describe('isConnected', () => {
    it('should return true when connected', async () => {
      (service as any).provider = {
        getBlockNumber: jest.fn().mockResolvedValue(100),
      };

      const result = await service.isConnected();

      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      (service as any).provider = {
        getBlockNumber: jest.fn().mockRejectedValue(new Error('Error')),
      };

      const result = await service.isConnected();

      expect(result).toBe(false);
    });

    it('should initialize provider if not initialized', async () => {
      (service as any).provider = null;
      const initializeSpy = jest.spyOn(service as any, 'initializeBesu').mockImplementation(async () => {
        (service as any).provider = {
          getBlockNumber: jest.fn().mockResolvedValue(100),
        };
      });

      await service.isConnected();

      expect(initializeSpy).toHaveBeenCalled();
    });

    it('should return false if provider cannot be initialized', async () => {
      (service as any).provider = null;
      jest.spyOn(service as any, 'initializeBesu').mockResolvedValue(undefined);
      (service as any).provider = null;

      const result = await service.isConnected();

      expect(result).toBe(false);
    });
  });

  describe('diagnoseNetwork', () => {
    it('should diagnose network successfully', async () => {
      (service as any).provider = {
        getBlockNumber: jest.fn().mockResolvedValue(100),
        getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(1337) }),
        getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigInt(1000000000) }),
        getCode: jest.fn().mockResolvedValue('0x1234'),
        getBlock: jest.fn()
          .mockResolvedValueOnce({ number: 100, timestamp: 1000 })
          .mockResolvedValueOnce({ number: 99, timestamp: 990 }),
      };

      (service as any).contract = {
        getAddress: jest.fn().mockResolvedValue('0xContractAddress'),
      };

      jest.spyOn(service, 'isConnected').mockResolvedValue(true);

      const result = await service.diagnoseNetwork();

      expect(result.connected).toBe(true);
      expect(result.blockNumber).toBe(100);
      expect(result.chainId).toBe('1337');
    });

    it('should return issues when not connected', async () => {
      jest.spyOn(service, 'isConnected').mockResolvedValue(false);

      const result = await service.diagnoseNetwork();

      expect(result.connected).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should detect when contract is not deployed', async () => {
      (service as any).provider = {
        getBlockNumber: jest.fn().mockResolvedValue(100),
        getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(1337) }),
        getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigInt(1000000000) }),
        getCode: jest.fn().mockResolvedValue('0x'),
        getBlock: jest.fn()
          .mockResolvedValueOnce({ number: 100, timestamp: 1000 })
          .mockResolvedValueOnce({ number: 99, timestamp: 990 }),
      };

      (service as any).contract = {
        getAddress: jest.fn().mockResolvedValue('0xContractAddress'),
      };

      jest.spyOn(service, 'isConnected').mockResolvedValue(true);

      const result = await service.diagnoseNetwork();

      expect(result.issues.some(issue => issue.includes('NÃO está implantado'))).toBe(true);
    });

    it('should detect slow network', async () => {
      (service as any).provider = {
        getBlockNumber: jest.fn().mockResolvedValue(100),
        getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(1337) }),
        getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigInt(1000000000) }),
        getCode: jest.fn().mockResolvedValue('0x1234'),
        getBlock: jest.fn()
          .mockResolvedValueOnce({ number: 100, timestamp: 1000 })
          .mockResolvedValueOnce({ number: 99, timestamp: 900 }),
      };

      (service as any).contract = {
        getAddress: jest.fn().mockResolvedValue('0xContractAddress'),
      };

      jest.spyOn(service, 'isConnected').mockResolvedValue(true);

      const result = await service.diagnoseNetwork();

      expect(result.issues.some(issue => issue.includes('lenta'))).toBe(true);
    });
  });

  describe('verifyHashInContract', () => {
    it('should verify hash exists in contract', async () => {
      (service as any).contract = {
        hashExists: jest.fn().mockResolvedValue(true),
      };

      const result = await service.verifyHashInContract('hash-123');

      expect(result).toBe(true);
    });

    it('should return false when hash does not exist', async () => {
      (service as any).contract = {
        hashExists: jest.fn().mockResolvedValue(false),
      };

      const result = await service.verifyHashInContract('hash-123');

      expect(result).toBe(false);
    });

    it('should initialize contract if not initialized', async () => {
      (service as any).contract = null;
      const initializeSpy = jest.spyOn(service as any, 'initializeBesu').mockImplementation(async () => {
        (service as any).contract = {
          hashExists: jest.fn().mockResolvedValue(true),
        };
      });

      await service.verifyHashInContract('hash-123');

      expect(initializeSpy).toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      (service as any).contract = {
        hashExists: jest.fn().mockRejectedValue(new Error('Error')),
      };

      const result = await service.verifyHashInContract('hash-123');

      expect(result).toBe(false);
    });
  });

  describe('getBalance', () => {
    it('should get balance', async () => {
      (service as any).provider = {
        getBalance: jest.fn().mockResolvedValue(BigInt(1000000000000000000)),
      };

      const result = await service.getBalance('0xAddress');

      expect(result).toBeDefined();
    });

    it('should return 0 on error', async () => {
      (service as any).provider = {
        getBalance: jest.fn().mockRejectedValue(new Error('Error')),
      };

      const result = await service.getBalance('0xAddress');

      expect(result).toBe('0');
    });
  });
});

