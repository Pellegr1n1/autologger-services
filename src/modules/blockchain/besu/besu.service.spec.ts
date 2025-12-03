import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BesuService } from './besu.service';
import { LoggerService } from '@/common/logger/logger.service';
import { LoggerServiceTestHelper } from '@/common/test-helpers/logger-service.test-helper';
import { VehicleService } from '@/modules/vehicle/entities/vehicle-service.entity';

describe('BesuService', () => {
  let service: BesuService;
  let mockVehicleServiceRepository: jest.Mocked<Repository<VehicleService>>;

  // Helper function to create a never-resolving promise (for timeout simulation)
  // This avoids deep nesting in test cases
  const createNeverResolvingPromise = (): Promise<any> => {
    return new Promise(() => {});
  };

  // Helper function to create mock contract with registerService
  const createMockContractWithRegisterService = (waitMock: jest.Mock) => ({
    registerService: jest.fn().mockResolvedValue({
      hash: '0x1234567890abcdef',
      wait: waitMock,
    }),
    interface: {
      parseLog: jest.fn(),
    },
  });

  // Helper function to create mock contract with registerHash
  const createMockContractWithRegisterHash = (waitMock: jest.Mock) => ({
    registerHash: jest.fn().mockResolvedValue({
      hash: '0x1234567890abcdef',
      wait: waitMock,
    }),
  });

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          BESU_RPC_URL: 'http://localhost:8545',
          BESU_PRIVATE_KEY:
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          BESU_CONTRACT_ADDRESS: '0xContractAddress',
        };
        return config[key] || defaultValue;
      }),
    };

    const mockLoggerService = LoggerServiceTestHelper.createMockLoggerService();

    mockVehicleServiceRepository = {
      findOne: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BesuService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: getRepositoryToken(VehicleService),
          useValue: mockVehicleServiceRepository,
        },
      ],
    }).compile();

    service = module.get<BesuService>(BesuService);
    mockVehicleServiceRepository = module.get(
      getRepositoryToken(VehicleService),
    ) as jest.Mocked<Repository<VehicleService>>;
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
      const mockLog = {
        topics: ['0x123'],
        data: '0x456',
      };

      const mockParsedLog = {
        name: 'ServiceRegistered',
        args: { serviceId: BigInt(1) },
      };

      (service as any).contract = {
        registerService: jest.fn().mockResolvedValue({
          hash: '0x1234567890abcdef',
          wait: jest.fn().mockResolvedValue({
            blockNumber: 1,
            logs: [mockLog],
            gasUsed: BigInt(100000),
          }),
        }),
        interface: {
          parseLog: jest.fn((log) => {
            if (log === mockLog) {
              return mockParsedLog;
            }
            return null;
          }),
        },
      };

      const result = await service.registerService(serviceData);

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBe('0x1234567890abcdef');
      expect(result.serviceId).toBe(1);
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
      const mockWait = jest
        .fn()
        .mockImplementation(createNeverResolvingPromise);

      (service as any).contract =
        createMockContractWithRegisterService(mockWait);

      // Mock Promise.race to immediately reject with timeout
      const originalPromiseRace = Promise.race;
      Promise.race = jest
        .fn()
        .mockRejectedValue(new Error('Timeout aguardando mineração (20s)'));

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
        topics: ['0x123'],
        data: '0x456',
      };

      const mockParsedLog = {
        name: 'ServiceRegistered',
        args: { serviceId: BigInt(1) },
      };

      (service as any).contract = {
        registerService: jest.fn().mockResolvedValue({
          hash: '0x1234567890abcdef',
          wait: jest.fn().mockResolvedValue({
            blockNumber: 1,
            logs: [mockLog],
            gasUsed: BigInt(100000),
          }),
        }),
        interface: {
          parseLog: jest.fn((log) => {
            if (log === mockLog) {
              return mockParsedLog;
            }
            throw new Error('Log não reconhecido');
          }),
        },
      };

      const result = await service.registerService(serviceData);

      expect(result.success).toBe(true);
      expect(result.serviceId).toBe(1);
      expect(result.transactionHash).toBe('0x1234567890abcdef');
    });
  });

  describe('registerHash', () => {
    it('should register hash successfully', async () => {
      (service as any).contract = {
        registerHash: jest.fn().mockResolvedValue({
          hash: '0x1234567890abcdef',
          wait: jest.fn().mockResolvedValue({
            blockNumber: 1,
            gasUsed: BigInt(100000),
            status: 1, // Status 1 = transação bem-sucedida
          }),
        }),
      };

      const result = await service.registerHash(
        'hash-123',
        'vehicle-123',
        'SERVICE',
      );

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBe('0x1234567890abcdef');
    });

    it('should return error when contract is not initialized', async () => {
      (service as any).contract = null;

      const result = await service.registerHash(
        'hash-123',
        'vehicle-123',
        'SERVICE',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contrato não inicializado');
    });

    it('should handle timeout when waiting for transaction', async () => {
      // Mock wait que nunca resolve (simulando timeout)
      const mockWait = jest
        .fn()
        .mockImplementation(() => new Promise(() => {})); // Promise que nunca resolve

      (service as any).contract = {
        registerHash: jest.fn().mockResolvedValue({
          hash: '0x1234567890abcdef',
          wait: mockWait,
        }),
      };

      // Mock setTimeout para que o timeout aconteça imediatamente
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback: any, delay: number) => {
        // Se for o timeout de 20s, executar imediatamente
        if (delay === 20000) {
          callback();
        }
        return originalSetTimeout(callback, delay) as any;
      }) as any;

      try {
        const result = await service.registerHash(
          'hash-123',
          'vehicle-123',
          'SERVICE',
        );
        expect(result.success).toBe(false);
        expect(result.error).toContain('Timeout');
      } finally {
        // Restaurar setTimeout original
        global.setTimeout = originalSetTimeout;
      }
    }, 10000); // Aumentar timeout do teste para 10s
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
      jest
        .spyOn(service as any, 'verifyHashInContract')
        .mockResolvedValue(true);

      const result = await service.verifyHash('hash-123');

      expect(result.exists).toBe(true);
      expect(result.info).toBeDefined();
    });

    it('should return exists false when hash not found', async () => {
      jest
        .spyOn(service as any, 'verifyHashInContract')
        .mockResolvedValue(false);

      const result = await service.verifyHash('hash-123');

      expect(result.exists).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(service as any, 'verifyHashInContract')
        .mockRejectedValue(new Error('Error'));

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
        verifyAndCount: jest
          .fn()
          .mockRejectedValue(new Error('Contract error')),
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
        getStats: jest
          .fn()
          .mockResolvedValue([
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
      const initializeSpy = jest
        .spyOn(service as any, 'initializeBesu')
        .mockResolvedValue(undefined);

      // After initialization, set the contract
      initializeSpy.mockImplementation(async () => {
        (service as any).contract = {
          getStats: jest
            .fn()
            .mockResolvedValue([
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
        getNetwork: jest
          .fn()
          .mockResolvedValue({ chainId: BigInt(1337), name: 'besu' }),
        getBlockNumber: jest.fn().mockResolvedValue(100),
        getFeeData: jest
          .fn()
          .mockResolvedValue({ gasPrice: BigInt(1000000000) }),
      };

      const result = await service.getNetworkInfo();

      expect(result.chainId).toBe(1337);
      expect(result.blockNumber).toBe(100);
      expect(result.networkName).toBe('besu');
    });

    it('should initialize provider if not initialized', async () => {
      (service as any).provider = null;
      const initializeSpy = jest
        .spyOn(service as any, 'initializeBesu')
        .mockImplementation(async () => {
          (service as any).provider = {
            getNetwork: jest
              .fn()
              .mockResolvedValue({ chainId: BigInt(1337), name: 'besu' }),
            getBlockNumber: jest.fn().mockResolvedValue(100),
            getFeeData: jest
              .fn()
              .mockResolvedValue({ gasPrice: BigInt(1000000000) }),
          };
        });

      await service.getNetworkInfo();

      expect(initializeSpy).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      (service as any).provider = {
        getNetwork: jest.fn().mockRejectedValue(new Error('Network error')),
        getBlockNumber: jest.fn().mockResolvedValue(100),
        getFeeData: jest
          .fn()
          .mockResolvedValue({ gasPrice: BigInt(1000000000) }),
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
      const initializeSpy = jest
        .spyOn(service as any, 'initializeBesu')
        .mockImplementation(async () => {
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
      // Mock setTimeout para acelerar o teste
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn: any) => {
        // Executar imediatamente em vez de esperar
        return originalSetTimeout(fn, 0);
      }) as any;

      (service as any).provider = {
        getBlockNumber: jest
          .fn()
          .mockResolvedValueOnce(100) // checkBlockNumber
          .mockResolvedValueOnce(100) // initialBlockNumber em checkMiningActivity
          .mockResolvedValueOnce(101), // finalBlockNumber (1 bloco minerado)
        getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(1337) }),
        getFeeData: jest
          .fn()
          .mockResolvedValue({ gasPrice: BigInt(1000000000) }),
        getCode: jest.fn().mockResolvedValue('0x1234'),
        getBlock: jest
          .fn()
          .mockResolvedValueOnce({
            number: 100,
            timestamp: Math.floor(Date.now() / 1000),
          })
          .mockResolvedValueOnce({
            number: 99,
            timestamp: Math.floor(Date.now() / 1000) - 10,
          }),
      };

      (service as any).contract = {
        getAddress: jest.fn().mockResolvedValue('0xContractAddress'),
        totalServices: jest.fn().mockResolvedValue(BigInt(0)),
      };

      jest.spyOn(service, 'isConnected').mockResolvedValue(true);

      const result = await service.diagnoseNetwork();

      expect(result.connected).toBe(true);
      expect(result.blockNumber).toBe(100);
      expect(result.chainId).toBe('1337');

      // Restaurar setTimeout original
      global.setTimeout = originalSetTimeout;
    }, 15000);

    it('should return issues when not connected', async () => {
      jest.spyOn(service, 'isConnected').mockResolvedValue(false);

      const result = await service.diagnoseNetwork();

      expect(result.connected).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should detect when contract is not deployed', async () => {
      // Mock setTimeout para acelerar o teste
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn: any) => {
        // Executar imediatamente em vez de esperar
        return originalSetTimeout(fn, 0);
      }) as any;

      (service as any).provider = {
        getBlockNumber: jest
          .fn()
          .mockResolvedValueOnce(100) // initialBlockNumber
          .mockResolvedValueOnce(100), // finalBlockNumber (sem novos blocos)
        getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(1337) }),
        getFeeData: jest
          .fn()
          .mockResolvedValue({ gasPrice: BigInt(1000000000) }),
        getCode: jest.fn().mockResolvedValue('0x'),
        getBlock: jest
          .fn()
          .mockResolvedValueOnce({
            number: 100,
            timestamp: Math.floor(Date.now() / 1000),
          })
          .mockResolvedValueOnce({
            number: 99,
            timestamp: Math.floor(Date.now() / 1000) - 10,
          }),
      };

      (service as any).contract = {
        getAddress: jest.fn().mockResolvedValue('0xContractAddress'),
        totalServices: jest.fn().mockResolvedValue(BigInt(0)),
      };

      jest.spyOn(service, 'isConnected').mockResolvedValue(true);

      const result = await service.diagnoseNetwork();

      // Verificar se há alguma issue relacionada ao contrato não implantado
      const contractIssues = result.issues.filter(
        (issue) =>
          issue.toLowerCase().includes('implantado') ||
          issue.toLowerCase().includes('deployed') ||
          issue.toLowerCase().includes('contrato'),
      );
      expect(contractIssues.length).toBeGreaterThan(0);

      // Restaurar setTimeout original
      global.setTimeout = originalSetTimeout;
    }, 15000);

    it('should detect slow network', async () => {
      // Mock setTimeout para acelerar o teste
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn: any) => {
        // Executar imediatamente em vez de esperar
        return originalSetTimeout(fn, 0);
      }) as any;

      (service as any).provider = {
        getBlockNumber: jest
          .fn()
          .mockResolvedValueOnce(100) // initialBlockNumber
          .mockResolvedValueOnce(100), // finalBlockNumber (sem novos blocos)
        getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(1337) }),
        getFeeData: jest
          .fn()
          .mockResolvedValue({ gasPrice: BigInt(1000000000) }),
        getCode: jest.fn().mockResolvedValue('0x1234'),
        getBlock: jest
          .fn()
          .mockResolvedValueOnce({
            number: 100,
            timestamp: Math.floor(Date.now() / 1000),
          })
          .mockResolvedValueOnce({
            number: 99,
            timestamp: Math.floor(Date.now() / 1000) - 40,
          }), // 40s entre blocos (lento)
      };

      (service as any).contract = {
        getAddress: jest.fn().mockResolvedValue('0xContractAddress'),
        totalServices: jest.fn().mockResolvedValue(BigInt(0)),
      };

      jest.spyOn(service, 'isConnected').mockResolvedValue(true);

      const result = await service.diagnoseNetwork();

      expect(
        result.issues.some(
          (issue) => issue.includes('lenta') || issue.includes('lento'),
        ),
      ).toBe(true);

      // Restaurar setTimeout original
      global.setTimeout = originalSetTimeout;
    }, 15000);
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
      const initializeSpy = jest
        .spyOn(service as any, 'initializeBesu')
        .mockImplementation(async () => {
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

  describe('verifyService', () => {
    it('should verify service exists', async () => {
      const mockServiceInfo = {
        serviceId: BigInt(1),
        vehicleId: 'vehicle-123',
        mileage: BigInt(50000),
        cost: BigInt(1000),
        description: 'Oil change',
        serviceType: 'MAINTENANCE',
        timestamp: BigInt(1234567890),
        serviceProvider: '0xProvider',
        isVerified: true,
      };

      (service as any).contract = {
        getService: jest.fn().mockResolvedValue(mockServiceInfo),
      };

      const result = await service.verifyService(1);

      expect(result.exists).toBe(true);
      expect(result.info).toBeDefined();
      expect(result.info.serviceId).toBe(1);
    });

    it('should return exists false when service not found', async () => {
      (service as any).contract = {
        getService: jest.fn().mockResolvedValue({ serviceId: BigInt(0) }),
      };

      const result = await service.verifyService(1);

      expect(result.exists).toBe(false);
    });

    it('should return exists false when contract not initialized', async () => {
      (service as any).contract = null;

      const result = await service.verifyService(1);

      expect(result.exists).toBe(false);
    });

    it('should return exists false on error', async () => {
      (service as any).contract = {
        getService: jest.fn().mockRejectedValue(new Error('Contract error')),
      };

      const result = await service.verifyService(1);

      expect(result.exists).toBe(false);
    });
  });

  describe('verifyHash', () => {
    it('should verify hash exists with service info', async () => {
      const mockVehicleService = {
        id: 'service-123',
        vehicleId: 'vehicle-123',
        type: 'maintenance' as any,
        serviceDate: new Date('2024-01-15'),
        cost: 250.0,
        description: 'Troca de óleo',
        blockchainConfirmedAt: new Date('2024-01-15T10:00:00Z'),
        vehicle: {
          id: 'vehicle-123',
          user: {
            email: 'usuario@email.com',
          },
        },
      };

      jest
        .spyOn(service as any, 'verifyHashInContract')
        .mockResolvedValue(true);
      mockVehicleServiceRepository.findOne.mockResolvedValue(
        mockVehicleService as any,
      );

      const result = await service.verifyHash('hash-123');

      expect(result.exists).toBe(true);
      expect(result.info).toBeDefined();
      expect(result.info?.vehicleId).toBe('vehicle-123');
      expect(result.info?.eventType).toBe('maintenance');
      expect(result.info?.serviceId).toBe('service-123');
      expect(mockVehicleServiceRepository.findOne).toHaveBeenCalledWith({
        where: { blockchainHash: 'hash-123' },
        relations: ['vehicle', 'vehicle.user'],
      });
    });

    it('should verify hash exists but no service in database', async () => {
      jest
        .spyOn(service as any, 'verifyHashInContract')
        .mockResolvedValue(true);
      mockVehicleServiceRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyHash('hash-123');

      expect(result.exists).toBe(true);
      expect(result.info).toBeDefined();
      expect(result.info?.vehicleId).toBe('');
      expect(result.info?.eventType).toBe('');
    });

    it('should return exists false when hash not found', async () => {
      (service as any).contract = {
        hashExists: jest.fn().mockResolvedValue(false),
      };

      const result = await service.verifyHash('hash-123');

      expect(result.exists).toBe(false);
    });

    it('should return exists false when contract not initialized', async () => {
      (service as any).contract = null;

      const result = await service.verifyHash('hash-123');

      expect(result.exists).toBe(false);
    });

    it('should return exists false on error', async () => {
      (service as any).contract = {
        hashExists: jest.fn().mockRejectedValue(new Error('Contract error')),
      };

      const result = await service.verifyHash('hash-123');

      expect(result.exists).toBe(false);
    });
  });

  describe('verifyAndCount', () => {
    it('should verify hash and return success', async () => {
      (service as any).contract = {
        verifyAndCount: jest.fn().mockResolvedValue({
          hash: '0x1234567890abcdef',
          wait: jest.fn().mockResolvedValue({
            blockNumber: 1,
            gasUsed: BigInt(100000),
          }),
        }),
      };

      const result = await service.verifyAndCount('hash-123');

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBe('0x1234567890abcdef');
    });

    it('should return error when contract not initialized', async () => {
      (service as any).contract = null;

      const result = await service.verifyAndCount('hash-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
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

    it('should return empty array when contract not initialized', async () => {
      (service as any).contract = null;

      const result = await service.getVehicleHashes('vehicle-123');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
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
        getOwnerHashes: jest.fn().mockResolvedValue(['hash1']),
      };

      const result = await service.getOwnerHashes('0xOwner');

      expect(result).toEqual(['hash1']);
    });

    it('should return empty array when contract not initialized', async () => {
      (service as any).contract = null;

      const result = await service.getOwnerHashes('0xOwner');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      (service as any).contract = {
        getOwnerHashes: jest.fn().mockRejectedValue(new Error('Error')),
      };

      const result = await service.getOwnerHashes('0xOwner');

      expect(result).toEqual([]);
    });
  });

  describe('getContractStats', () => {
    it('should get contract stats successfully', async () => {
      (service as any).contract = {
        getStats: jest
          .fn()
          .mockResolvedValue([
            BigInt(10),
            BigInt(5),
            BigInt(1000000000000000000),
          ]),
        getRegisteredHashesCount: jest.fn().mockResolvedValue(BigInt(8)),
      };

      const result = await service.getContractStats();

      expect(result.totalHashes).toBe(8);
      expect(result.contractBalance).toBeDefined();
    });

    it('should initialize contract if not initialized', async () => {
      (service as any).contract = null;
      const initializeSpy = jest
        .spyOn(service as any, 'initializeBesu')
        .mockImplementation(async () => {
          (service as any).contract = {
            getStats: jest
              .fn()
              .mockResolvedValue([BigInt(0), BigInt(0), BigInt(0)]),
            getRegisteredHashesCount: jest.fn().mockResolvedValue(BigInt(0)),
          };
        });

      const result = await service.getContractStats();

      expect(initializeSpy).toHaveBeenCalled();
      expect(result.totalHashes).toBe(0);
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
    it('should get network info successfully', async () => {
      (service as any).provider = {
        getNetwork: jest
          .fn()
          .mockResolvedValue({ chainId: BigInt(1337), name: 'besu' }),
        getBlockNumber: jest.fn().mockResolvedValue(100),
        getFeeData: jest
          .fn()
          .mockResolvedValue({ gasPrice: BigInt(1000000000) }),
      };

      const result = await service.getNetworkInfo();

      expect(result.chainId).toBe(1337);
      expect(result.blockNumber).toBe(100);
    });

    it('should initialize provider if not initialized', async () => {
      (service as any).provider = null;
      const initializeSpy = jest
        .spyOn(service as any, 'initializeBesu')
        .mockImplementation(async () => {
          (service as any).provider = {
            getNetwork: jest
              .fn()
              .mockResolvedValue({ chainId: BigInt(1337), name: 'besu' }),
            getBlockNumber: jest.fn().mockResolvedValue(100),
            getFeeData: jest
              .fn()
              .mockResolvedValue({ gasPrice: BigInt(1000000000) }),
          };
        });

      const result = await service.getNetworkInfo();

      expect(initializeSpy).toHaveBeenCalled();
      expect(result.chainId).toBe(1337);
    });

    it('should throw error when provider cannot be initialized', async () => {
      (service as any).provider = null;
      jest
        .spyOn(service as any, 'initializeBesu')
        .mockImplementation(async () => {
          (service as any).provider = null;
        });

      await expect(service.getNetworkInfo()).rejects.toThrow(
        'Provider não pôde ser inicializado',
      );
    });
  });

  describe('diagnoseNetwork error handling', () => {
    it('should handle errors in checkBlockNumber', async () => {
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn: any) =>
        originalSetTimeout(fn, 0),
      ) as any;

      (service as any).provider = {
        getBlockNumber: jest
          .fn()
          .mockRejectedValueOnce(new Error('Network error')) // checkBlockNumber error
          .mockResolvedValueOnce(100) // initialBlockNumber
          .mockResolvedValueOnce(100), // finalBlockNumber
        getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(1337) }),
        getFeeData: jest
          .fn()
          .mockResolvedValue({ gasPrice: BigInt(1000000000) }),
        getCode: jest.fn().mockResolvedValue('0x1234'),
        getBlock: jest
          .fn()
          .mockResolvedValueOnce({
            number: 100,
            timestamp: Math.floor(Date.now() / 1000),
          })
          .mockResolvedValueOnce({
            number: 99,
            timestamp: Math.floor(Date.now() / 1000) - 10,
          }),
      };

      (service as any).contract = {
        getAddress: jest.fn().mockResolvedValue('0xContractAddress'),
        totalServices: jest.fn().mockResolvedValue(BigInt(0)),
      };

      jest.spyOn(service, 'isConnected').mockResolvedValue(true);

      const result = await service.diagnoseNetwork();

      expect(result.issues.length).toBeGreaterThan(0);

      global.setTimeout = originalSetTimeout;
    }, 15000);
  });
});
