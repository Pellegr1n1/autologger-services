import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { VehicleBusinessRulesService } from './vehicle-business-rules.service';
import { VehicleRepository } from '../repositories/vehicle.repository';

describe('VehicleBusinessRulesService', () => {
  let service: VehicleBusinessRulesService;
  let repository: jest.Mocked<VehicleRepository>;

  beforeEach(async () => {
    const mockRepository = {
      countActiveByUserId: jest.fn(),
      existsByPlate: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleBusinessRulesService,
        {
          provide: VehicleRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<VehicleBusinessRulesService>(
      VehicleBusinessRulesService,
    );
    repository = module.get(VehicleRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateActiveVehicleLimit', () => {
    it('should pass when user has less than 2 active vehicles', async () => {
      repository.countActiveByUserId.mockResolvedValue(1);

      await expect(
        service.validateActiveVehicleLimit('user-123'),
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException when user has 2 active vehicles', async () => {
      repository.countActiveByUserId.mockResolvedValue(2);

      await expect(
        service.validateActiveVehicleLimit('user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user has more than 2 active vehicles', async () => {
      repository.countActiveByUserId.mockResolvedValue(3);

      await expect(
        service.validateActiveVehicleLimit('user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateUniquePlate', () => {
    it('should pass when plate does not exist', async () => {
      repository.existsByPlate.mockResolvedValue(false);

      await expect(
        service.validateUniquePlate('ABC1234'),
      ).resolves.not.toThrow();
    });

    it('should throw ConflictException when plate exists', async () => {
      repository.existsByPlate.mockResolvedValue(true);

      await expect(service.validateUniquePlate('ABC1234')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should pass when plate exists but is for the same vehicle', async () => {
      repository.existsByPlate.mockResolvedValue(false);

      await expect(
        service.validateUniquePlate('ABC1234', 'vehicle-123'),
      ).resolves.not.toThrow();
    });
  });

  describe('validateVehicleOwnership', () => {
    it('should pass when vehicle belongs to user', async () => {
      const vehicle = {
        id: 'vehicle-123',
        userId: 'user-123',
      };

      repository.findByIdAndUserId.mockResolvedValue(vehicle as any);

      await expect(
        service.validateVehicleOwnership('vehicle-123', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException when vehicle does not belong to user', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.validateVehicleOwnership('vehicle-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateVehicleCanBeUpdated', () => {
    it('should pass when vehicle exists', async () => {
      const vehicle = {
        id: 'vehicle-123',
      };

      repository.findById.mockResolvedValue(vehicle as any);

      await expect(
        service.validateVehicleCanBeUpdated('vehicle-123'),
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException when vehicle does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.validateVehicleCanBeUpdated('vehicle-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateVehicleCanBeSold', () => {
    it('should pass when vehicle can be sold', async () => {
      const vehicle = {
        id: 'vehicle-123',
        userId: 'user-123',
        status: 'active',
      };

      repository.findByIdAndUserId.mockResolvedValue(vehicle as any);

      await expect(
        service.validateVehicleCanBeSold('vehicle-123', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException when vehicle is already sold', async () => {
      const vehicle = {
        id: 'vehicle-123',
        userId: 'user-123',
        status: 'sold',
      };

      repository.findByIdAndUserId.mockResolvedValue(vehicle as any);

      await expect(
        service.validateVehicleCanBeSold('vehicle-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when vehicle does not belong to user', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.validateVehicleCanBeSold('vehicle-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

