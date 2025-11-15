import { Test, TestingModule } from '@nestjs/testing';
import { VehicleFactory } from './vehicle.factory';
import { Vehicle } from '../entities/vehicle.entity';
import { VehicleResponseDto } from '../dto/vehicle-response.dto';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { VehicleStatus } from '../enums/vehicle-status.enum';

describe('VehicleFactory', () => {
  let factory: VehicleFactory;
  let mockStorage: any;

  const mockVehicle: Vehicle = {
    id: 'vehicle-123',
    plate: 'ABC1234',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    color: 'Branco',
    mileage: 50000,
    userId: 'user-123',
    status: VehicleStatus.ACTIVE,
    photoUrl: null,
    soldAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: null,
  };

  beforeEach(async () => {
    mockStorage = {
      upload: jest.fn(),
      delete: jest.fn(),
      isConfigured: jest.fn().mockReturnValue(true),
      getAccessibleUrl: jest.fn().mockImplementation((url: string) => Promise.resolve(url)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleFactory,
        {
          provide: 'STORAGE',
          useValue: mockStorage,
        },
      ],
    }).compile();

    factory = module.get<VehicleFactory>(VehicleFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('toResponseDto', () => {
    it('should convert vehicle to response dto', async () => {
      const result = await factory.toResponseDto(mockVehicle);

      expect(result).toBeInstanceOf(VehicleResponseDto);
      expect(result.id).toBe(mockVehicle.id);
      expect(result.plate).toBe(mockVehicle.plate);
      expect(result.brand).toBe(mockVehicle.brand);
      expect(result.model).toBe(mockVehicle.model);
      expect(result.year).toBe(mockVehicle.year);
      expect(result.color).toBe(mockVehicle.color);
      expect(result.mileage).toBe(mockVehicle.mileage);
      expect(result.status).toBe(mockVehicle.status);
    });
  });

  describe('fromCreateDto', () => {
    it('should convert create dto to vehicle partial', () => {
      const createVehicleDto: CreateVehicleDto = {
        plate: 'abc-1234',
        brand: 'toyota',
        model: 'corolla',
        year: 2020,
        color: 'branco',
        mileage: 50000,
      };

      const result = factory.fromCreateDto(createVehicleDto, 'user-123');

      expect(result.plate).toBe('ABC1234');
      expect(result.brand).toBe('Toyota');
      expect(result.model).toBe('Corolla');
      expect(result.color).toBe('Branco');
      expect(result.year).toBe(2020);
      expect(result.mileage).toBe(50000);
      expect(result.status).toBe(VehicleStatus.ACTIVE);
      expect(result.userId).toBe('user-123');
    });

    it('should use default mileage 0 when not provided', () => {
      const createVehicleDto: CreateVehicleDto = {
        plate: 'ABC1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Branco',
      };

      const result = factory.fromCreateDto(createVehicleDto, 'user-123');

      expect(result.mileage).toBe(0);
    });
  });

  describe('toResponseDtoArray', () => {
    it('should convert array of vehicles to response dto array', async () => {
      const vehicles = [mockVehicle, { ...mockVehicle, id: 'vehicle-456' }];
      const result = await factory.toResponseDtoArray(vehicles);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(VehicleResponseDto);
      expect(result[1]).toBeInstanceOf(VehicleResponseDto);
    });
  });

  describe('createVehicle', () => {
    it('should create vehicle from partial data', () => {
      const data = {
        plate: 'ABC1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
      };

      const result = factory.createVehicle(data);

      expect(result).toBeInstanceOf(Vehicle);
      expect(result.plate).toBe('ABC1234');
      expect(result.brand).toBe('Toyota');
      expect(result.model).toBe('Corolla');
      expect(result.year).toBe(2020);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should use provided dates when available', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');
      const data = {
        plate: 'ABC1234',
        createdAt,
        updatedAt,
      };

      const result = factory.createVehicle(data);

      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });
  });

  describe('formatPlate', () => {
    it('should format old format plate correctly', () => {
      expect(factory.formatPlate('ABC1234')).toBe('ABC-1234');
    });

    it('should keep Mercosul format plate', () => {
      expect(factory.formatPlate('ABC1D23')).toBe('ABC1D23');
    });

    it('should clean plate and format old format', () => {
      expect(factory.formatPlate('abc-1234')).toBe('ABC-1234');
    });

    it('should return cleaned plate when format does not match', () => {
      expect(factory.formatPlate('ABC123')).toBe('ABC123');
    });
  });

  describe('isValidPlate', () => {
    it('should validate old format plate', () => {
      expect(factory.isValidPlate('ABC1234')).toBe(true);
      expect(factory.isValidPlate('abc1234')).toBe(true);
      expect(factory.isValidPlate('ABC-1234')).toBe(true);
    });

    it('should validate Mercosul format plate', () => {
      expect(factory.isValidPlate('ABC1D23')).toBe(true);
      expect(factory.isValidPlate('abc1d23')).toBe(true);
    });

    it('should return false for invalid plates', () => {
      expect(factory.isValidPlate('ABC123')).toBe(false);
      expect(factory.isValidPlate('ABC12345')).toBe(false);
      expect(factory.isValidPlate('AB1D23')).toBe(false);
    });
  });

  describe('getVehicleSummary', () => {
    it('should return vehicle summary', () => {
      const result = factory.getVehicleSummary(mockVehicle);

      expect(result).toBe('Toyota Corolla 2020 - ABC1234');
    });
  });

  describe('isActive', () => {
    it('should return true for active vehicle', () => {
      expect(factory.isActive(mockVehicle)).toBe(true);
    });

    it('should return false for sold vehicle', () => {
      const soldVehicle = { ...mockVehicle, status: VehicleStatus.SOLD };
      expect(factory.isActive(soldVehicle)).toBe(false);
    });
  });

  describe('isSold', () => {
    it('should return true for sold vehicle', () => {
      const soldVehicle = { ...mockVehicle, status: VehicleStatus.SOLD };
      expect(factory.isSold(soldVehicle)).toBe(true);
    });

    it('should return false for active vehicle', () => {
      expect(factory.isSold(mockVehicle)).toBe(false);
    });
  });

  describe('formatMileage', () => {
    it('should format mileage correctly', () => {
      expect(factory.formatMileage(50000)).toBe('50.000 km');
      expect(factory.formatMileage(1000)).toBe('1.000 km');
      expect(factory.formatMileage(0)).toBe('0 km');
    });
  });

  describe('getVehicleAge', () => {
    it('should calculate vehicle age correctly', () => {
      const currentYear = new Date().getFullYear();
      const year = 2020;
      const expectedAge = currentYear - year;

      expect(factory.getVehicleAge(year)).toBe(expectedAge);
    });
  });

  describe('normalizeVehicleData', () => {
    it('should normalize vehicle data', () => {
      const data = {
        plate: 'abc-1234',
        brand: 'toyota',
        model: 'corolla',
        color: 'branco',
        year: 2020,
      };

      const result = factory.normalizeVehicleData(data);

      expect(result.plate).toBe('ABC1234');
      expect(result.brand).toBe('Toyota');
      expect(result.model).toBe('Corolla');
      expect(result.color).toBe('Branco');
      expect(result.year).toBe(2020);
    });

    it('should handle undefined values', () => {
      const data = {
        plate: 'ABC1234',
        brand: undefined,
      };

      const result = factory.normalizeVehicleData(data);

      expect(result.plate).toBe('ABC1234');
      expect(result.brand).toBeUndefined();
    });
  });
});

