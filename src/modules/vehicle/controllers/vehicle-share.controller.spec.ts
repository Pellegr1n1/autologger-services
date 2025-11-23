import { Test, TestingModule } from '@nestjs/testing';
import { VehicleShareController } from './vehicle-share.controller';
import { VehicleShareService } from '../services/vehicle-share.service';
import { UserResponseDto } from '../../user/dto/user-response.dto';

describe('VehicleShareController', () => {
  let controller: VehicleShareController;
  let vehicleShareService: jest.Mocked<VehicleShareService>;

  const mockUser: UserResponseDto = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    authProvider: 'local',
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockShareResponse = {
    shareToken: 'token-123',
    shareUrl: 'http://localhost:3000/vehicles/share/token-123',
    expiresAt: new Date(),
    isActive: true,
  };

  const mockPublicVehicleInfo = {
    id: 'vehicle-123',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    color: 'Branco',
    mileage: 50000,
    status: 'active',
    createdAt: new Date(),
    photoUrl: null,
    maintenanceHistory: [],
  };

  beforeEach(async () => {
    const mockVehicleShareService = {
      generateShareToken: jest.fn(),
      getPublicVehicleInfo: jest.fn(),
      deactivateShareToken: jest.fn(),
      getUserShareTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleShareController],
      providers: [
        {
          provide: VehicleShareService,
          useValue: mockVehicleShareService,
        },
      ],
    }).compile();

    controller = module.get<VehicleShareController>(VehicleShareController);
    vehicleShareService = module.get(VehicleShareService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateShareLink', () => {
    it('should generate share link successfully', async () => {
      vehicleShareService.generateShareToken.mockResolvedValue(
        mockShareResponse as any,
      );

      const result = await controller.generateShareLink(
        'vehicle-123',
        mockUser,
        '30',
        'false',
      );

      expect(vehicleShareService.generateShareToken).toHaveBeenCalledWith(
        'vehicle-123',
        mockUser.id,
        30,
        false,
      );
      expect(result).toEqual(mockShareResponse);
    });

    it('should generate share link with default expiration', async () => {
      vehicleShareService.generateShareToken.mockResolvedValue(
        mockShareResponse as any,
      );

      const result = await controller.generateShareLink(
        'vehicle-123',
        mockUser,
      );

      expect(vehicleShareService.generateShareToken).toHaveBeenCalledWith(
        'vehicle-123',
        mockUser.id,
        30,
        false,
      );
      expect(result).toEqual(mockShareResponse);
    });

    it('should generate share link with includeAttachments true', async () => {
      vehicleShareService.generateShareToken.mockResolvedValue(
        mockShareResponse as any,
      );

      const result = await controller.generateShareLink(
        'vehicle-123',
        mockUser,
        '60',
        'true',
      );

      expect(vehicleShareService.generateShareToken).toHaveBeenCalledWith(
        'vehicle-123',
        mockUser.id,
        60,
        true,
      );
      expect(result).toEqual(mockShareResponse);
    });
  });

  describe('getPublicVehicleInfo', () => {
    it('should return public vehicle info successfully', async () => {
      vehicleShareService.getPublicVehicleInfo.mockResolvedValue(
        mockPublicVehicleInfo as any,
      );

      const result = await controller.getPublicVehicleInfo('token-123');

      expect(vehicleShareService.getPublicVehicleInfo).toHaveBeenCalledWith(
        'token-123',
      );
      expect(result).toEqual(mockPublicVehicleInfo);
    });
  });

  describe('deactivateShareLink', () => {
    it('should deactivate share link successfully', async () => {
      vehicleShareService.deactivateShareToken.mockResolvedValue(undefined);

      await controller.deactivateShareLink('token-123', mockUser);

      expect(vehicleShareService.deactivateShareToken).toHaveBeenCalledWith(
        'token-123',
        mockUser.id,
      );
    });
  });

  describe('getMyShareLinks', () => {
    it('should return user share links', async () => {
      const shareLinks = [
        {
          id: 'share-1',
          shareToken: 'token-123',
          vehicleId: 'vehicle-123',
          isActive: true,
          createdAt: new Date(),
        },
      ];

      vehicleShareService.getUserShareTokens.mockResolvedValue(
        shareLinks as any,
      );

      const result = await controller.getMyShareLinks(mockUser);

      expect(vehicleShareService.getUserShareTokens).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result).toEqual(shareLinks);
    });
  });
});
