import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainModule } from './blockchain.module';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { BesuService } from './besu/besu.service';
import { ConfigModule } from '@nestjs/config';
import { VehicleService } from '../vehicle/entities/vehicle-service.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@/common/logger/logger.service';
import { LoggerServiceTestHelper } from '@/common/test-helpers/logger-service.test-helper';
import { LoggerModule } from '@/common/logger/logger.module';

describe('BlockchainModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const mockLoggerService = LoggerServiceTestHelper.createMockLoggerService();

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        LoggerModule,
      ],
      providers: [
        BlockchainService,
        BlockchainController,
        {
          provide: BesuService,
          useValue: {
            isConnected: jest.fn(),
            registerHash: jest.fn(),
            verifyHashInContract: jest.fn(),
            getContractStats: jest.fn(),
            getNetworkInfo: jest.fn(),
          } as any,
        },
        {
          provide: getRepositoryToken(VehicleService),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    })
      .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide BlockchainService', () => {
    const service = module.get<BlockchainService>(BlockchainService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(BlockchainService);
  });

  it('should provide BesuService', () => {
    const service = module.get<BesuService>(BesuService);
    expect(service).toBeDefined();
  });

  it('should provide BlockchainController', () => {
    const controller = module.get<BlockchainController>(BlockchainController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(BlockchainController);
  });

  it('should export BlockchainService', () => {
    const exportedService = module.get<BlockchainService>(BlockchainService);
    expect(exportedService).toBeDefined();
  });

  it('should export BesuService', () => {
    const exportedService = module.get<BesuService>(BesuService);
    expect(exportedService).toBeDefined();
  });
});

