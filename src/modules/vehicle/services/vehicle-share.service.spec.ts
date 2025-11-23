import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { VehicleShareService } from './vehicle-share.service';
import { VehicleShare } from '../entities/vehicle-share.entity';
import { VehicleService } from './vehicle.service';
import { VehicleServiceService } from './vehicle-service.service';
import { VehicleStatus } from '../enums/vehicle-status.enum';
import { ServiceType, ServiceStatus } from '../entities/vehicle-service.entity';

describe('VehicleShareService', () => {
  let service: VehicleShareService;
  let vehicleShareRepository: jest.Mocked<Repository<VehicleShare>>;
  let vehicleService: jest.Mocked<VehicleService>;
  let vehicleServiceService: jest.Mocked<VehicleServiceService>;

  const mockVehicle = {
    id: 'vehicle-123',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    color: 'Branco',
    mileage: 50000,
    status: VehicleStatus.ACTIVE,
    createdAt: new Date(),
    photoUrl: null,
  };

  const mockVehicleShare = {
    id: 'share-123',
    shareToken: 'token-123',
    vehicleId: 'vehicle-123',
    vehicle: mockVehicle,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    includeAttachments: false,
    viewCount: 0,
    lastViewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    id: 'service-123',
    vehicleId: 'vehicle-123',
    type: ServiceType.MAINTENANCE,
    category: 'Oleo',
    description: 'Troca de oleo',
    serviceDate: new Date(),
    mileage: 50000,
    cost: 150,
    location: 'Oficina',
    status: ServiceStatus.CONFIRMED,
    attachments: ['url1', 'url2'],
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockVehicleShareRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockVehicleService = {
      findVehicleById: jest.fn(),
    };

    const mockVehicleServiceService = {
      findByVehicleId: jest.fn(),
    };

    const mockStorage = {
      upload: jest.fn(),
      delete: jest.fn(),
      getAccessibleUrl: jest.fn((url) => Promise.resolve(url)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleShareService,
        {
          provide: getRepositoryToken(VehicleShare),
          useValue: mockVehicleShareRepository,
        },
        {
          provide: VehicleService,
          useValue: mockVehicleService,
        },
        {
          provide: VehicleServiceService,
          useValue: mockVehicleServiceService,
        },
        {
          provide: 'STORAGE',
          useValue: mockStorage,
        },
      ],
    }).compile();

    service = module.get<VehicleShareService>(VehicleShareService);
    vehicleShareRepository = module.get(getRepositoryToken(VehicleShare));
    vehicleService = module.get(VehicleService);
    vehicleServiceService = module.get(VehicleServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateShareToken', () => {
    it('should generate share token successfully', async () => {
      const expiresInDays = 30;
      const includeAttachments = false;

      vehicleService.findVehicleById.mockResolvedValue(mockVehicle as any);
      vehicleShareRepository.create.mockReturnValue(mockVehicleShare as any);
      vehicleShareRepository.save.mockResolvedValue(mockVehicleShare as any);

      const result = await service.generateShareToken(
        'vehicle-123',
        'user-123',
        expiresInDays,
        includeAttachments,
      );

      expect(vehicleService.findVehicleById).toHaveBeenCalledWith(
        'vehicle-123',
        'user-123',
      );
      expect(vehicleShareRepository.create).toHaveBeenCalled();
      expect(vehicleShareRepository.save).toHaveBeenCalled();
      expect(result.shareToken).toBeDefined();
      expect(result.shareUrl).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException when vehicle is sold', async () => {
      const soldVehicle = { ...mockVehicle, status: VehicleStatus.SOLD };
      vehicleService.findVehicleById.mockResolvedValue(soldVehicle as any);

      await expect(
        service.generateShareToken('vehicle-123', 'user-123', 30, false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate share token with includeAttachments true', async () => {
      vehicleService.findVehicleById.mockResolvedValue(mockVehicle as any);
      vehicleShareRepository.create.mockReturnValue({
        ...mockVehicleShare,
        includeAttachments: true,
      } as any);
      vehicleShareRepository.save.mockResolvedValue({
        ...mockVehicleShare,
        includeAttachments: true,
      } as any);

      const result = await service.generateShareToken(
        'vehicle-123',
        'user-123',
        30,
        true,
      );

      expect(result.isActive).toBe(true);
    });
  });

  describe('getPublicVehicleInfo', () => {
    it('should return public vehicle info successfully', async () => {
      vehicleShareRepository.findOne.mockResolvedValue(mockVehicleShare as any);
      vehicleServiceService.findByVehicleId.mockResolvedValue([
        mockService,
      ] as any);
      vehicleShareRepository.save.mockResolvedValue(mockVehicleShare as any);

      const result = await service.getPublicVehicleInfo('token-123');

      expect(vehicleShareRepository.findOne).toHaveBeenCalledWith({
        where: { shareToken: 'token-123', isActive: true },
        relations: ['vehicle'],
      });
      expect(result.id).toBe('vehicle-123');
      expect(result.maintenanceHistory).toBeDefined();
    });

    it('should throw NotFoundException when share token not found', async () => {
      vehicleShareRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getPublicVehicleInfo('invalid-token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when share token expired', async () => {
      const expiredShare = {
        ...mockVehicleShare,
        expiresAt: new Date(Date.now() - 1000),
      };
      vehicleShareRepository.findOne.mockResolvedValue(expiredShare as any);

      await expect(service.getPublicVehicleInfo('token-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when vehicle is sold', async () => {
      const soldVehicle = { ...mockVehicle, status: VehicleStatus.SOLD };
      const shareWithSoldVehicle = {
        ...mockVehicleShare,
        vehicle: soldVehicle,
      };
      vehicleShareRepository.findOne.mockResolvedValue(
        shareWithSoldVehicle as any,
      );

      await expect(service.getPublicVehicleInfo('token-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should increment view count', async () => {
      vehicleShareRepository.findOne.mockResolvedValue(mockVehicleShare as any);
      vehicleServiceService.findByVehicleId.mockResolvedValue([]);
      vehicleShareRepository.save.mockResolvedValue({
        ...mockVehicleShare,
        viewCount: 1,
      } as any);

      await service.getPublicVehicleInfo('token-123');

      expect(vehicleShareRepository.save).toHaveBeenCalled();
    });
  });

  describe('getPublicMaintenanceHistory', () => {
    it('should return maintenance history with attachments when includeAttachments is true', async () => {
      vehicleServiceService.findByVehicleId.mockResolvedValue([
        mockService,
      ] as any);

      const result = await (service as any).getPublicMaintenanceHistory(
        'vehicle-123',
        true,
      );

      expect(result).toHaveLength(1);
      expect(result[0].attachments).toBeDefined();
    });

    it('should return maintenance history without attachments when includeAttachments is false', async () => {
      vehicleServiceService.findByVehicleId.mockResolvedValue([
        mockService,
      ] as any);

      const result = await (service as any).getPublicMaintenanceHistory(
        'vehicle-123',
        false,
      );

      expect(result).toHaveLength(1);
      expect(result[0].attachments).toBeUndefined();
    });
  });

  describe('deactivateShareToken', () => {
    it('should deactivate share token successfully', async () => {
      vehicleShareRepository.findOne.mockResolvedValue(mockVehicleShare as any);
      vehicleService.findVehicleById.mockResolvedValue(mockVehicle as any);
      vehicleShareRepository.save.mockResolvedValue({
        ...mockVehicleShare,
        isActive: false,
      } as any);

      await service.deactivateShareToken('token-123', 'user-123');

      expect(vehicleShareRepository.findOne).toHaveBeenCalledWith({
        where: { shareToken: 'token-123' },
        relations: ['vehicle'],
      });
      expect(vehicleService.findVehicleById).toHaveBeenCalledWith(
        'vehicle-123',
        'user-123',
      );
      expect(vehicleShareRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when share token not found', async () => {
      vehicleShareRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deactivateShareToken('invalid-token', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserShareTokens', () => {
    it('should return user share tokens', async () => {
      const shares = [mockVehicleShare];
      vehicleShareRepository.find.mockResolvedValue(shares as any);

      const result = await service.getUserShareTokens('user-123');

      expect(vehicleShareRepository.find).toHaveBeenCalledWith({
        where: { vehicle: { userId: 'user-123' } },
        relations: ['vehicle'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(shares);
    });
  });

  describe('mapServiceType', () => {
    it('should map service types correctly', () => {
      expect((service as any).mapServiceType(ServiceType.MAINTENANCE)).toBe(
        'Manutenção',
      );
      expect((service as any).mapServiceType(ServiceType.REPAIR)).toBe(
        'Reparo',
      );
      expect((service as any).mapServiceType(ServiceType.INSPECTION)).toBe(
        'Inspeção',
      );
      expect((service as any).mapServiceType(ServiceType.FUEL)).toBe(
        'Combustível',
      );
      expect((service as any).mapServiceType(ServiceType.EXPENSE)).toBe(
        'Despesa',
      );
      expect((service as any).mapServiceType(ServiceType.OTHER)).toBe('Outro');
    });
  });

  describe('mapBlockchainStatus', () => {
    it('should map blockchain status correctly', () => {
      expect((service as any).mapBlockchainStatus(ServiceStatus.PENDING)).toBe(
        'Pendente',
      );
      expect(
        (service as any).mapBlockchainStatus(ServiceStatus.CONFIRMED),
      ).toBe('Confirmado');
      expect((service as any).mapBlockchainStatus(ServiceStatus.REJECTED)).toBe(
        'Rejeitado',
      );
      expect((service as any).mapBlockchainStatus(ServiceStatus.EXPIRED)).toBe(
        'Expirado',
      );
    });
  });

  describe('getFileNameFromUrl', () => {
    it('should extract file name from URL', () => {
      expect(
        (service as any).getFileNameFromUrl('https://example.com/file.pdf'),
      ).toBe('file.pdf');
      expect((service as any).getFileNameFromUrl('')).toBe('Arquivo');
      expect((service as any).getFileNameFromUrl(null)).toBe('Arquivo');
    });
  });

  describe('getFileTypeFromUrl', () => {
    it('should extract file type from URL', () => {
      expect((service as any).getFileTypeFromUrl('file.pdf')).toBe(
        'application/pdf',
      );
      expect((service as any).getFileTypeFromUrl('file.jpg')).toBe('image');
      expect((service as any).getFileTypeFromUrl('file.png')).toBe('image');
      expect((service as any).getFileTypeFromUrl('file.doc')).toBe(
        'application/msword',
      );
      expect((service as any).getFileTypeFromUrl('file.unknown')).toBe(
        'unknown',
      );
      expect((service as any).getFileTypeFromUrl('')).toBe('unknown');
    });
  });
});
