import { Test, TestingModule } from '@nestjs/testing';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from '../services/vehicle.service';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { MarkVehicleSoldDto } from '../dto/mark-vehicle-sold.dto';
import { UserResponseDto } from '../../user/dto/user-response.dto';

describe('VehicleController', () => {
  let controller: VehicleController;
  let vehicleService: jest.Mocked<VehicleService>;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockVehicle = {
    id: 'vehicle-123',
    brand: 'Toyota',
    model: 'Corolla',
    plate: 'ABC1234',
    year: 2020,
    color: 'Branco',
    mileage: 50000,
    status: 'active' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockVehicleService = {
      createVehicle: jest.fn(),
      findUserVehicles: jest.fn(),
      findVehicleById: jest.fn(),
      updateVehicle: jest.fn(),
      markVehicleAsSold: jest.fn(),
      getActiveVehiclesCount: jest.fn(),
      deleteVehicle: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleController],
      providers: [
        {
          provide: VehicleService,
          useValue: mockVehicleService,
        },
      ],
    }).compile();

    controller = module.get<VehicleController>(VehicleController);
    vehicleService = module.get(VehicleService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
      } as any;

      vehicleService.createVehicle.mockResolvedValue(mockVehicle as any);

      const result = await controller.createVehicle(
        createVehicleDto,
        mockUser as any,
      );

      expect(vehicleService.createVehicle).toHaveBeenCalled();
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('getUserVehicles', () => {
    it('should return user vehicles', async () => {
      const vehicles = {
        active: [mockVehicle] as any,
        sold: [] as any,
      };

      vehicleService.findUserVehicles.mockResolvedValue(vehicles);

      const result = await controller.getUserVehicles(mockUser as any);

      expect(vehicleService.findUserVehicles).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result).toEqual(vehicles);
    });
  });

  describe('getVehicleById', () => {
    it('should return vehicle by id', async () => {
      vehicleService.findVehicleById.mockResolvedValue(mockVehicle as any);

      const result = await controller.getVehicleById(
        'vehicle-123',
        mockUser as any,
      );

      expect(vehicleService.findVehicleById).toHaveBeenCalledWith(
        'vehicle-123',
        mockUser.id,
      );
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('updateVehicle', () => {
    it('should update vehicle successfully', async () => {
      const updateVehicleDto: UpdateVehicleDto = {
        brand: 'Honda',
      };

      const updatedVehicle = { ...mockVehicle, brand: 'Honda' };
      vehicleService.updateVehicle.mockResolvedValue(updatedVehicle as any);

      const result = await controller.updateVehicle(
        'vehicle-123',
        updateVehicleDto,
        mockUser as any,
      );

      expect(vehicleService.updateVehicle).toHaveBeenCalled();
      expect(result.brand).toBe('Honda');
    });
  });

  describe('markVehicleAsSold', () => {
    it('should mark vehicle as sold', async () => {
      const markVehicleSoldDto: MarkVehicleSoldDto = {
        soldAt: '2024-01-01',
      };

      const soldVehicle = { ...mockVehicle, status: 'sold' as any };
      vehicleService.markVehicleAsSold.mockResolvedValue(soldVehicle as any);

      const result = await controller.markVehicleAsSold(
        'vehicle-123',
        markVehicleSoldDto,
        mockUser as any,
      );

      expect(vehicleService.markVehicleAsSold).toHaveBeenCalled();
      expect(result.status).toBe('sold');
    });
  });

  describe('getActiveVehiclesStats', () => {
    it('should return active vehicles stats', async () => {
      vehicleService.getActiveVehiclesCount.mockResolvedValue(1);

      const result = await controller.getActiveVehiclesStats(mockUser as any);

      expect(vehicleService.getActiveVehiclesCount).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result).toEqual({
        count: 1,
        limit: 2,
        canAddMore: true,
      });
    });
  });

  describe('deleteVehicle', () => {
    it('should delete vehicle successfully', async () => {
      vehicleService.deleteVehicle.mockResolvedValue(undefined);

      await controller.deleteVehicle('vehicle-123', mockUser as any);

      expect(vehicleService.deleteVehicle).toHaveBeenCalledWith(
        'vehicle-123',
        mockUser.id,
      );
    });
  });
});

