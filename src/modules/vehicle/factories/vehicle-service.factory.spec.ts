import { Test, TestingModule } from '@nestjs/testing';
import { VehicleServiceFactory } from './vehicle-service.factory';
import {
  VehicleService,
  ServiceStatus,
  ServiceType,
} from '../entities/vehicle-service.entity';
import { IStorage } from '../../storage/interfaces/storage.interface';

describe('VehicleServiceFactory', () => {
  let factory: VehicleServiceFactory;
  let mockStorage: jest.Mocked<IStorage>;

  const mockVehicleService: VehicleService = {
    id: '123',
    vehicleId: 'vehicle-123',
    vehicle: null,
    type: ServiceType.MAINTENANCE,
    category: 'Óleo',
    description: 'Troca de óleo',
    serviceDate: new Date('2025-01-15'),
    mileage: 50000,
    cost: 150,
    location: 'Oficina ABC',
    attachments: [
      's3://bucket/attachments/file1.pdf',
      's3://bucket/attachments/file2.pdf',
    ],
    technician: 'João Silva',
    warranty: true,
    nextServiceDate: new Date('2025-07-15'),
    notes: 'Tudo ok',
    status: ServiceStatus.CONFIRMED,
    blockchainHash: '0xabc123',
    previousHash: null,
    merkleRoot: null,
    isImmutable: true,
    canEdit: false,
    blockchainConfirmedAt: new Date(),
    confirmedBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockStorage = {
      upload: jest.fn(),
      delete: jest.fn(),
      isConfigured: jest.fn(() => true),
      getAccessibleUrl: jest.fn((url: string) =>
        Promise.resolve(`https://signed-url.com/${url}`),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleServiceFactory,
        {
          provide: 'STORAGE',
          useValue: mockStorage,
        },
      ],
    }).compile();

    factory = module.get<VehicleServiceFactory>(VehicleServiceFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('toResponseDto', () => {
    it('should convert attachment URLs to accessible URLs', async () => {
      const result = await factory.toResponseDto(mockVehicleService);

      expect(result.attachments).toHaveLength(2);
      expect(result.attachments[0]).toBe(
        'https://signed-url.com/s3://bucket/attachments/file1.pdf',
      );
      expect(result.attachments[1]).toBe(
        'https://signed-url.com/s3://bucket/attachments/file2.pdf',
      );
      expect(mockStorage.getAccessibleUrl).toHaveBeenCalledTimes(2);
    });

    it('should return service as-is if no attachments', async () => {
      const serviceWithoutAttachments = {
        ...mockVehicleService,
        attachments: null,
      };
      const result = await factory.toResponseDto(serviceWithoutAttachments);

      expect(result).toEqual(serviceWithoutAttachments);
      expect(mockStorage.getAccessibleUrl).not.toHaveBeenCalled();
    });

    it('should return service as-is if attachments is empty array', async () => {
      const serviceWithEmptyAttachments = {
        ...mockVehicleService,
        attachments: [],
      };
      const result = await factory.toResponseDto(serviceWithEmptyAttachments);

      expect(result).toEqual(serviceWithEmptyAttachments);
      expect(mockStorage.getAccessibleUrl).not.toHaveBeenCalled();
    });

    it('should handle error when converting attachment URL', async () => {
      mockStorage.getAccessibleUrl = jest
        .fn()
        .mockRejectedValueOnce(new Error('S3 error'))
        .mockResolvedValueOnce('https://signed-url.com/file2.pdf');

      const result = await factory.toResponseDto(mockVehicleService);

      expect(result.attachments[0]).toBe('s3://bucket/attachments/file1.pdf'); // Original URL
      expect(result.attachments[1]).toBe('https://signed-url.com/file2.pdf'); // Converted URL
    });

    it('should return service as-is if getAccessibleUrl is not available', async () => {
      mockStorage.getAccessibleUrl = undefined;

      const result = await factory.toResponseDto(mockVehicleService);

      expect(result).toEqual(mockVehicleService);
    });
  });

  describe('toResponseDtoArray', () => {
    it('should convert array of services', async () => {
      const services = [
        mockVehicleService,
        {
          ...mockVehicleService,
          id: '456',
          attachments: ['s3://bucket/attachments/file3.pdf'],
        },
      ];

      const result = await factory.toResponseDtoArray(services);

      expect(result).toHaveLength(2);
      expect(result[0].attachments[0]).toBe(
        'https://signed-url.com/s3://bucket/attachments/file1.pdf',
      );
      expect(result[1].attachments[0]).toBe(
        'https://signed-url.com/s3://bucket/attachments/file3.pdf',
      );
      expect(mockStorage.getAccessibleUrl).toHaveBeenCalledTimes(3);
    });

    it('should handle empty array', async () => {
      const result = await factory.toResponseDtoArray([]);

      expect(result).toEqual([]);
      expect(mockStorage.getAccessibleUrl).not.toHaveBeenCalled();
    });
  });
});
