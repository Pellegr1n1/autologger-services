import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { VehicleRepository } from '../repositories/vehicle.repository';
import { VehicleBusinessRulesService } from './vehicle-business-rules.service';
import { VehicleFactory } from '../factories/vehicle.factory';
import { FileUploadService } from './file-upload.service';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { MarkVehicleSoldDto } from '../dto/mark-vehicle-sold.dto';
import { VehicleStatus } from '../enums/vehicle-status.enum';

describe('VehicleService', () => {
  let service: VehicleService;
  let repository: jest.Mocked<VehicleRepository>;
  let businessRules: jest.Mocked<VehicleBusinessRulesService>;
  let vehicleFactory: jest.Mocked<VehicleFactory>;
  let fileUploadService: jest.Mocked<FileUploadService>;

  const mockVehicle = {
    id: 'vehicle-123',
    brand: 'Toyota',
    model: 'Corolla',
    plate: 'ABC1234',
    year: 2020,
    mileage: 50000,
    userId: 'user-123',
    status: 'active',
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockResponseDto = {
    id: 'vehicle-123',
    brand: 'Toyota',
    model: 'Corolla',
    plate: 'ABC1234',
    year: 2020,
    color: 'Branco',
    mileage: 50000,
    status: VehicleStatus.ACTIVE,
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findActiveByUserId: jest.fn(),
      findSoldByUserId: jest.fn(),
      findByIdAndUserId: jest.fn(),
      update: jest.fn(),
      markAsSold: jest.fn(),
      countActiveByUserId: jest.fn(),
      delete: jest.fn(),
    };

    const mockBusinessRules = {
      validateActiveVehicleLimit: jest.fn(),
      validateUniquePlate: jest.fn(),
      validateVehicleOwnership: jest.fn(),
      validateVehicleCanBeUpdated: jest.fn(),
      validateVehicleCanBeSold: jest.fn(),
    };

    const mockVehicleFactory = {
      toResponseDto: jest.fn(),
    };

    const mockFileUploadService = {
      uploadPhoto: jest.fn(),
      deletePhoto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        {
          provide: VehicleRepository,
          useValue: mockRepository,
        },
        {
          provide: VehicleBusinessRulesService,
          useValue: mockBusinessRules,
        },
        {
          provide: VehicleFactory,
          useValue: mockVehicleFactory,
        },
        {
          provide: FileUploadService,
          useValue: mockFileUploadService,
        },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
    repository = module.get(VehicleRepository);
    businessRules = module.get(VehicleBusinessRulesService);
    vehicleFactory = module.get(VehicleFactory);
    fileUploadService = module.get(FileUploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVehicle', () => {
    it('should create vehicle successfully', async () => {
      const createVehicleDto: CreateVehicleDto = {
        brand: 'Toyota',
        model: 'Corolla',
        plate: 'ABC1234',
        year: 2020,
        color: 'Branco',
        mileage: 50000,
      };

      businessRules.validateActiveVehicleLimit.mockResolvedValue(undefined);
      businessRules.validateUniquePlate.mockResolvedValue(undefined);
      fileUploadService.uploadPhoto.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockVehicle as any);
      vehicleFactory.toResponseDto.mockReturnValue(mockResponseDto);

      const result = await service.createVehicle(
        createVehicleDto,
        'user-123',
      );

      expect(businessRules.validateActiveVehicleLimit).toHaveBeenCalledWith(
        'user-123',
      );
      expect(businessRules.validateUniquePlate).toHaveBeenCalledWith(
        'ABC1234',
      );
      expect(repository.create).toHaveBeenCalled();
      expect(result).toEqual(mockResponseDto);
    });

    it('should upload photo when provided', async () => {
      const createVehicleDto: CreateVehicleDto = {
        brand: 'Toyota',
        model: 'Corolla',
        plate: 'ABC1234',
        year: 2020,
        color: 'Branco',
        mileage: 50000,
        photo: { buffer: Buffer.from('test') } as any,
      };

      businessRules.validateActiveVehicleLimit.mockResolvedValue(undefined);
      businessRules.validateUniquePlate.mockResolvedValue(undefined);
      fileUploadService.uploadPhoto.mockResolvedValue('photo-url');
      repository.create.mockResolvedValue(mockVehicle as any);
      vehicleFactory.toResponseDto.mockReturnValue(mockResponseDto);

      await service.createVehicle(createVehicleDto, 'user-123');

      expect(fileUploadService.uploadPhoto).toHaveBeenCalledWith(
        createVehicleDto.photo,
      );
    });
  });

  describe('findUserVehicles', () => {
    it('should return active and sold vehicles', async () => {
      const activeVehicles = [mockVehicle];
      const soldVehicles = [{ ...mockVehicle, status: 'sold' }];

      repository.findActiveByUserId.mockResolvedValue(activeVehicles as any);
      repository.findSoldByUserId.mockResolvedValue(soldVehicles as any);
      vehicleFactory.toResponseDto.mockReturnValue(mockResponseDto);

      const result = await service.findUserVehicles('user-123');

      expect(repository.findActiveByUserId).toHaveBeenCalledWith('user-123');
      expect(repository.findSoldByUserId).toHaveBeenCalledWith('user-123');
      expect(result).toHaveProperty('active');
      expect(result).toHaveProperty('sold');
    });
  });

  describe('findVehicleById', () => {
    it('should return vehicle when found', async () => {
      repository.findByIdAndUserId.mockResolvedValue(mockVehicle as any);
      vehicleFactory.toResponseDto.mockReturnValue(mockResponseDto);

      const result = await service.findVehicleById('vehicle-123', 'user-123');

      expect(repository.findByIdAndUserId).toHaveBeenCalledWith(
        'vehicle-123',
        'user-123',
      );
      expect(result).toEqual(mockResponseDto);
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.findVehicleById('vehicle-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateVehicle', () => {
    it('should update vehicle successfully', async () => {
      const updateVehicleDto: UpdateVehicleDto = {
        brand: 'Honda',
      };

      businessRules.validateVehicleOwnership.mockResolvedValue(undefined);
      businessRules.validateVehicleCanBeUpdated.mockResolvedValue(undefined);
      repository.findByIdAndUserId.mockResolvedValue(mockVehicle as any);
      fileUploadService.uploadPhoto.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        ...mockVehicle,
        brand: 'Honda',
      } as any);
      vehicleFactory.toResponseDto.mockReturnValue({
        ...mockResponseDto,
        brand: 'Honda',
      } as any);

      const result = await service.updateVehicle(
        'vehicle-123',
        updateVehicleDto,
        'user-123',
      );

      expect(businessRules.validateVehicleOwnership).toHaveBeenCalledWith(
        'vehicle-123',
        'user-123',
      );
      expect(result.brand).toBe('Honda');
    });

    it('should delete old photo when new photo is uploaded', async () => {
      const updateVehicleDto: UpdateVehicleDto = {
        photo: { buffer: Buffer.from('test') } as any,
      };

      const vehicleWithPhoto = {
        ...mockVehicle,
        photoUrl: 'old-photo-url',
      };

      businessRules.validateVehicleOwnership.mockResolvedValue(undefined);
      businessRules.validateVehicleCanBeUpdated.mockResolvedValue(undefined);
      repository.findByIdAndUserId.mockResolvedValue(vehicleWithPhoto as any);
      fileUploadService.deletePhoto.mockResolvedValue(undefined);
      fileUploadService.uploadPhoto.mockResolvedValue('new-photo-url');
      repository.update.mockResolvedValue(mockVehicle as any);
      vehicleFactory.toResponseDto.mockReturnValue(mockResponseDto);

      await service.updateVehicle('vehicle-123', updateVehicleDto, 'user-123');

      expect(fileUploadService.deletePhoto).toHaveBeenCalledWith(
        'old-photo-url',
      );
      expect(fileUploadService.uploadPhoto).toHaveBeenCalled();
    });
  });

  describe('markVehicleAsSold', () => {
    it('should mark vehicle as sold successfully', async () => {
      const markVehicleSoldDto: MarkVehicleSoldDto = {
        soldAt: '2024-01-01',
      };

      businessRules.validateVehicleCanBeSold.mockResolvedValue(undefined);
      repository.markAsSold.mockResolvedValue({
        ...mockVehicle,
        status: 'sold',
      } as any);
      vehicleFactory.toResponseDto.mockReturnValue({
        ...mockResponseDto,
        status: VehicleStatus.SOLD,
      } as any);

      const result = await service.markVehicleAsSold(
        'vehicle-123',
        markVehicleSoldDto,
        'user-123',
      );

      expect(businessRules.validateVehicleCanBeSold).toHaveBeenCalledWith(
        'vehicle-123',
        'user-123',
      );
      expect(result.status).toBe('sold');
    });
  });

  describe('getActiveVehiclesCount', () => {
    it('should return count of active vehicles', async () => {
      repository.countActiveByUserId.mockResolvedValue(2);

      const result = await service.getActiveVehiclesCount('user-123');

      expect(repository.countActiveByUserId).toHaveBeenCalledWith('user-123');
      expect(result).toBe(2);
    });
  });

  describe('deleteVehicle', () => {
    it('should delete vehicle successfully', async () => {
      const vehicleWithPhoto = {
        ...mockVehicle,
        photoUrl: 'photo-url',
      };

      businessRules.validateVehicleOwnership.mockResolvedValue(undefined);
      repository.findByIdAndUserId.mockResolvedValue(vehicleWithPhoto as any);
      fileUploadService.deletePhoto.mockResolvedValue(undefined);
      repository.delete.mockResolvedValue(undefined);

      await service.deleteVehicle('vehicle-123', 'user-123');

      expect(businessRules.validateVehicleOwnership).toHaveBeenCalledWith(
        'vehicle-123',
        'user-123',
      );
      expect(fileUploadService.deletePhoto).toHaveBeenCalledWith('photo-url');
      expect(repository.delete).toHaveBeenCalledWith('vehicle-123');
    });

    it('should delete vehicle without photo', async () => {
      businessRules.validateVehicleOwnership.mockResolvedValue(undefined);
      repository.findByIdAndUserId.mockResolvedValue(mockVehicle as any);
      repository.delete.mockResolvedValue(undefined);

      await service.deleteVehicle('vehicle-123', 'user-123');

      expect(fileUploadService.deletePhoto).not.toHaveBeenCalled();
      expect(repository.delete).toHaveBeenCalledWith('vehicle-123');
    });
  });
});

