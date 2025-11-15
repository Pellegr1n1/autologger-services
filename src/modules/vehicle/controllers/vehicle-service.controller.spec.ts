import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { VehicleServiceController } from './vehicle-service.controller';
import { VehicleServiceService } from '../services/vehicle-service.service';
import { VehicleService } from '../services/vehicle.service';
import { FileUploadService } from '../services/file-upload.service';
import { CreateVehicleServiceDto } from '../dto/create-vehicle-service.dto';
import { UpdateVehicleServiceDto } from '../dto/update-vehicle-service.dto';

describe('VehicleServiceController', () => {
  let controller: VehicleServiceController;
  let vehicleServiceService: jest.Mocked<VehicleServiceService>;
  let vehicleService: jest.Mocked<VehicleService>;
  let fileUploadService: jest.Mocked<FileUploadService>;

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
    userId: 'user-123',
    status: 'active' as any,
  };

  const mockVehicleService = {
    id: 'service-123',
    vehicleId: 'vehicle-123',
    type: 'MANUTENCAO' as any,
    category: 'Oleo',
    description: 'Troca de oleo',
    serviceDate: new Date(),
    mileage: 50000,
    cost: 150,
    location: 'Oficina',
    status: 'PENDING' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockVehicleServiceService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByVehicleId: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      updateBlockchainStatus: jest.fn(),
      getServicesByType: jest.fn(),
      getServicesByStatus: jest.fn(),
      getServicesByDateRange: jest.fn(),
      getServicesByMileageRange: jest.fn(),
      getTotalCostByVehicle: jest.fn(),
      getServicesCountByVehicle: jest.fn(),
    };

    const mockVehicleService = {
      findUserVehicles: jest.fn(),
    };

    const mockFileUploadService = {
      uploadMultipleAttachments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleServiceController],
      providers: [
        {
          provide: VehicleServiceService,
          useValue: mockVehicleServiceService,
        },
        {
          provide: VehicleService,
          useValue: mockVehicleService,
        },
        {
          provide: FileUploadService,
          useValue: mockFileUploadService,
        },
      ],
    }).compile();

    controller = module.get<VehicleServiceController>(VehicleServiceController);
    vehicleServiceService = module.get(VehicleServiceService);
    vehicleService = module.get(VehicleService);
    fileUploadService = module.get(FileUploadService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create vehicle service successfully', async () => {
      const createDto: CreateVehicleServiceDto = {
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO' as any,
        category: 'Oleo',
        description: 'Troca de oleo',
        serviceDate: new Date(),
        mileage: 50000,
        cost: 150,
        location: 'Oficina',
      };

      vehicleService.findUserVehicles.mockResolvedValue({
        active: [mockVehicle] as any,
        sold: [] as any,
      });
      vehicleServiceService.create.mockResolvedValue(mockVehicleService as any);

      const result = await controller.create(createDto, { user: mockUser } as any);

      expect(vehicleService.findUserVehicles).toHaveBeenCalledWith(mockUser.id);
      expect(vehicleServiceService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockVehicleService);
    });

    it('should throw BadRequestException when user has no vehicles', async () => {
      const createDto: CreateVehicleServiceDto = {
        vehicleId: 'vehicle-123',
        type: 'MANUTENCAO' as any,
        category: 'Oleo',
        description: 'Troca de oleo',
        serviceDate: new Date(),
        mileage: 50000,
        cost: 150,
        location: 'Oficina',
      };

      vehicleService.findUserVehicles.mockResolvedValue({
        active: [] as any,
        sold: [] as any,
      });

      await expect(
        controller.create(createDto, { user: mockUser } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when vehicle does not belong to user', async () => {
      const createDto: CreateVehicleServiceDto = {
        vehicleId: 'vehicle-999',
        type: 'MANUTENCAO' as any,
        category: 'Oleo',
        description: 'Troca de oleo',
        serviceDate: new Date(),
        mileage: 50000,
        cost: 150,
        location: 'Oficina',
      };

      vehicleService.findUserVehicles.mockResolvedValue({
        active: [mockVehicle] as any,
        sold: [] as any,
      });

      await expect(
        controller.create(createDto, { user: mockUser } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadAttachments', () => {
    it('should upload attachments successfully', async () => {
      const files = [
        { originalname: 'file1.pdf', buffer: Buffer.from('test') },
        { originalname: 'file2.jpg', buffer: Buffer.from('test') },
      ] as any[];

      const uploadedUrls = ['url1', 'url2'];
      fileUploadService.uploadMultipleAttachments.mockResolvedValue(uploadedUrls);

      const result = await controller.uploadAttachments(files);

      expect(fileUploadService.uploadMultipleAttachments).toHaveBeenCalledWith(files);
      expect(result).toEqual({
        success: true,
        urls: uploadedUrls,
        count: uploadedUrls.length,
      });
    });

    it('should throw BadRequestException when no files provided', async () => {
      await expect(controller.uploadAttachments([])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when files is null', async () => {
      await expect(controller.uploadAttachments(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all services for user', async () => {
      const services = [mockVehicleService];
      vehicleServiceService.findAll.mockResolvedValue(services as any);

      const result = await controller.findAll({ user: mockUser } as any);

      expect(vehicleServiceService.findAll).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(services);
    });
  });

  describe('findByVehicleId', () => {
    it('should return services by vehicle id', async () => {
      const services = [mockVehicleService];
      vehicleServiceService.findByVehicleId.mockResolvedValue(services as any);

      const result = await controller.findByVehicleId('vehicle-123');

      expect(vehicleServiceService.findByVehicleId).toHaveBeenCalledWith('vehicle-123');
      expect(result).toEqual(services);
    });
  });

  describe('findByType', () => {
    it('should return services by type', async () => {
      const services = [mockVehicleService];
      vehicleServiceService.getServicesByType.mockResolvedValue(services as any);

      const result = await controller.findByType('MANUTENCAO', { user: mockUser } as any);

      expect(vehicleServiceService.getServicesByType).toHaveBeenCalledWith(
        'MANUTENCAO',
        mockUser.id,
      );
      expect(result).toEqual(services);
    });
  });

  describe('findByStatus', () => {
    it('should return services by status', async () => {
      const services = [mockVehicleService];
      vehicleServiceService.getServicesByStatus.mockResolvedValue(services as any);

      const result = await controller.findByStatus('PENDING', { user: mockUser } as any);

      expect(vehicleServiceService.getServicesByStatus).toHaveBeenCalledWith(
        'PENDING',
        mockUser.id,
      );
      expect(result).toEqual(services);
    });
  });

  describe('findByDateRange', () => {
    it('should return services by date range', async () => {
      const services = [mockVehicleService];
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      vehicleServiceService.getServicesByDateRange.mockResolvedValue(services as any);

      const result = await controller.findByDateRange(
        startDate,
        endDate,
        { user: mockUser } as any,
      );

      expect(vehicleServiceService.getServicesByDateRange).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
        mockUser.id,
      );
      expect(result).toEqual(services);
    });
  });

  describe('findByMileageRange', () => {
    it('should return services by mileage range', async () => {
      const services = [mockVehicleService];
      vehicleServiceService.getServicesByMileageRange.mockResolvedValue(services as any);

      const result = await controller.findByMileageRange(0, 100000);

      expect(vehicleServiceService.getServicesByMileageRange).toHaveBeenCalledWith(0, 100000);
      expect(result).toEqual(services);
    });
  });

  describe('getTotalCostByVehicle', () => {
    it('should return total cost by vehicle', async () => {
      const totalCost = 500;
      vehicleServiceService.getTotalCostByVehicle.mockResolvedValue(totalCost);

      const result = await controller.getTotalCostByVehicle('vehicle-123');

      expect(vehicleServiceService.getTotalCostByVehicle).toHaveBeenCalledWith('vehicle-123');
      expect(result).toBe(totalCost);
    });
  });

  describe('getServicesCountByVehicle', () => {
    it('should return services count by vehicle', async () => {
      const count = 5;
      vehicleServiceService.getServicesCountByVehicle.mockResolvedValue(count);

      const result = await controller.getServicesCountByVehicle('vehicle-123');

      expect(vehicleServiceService.getServicesCountByVehicle).toHaveBeenCalledWith('vehicle-123');
      expect(result).toEqual({ count });
    });
  });

  describe('findOne', () => {
    it('should return service by id', async () => {
      vehicleServiceService.findOne.mockResolvedValue(mockVehicleService as any);

      const result = await controller.findOne('service-123');

      expect(vehicleServiceService.findOne).toHaveBeenCalledWith('service-123');
      expect(result).toEqual(mockVehicleService);
    });
  });

  describe('update', () => {
    it('should update service successfully', async () => {
      const updateDto: UpdateVehicleServiceDto = {
        description: 'Nova descricao',
      };

      const updatedService = { ...mockVehicleService, description: 'Nova descricao' };
      vehicleServiceService.update.mockResolvedValue(updatedService as any);

      const result = await controller.update('service-123', updateDto);

      expect(vehicleServiceService.update).toHaveBeenCalledWith('service-123', updateDto);
      expect(result).toEqual(updatedService);
    });
  });

  describe('remove', () => {
    it('should remove service successfully', async () => {
      vehicleServiceService.remove.mockResolvedValue(undefined);

      await controller.remove('service-123');

      expect(vehicleServiceService.remove).toHaveBeenCalledWith('service-123');
    });
  });

  describe('updateBlockchainStatus', () => {
    it('should update blockchain status successfully', async () => {
      const body = {
        hash: 'hash123',
        confirmedBy: 'blockchain',
      };

      const updatedService = { ...mockVehicleService, blockchainHash: 'hash123' };
      vehicleServiceService.updateBlockchainStatus.mockResolvedValue(updatedService as any);

      const result = await controller.updateBlockchainStatus('service-123', body);

      expect(vehicleServiceService.updateBlockchainStatus).toHaveBeenCalledWith(
        'service-123',
        'hash123',
        'blockchain',
      );
      expect(result).toEqual(updatedService);
    });

    it('should update blockchain status without hash', async () => {
      const body = {
        confirmedBy: 'blockchain',
      };

      const updatedService = { ...mockVehicleService };
      vehicleServiceService.updateBlockchainStatus.mockResolvedValue(updatedService as any);

      const result = await controller.updateBlockchainStatus('service-123', body);

      expect(vehicleServiceService.updateBlockchainStatus).toHaveBeenCalledWith(
        'service-123',
        null,
        'blockchain',
      );
      expect(result).toEqual(updatedService);
    });
  });
});

