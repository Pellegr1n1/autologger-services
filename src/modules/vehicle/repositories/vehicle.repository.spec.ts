import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleRepository } from './vehicle.repository';
import { Vehicle } from '../entities/vehicle.entity';
import { VehicleStatus } from '../enums/vehicle-status.enum';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';

describe('VehicleRepository', () => {
  let repository: VehicleRepository;
  let vehicleRepository: jest.Mocked<Repository<Vehicle>>;

  const mockVehicle = {
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
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleRepository,
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<VehicleRepository>(VehicleRepository);
    vehicleRepository = module.get(getRepositoryToken(Vehicle));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create vehicle successfully', async () => {
      const createVehicleDto: CreateVehicleDto = {
        plate: 'ABC1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Branco',
        mileage: 50000,
      };

      vehicleRepository.create.mockReturnValue(mockVehicle as any);
      vehicleRepository.save.mockResolvedValue(mockVehicle as any);

      const result = await repository.create(createVehicleDto, 'user-123');

      expect(vehicleRepository.create).toHaveBeenCalledWith({
        ...createVehicleDto,
        userId: 'user-123',
        mileage: 50000,
      });
      expect(vehicleRepository.save).toHaveBeenCalledWith(mockVehicle);
      expect(result).toEqual(mockVehicle);
    });

    it('should create vehicle with default mileage 0', async () => {
      const createVehicleDto: CreateVehicleDto = {
        plate: 'ABC1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Branco',
      };

      vehicleRepository.create.mockReturnValue(mockVehicle as any);
      vehicleRepository.save.mockResolvedValue(mockVehicle as any);

      await repository.create(createVehicleDto, 'user-123');

      expect(vehicleRepository.create).toHaveBeenCalledWith({
        ...createVehicleDto,
        userId: 'user-123',
        mileage: 0,
      });
    });
  });

  describe('findById', () => {
    it('should find vehicle by id', async () => {
      vehicleRepository.findOne.mockResolvedValue(mockVehicle as any);

      const result = await repository.findById('vehicle-123');

      expect(vehicleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'vehicle-123' },
        relations: ['user'],
      });
      expect(result).toEqual(mockVehicle);
    });

    it('should return null when vehicle not found', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById('vehicle-999');

      expect(result).toBeNull();
    });
  });

  describe('findByIdAndUserId', () => {
    it('should find vehicle by id and user id', async () => {
      vehicleRepository.findOne.mockResolvedValue(mockVehicle as any);

      const result = await repository.findByIdAndUserId(
        'vehicle-123',
        'user-123',
      );

      expect(vehicleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'vehicle-123', userId: 'user-123' },
        relations: ['user'],
      });
      expect(result).toEqual(mockVehicle);
    });

    it('should return null when vehicle not found', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByIdAndUserId(
        'vehicle-123',
        'user-999',
      );

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find vehicles by user id', async () => {
      const vehicles = [mockVehicle];
      vehicleRepository.find.mockResolvedValue(vehicles as any);

      const result = await repository.findByUserId('user-123');

      expect(vehicleRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(vehicles);
    });
  });

  describe('findActiveByUserId', () => {
    it('should find active vehicles by user id', async () => {
      const vehicles = [mockVehicle];
      vehicleRepository.find.mockResolvedValue(vehicles as any);

      const result = await repository.findActiveByUserId('user-123');

      expect(vehicleRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: VehicleStatus.ACTIVE },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(vehicles);
    });
  });

  describe('findSoldByUserId', () => {
    it('should find sold vehicles by user id', async () => {
      const soldVehicle = {
        ...mockVehicle,
        status: VehicleStatus.SOLD,
        soldAt: new Date(),
      };
      const vehicles = [soldVehicle];
      vehicleRepository.find.mockResolvedValue(vehicles as any);

      const result = await repository.findSoldByUserId('user-123');

      expect(vehicleRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: VehicleStatus.SOLD },
        order: { soldAt: 'DESC' },
      });
      expect(result).toEqual(vehicles);
    });
  });

  describe('countActiveByUserId', () => {
    it('should count active vehicles by user id', async () => {
      vehicleRepository.count.mockResolvedValue(2);

      const result = await repository.countActiveByUserId('user-123');

      expect(vehicleRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: VehicleStatus.ACTIVE },
      });
      expect(result).toBe(2);
    });
  });

  describe('existsByPlate', () => {
    it('should return true when plate exists', async () => {
      vehicleRepository.count.mockResolvedValue(1);

      const result = await repository.existsByPlate('ABC1234');

      expect(vehicleRepository.count).toHaveBeenCalledWith({
        where: { plate: 'ABC1234' },
      });
      expect(result).toBe(true);
    });

    it('should return false when plate does not exist', async () => {
      vehicleRepository.count.mockResolvedValue(0);

      const result = await repository.existsByPlate('XYZ9999');

      expect(result).toBe(false);
    });

    it('should exclude id when excludeId is provided', async () => {
      vehicleRepository.count.mockResolvedValue(0);

      await repository.existsByPlate('ABC1234', 'vehicle-123');

      expect(vehicleRepository.count).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update vehicle successfully', async () => {
      const updateVehicleDto: UpdateVehicleDto = {
        brand: 'Honda',
      };

      const updatedVehicle = { ...mockVehicle, brand: 'Honda' };
      vehicleRepository.update.mockResolvedValue(undefined as any);
      vehicleRepository.findOne.mockResolvedValue(updatedVehicle as any);

      const result = await repository.update('vehicle-123', updateVehicleDto);

      expect(vehicleRepository.update).toHaveBeenCalledWith(
        'vehicle-123',
        updateVehicleDto,
      );
      expect(vehicleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'vehicle-123' },
        relations: ['user'],
      });
      expect(result).toEqual(updatedVehicle);
    });
  });

  describe('markAsSold', () => {
    it('should mark vehicle as sold with provided date', async () => {
      const soldAt = new Date('2024-01-01');
      const soldVehicle = {
        ...mockVehicle,
        status: VehicleStatus.SOLD,
        soldAt,
      };

      vehicleRepository.update.mockResolvedValue(undefined as any);
      vehicleRepository.findOne.mockResolvedValue(soldVehicle as any);

      const result = await repository.markAsSold('vehicle-123', soldAt);

      expect(vehicleRepository.update).toHaveBeenCalledWith('vehicle-123', {
        status: VehicleStatus.SOLD,
        soldAt,
      });
      expect(result).toEqual(soldVehicle);
    });

    it('should mark vehicle as sold with current date when soldAt not provided', async () => {
      const soldVehicle = {
        ...mockVehicle,
        status: VehicleStatus.SOLD,
        soldAt: new Date(),
      };

      vehicleRepository.update.mockResolvedValue(undefined as any);
      vehicleRepository.findOne.mockResolvedValue(soldVehicle as any);

      const result = await repository.markAsSold('vehicle-123');

      expect(vehicleRepository.update).toHaveBeenCalled();
      expect(result.status).toBe(VehicleStatus.SOLD);
      expect(result.soldAt).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete vehicle successfully', async () => {
      vehicleRepository.delete.mockResolvedValue(undefined as any);

      await repository.delete('vehicle-123');

      expect(vehicleRepository.delete).toHaveBeenCalledWith('vehicle-123');
    });
  });

  describe('findByStatus', () => {
    it('should find vehicles by status', async () => {
      const vehicles = [mockVehicle];
      vehicleRepository.find.mockResolvedValue(vehicles as any);

      const result = await repository.findByStatus(VehicleStatus.ACTIVE);

      expect(vehicleRepository.find).toHaveBeenCalledWith({
        where: { status: VehicleStatus.ACTIVE },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(vehicles);
    });
  });
});
