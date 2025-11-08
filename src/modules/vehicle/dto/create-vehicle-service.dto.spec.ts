import { validate } from 'class-validator';
import { CreateVehicleServiceDto } from './create-vehicle-service.dto';
import { ServiceType } from '../entities/vehicle-service.entity';

describe('CreateVehicleServiceDto', () => {
  it('should be defined', () => {
    expect(CreateVehicleServiceDto).toBeDefined();
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = new CreateVehicleServiceDto();
      dto.vehicleId = 'vehicle-123';
      dto.type = ServiceType.MAINTENANCE;
      dto.category = 'Oleo';
      dto.description = 'Troca de oleo';
      dto.serviceDate = new Date();
      dto.mileage = 50000;
      dto.cost = 150.0;
      dto.location = 'Oficina';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when vehicleId is missing', async () => {
      const dto = new CreateVehicleServiceDto();
      dto.type = ServiceType.MAINTENANCE;
      dto.category = 'Oleo';
      dto.description = 'Troca de oleo';
      dto.serviceDate = new Date();
      dto.mileage = 50000;
      dto.cost = 150.0;
      dto.location = 'Oficina';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('vehicleId');
    });

    it('should fail validation when type is invalid', async () => {
      const dto = new CreateVehicleServiceDto();
      dto.vehicleId = 'vehicle-123';
      (dto as any).type = 'INVALID_TYPE';
      dto.category = 'Oleo';
      dto.description = 'Troca de oleo';
      dto.serviceDate = new Date();
      dto.mileage = 50000;
      dto.cost = 150.0;
      dto.location = 'Oficina';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('type');
    });

    it('should pass validation with optional fields', async () => {
      const dto = new CreateVehicleServiceDto();
      dto.vehicleId = 'vehicle-123';
      dto.type = ServiceType.MAINTENANCE;
      dto.category = 'Oleo';
      dto.description = 'Troca de oleo';
      dto.serviceDate = new Date();
      dto.mileage = 50000;
      dto.cost = 150.0;
      dto.location = 'Oficina';
      dto.attachments = ['url1', 'url2'];
      dto.technician = 'João';
      dto.warranty = true;
      dto.nextServiceDate = new Date();
      dto.notes = 'Observações';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when serviceDate is not a date', async () => {
      const dto = new CreateVehicleServiceDto();
      dto.vehicleId = 'vehicle-123';
      dto.type = ServiceType.MAINTENANCE;
      dto.category = 'Oleo';
      dto.description = 'Troca de oleo';
      (dto as any).serviceDate = 'invalid-date';
      dto.mileage = 50000;
      dto.cost = 150.0;
      dto.location = 'Oficina';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when mileage is not a number', async () => {
      const dto = new CreateVehicleServiceDto();
      dto.vehicleId = 'vehicle-123';
      dto.type = ServiceType.MAINTENANCE;
      dto.category = 'Oleo';
      dto.description = 'Troca de oleo';
      dto.serviceDate = new Date();
      (dto as any).mileage = 'not-a-number';
      dto.cost = 150.0;
      dto.location = 'Oficina';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

