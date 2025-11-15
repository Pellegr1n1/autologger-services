import { CreateVehicleServiceDto } from './create-vehicle-service.dto';
import { ServiceType } from '../entities/vehicle-service.entity';
import { DtoValidationTestHelper } from '../../../common/test-helpers/dto-validation.test-helper';

describe('CreateVehicleServiceDto', () => {
  it('should be defined', () => {
    expect(CreateVehicleServiceDto).toBeDefined();
  });

  describe('validation', () => {
    const validBaseData = {
      vehicleId: 'vehicle-123',
      type: ServiceType.MAINTENANCE,
      category: 'Oleo',
      description: 'Troca de oleo',
      serviceDate: new Date(),
      mileage: 50000,
      cost: 150,
      location: 'Oficina',
    };

    it('should pass validation with valid data', async () => {
      await DtoValidationTestHelper.expectValid(CreateVehicleServiceDto, validBaseData);
    });

    it('should fail validation when vehicleId is missing', async () => {
      const { vehicleId: _vehicleId, ...dataWithoutVehicleId } = validBaseData;
      await DtoValidationTestHelper.expectInvalid(
        CreateVehicleServiceDto,
        dataWithoutVehicleId,
        'vehicleId'
      );
    });

    it('should fail validation when type is invalid', async () => {
      await DtoValidationTestHelper.expectInvalid(
        CreateVehicleServiceDto,
        { ...validBaseData, type: 'INVALID_TYPE' as any },
        'type'
      );
    });

    it('should pass validation with optional fields', async () => {
      const dataWithOptionals = {
        ...validBaseData,
        attachments: ['url1', 'url2'],
        technician: 'João',
        warranty: true,
        nextServiceDate: new Date(),
        notes: 'Observações',
      };
      
      await DtoValidationTestHelper.expectValid(CreateVehicleServiceDto, dataWithOptionals);
    });

    it('should fail validation when serviceDate is not a date', async () => {
      await DtoValidationTestHelper.expectInvalid(
        CreateVehicleServiceDto,
        { ...validBaseData, serviceDate: 'invalid-date' as any },
        'serviceDate'
      );
    });

    it('should fail validation when mileage is not a number', async () => {
      await DtoValidationTestHelper.expectInvalid(
        CreateVehicleServiceDto,
        { ...validBaseData, mileage: 'not-a-number' as any },
        'mileage'
      );
    });
  });
});

