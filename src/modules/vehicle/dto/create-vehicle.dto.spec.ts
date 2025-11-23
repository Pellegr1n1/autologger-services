import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateVehicleDto } from './create-vehicle.dto';

describe('CreateVehicleDto', () => {
  it('should be defined', () => {
    expect(CreateVehicleDto).toBeDefined();
  });

  describe('validation', () => {
    it('should validate a valid vehicle DTO', async () => {
      const dto = plainToInstance(CreateVehicleDto, {
        plate: 'ABC1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Branco',
        mileage: 50000,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should transform year to number', () => {
      const dto = plainToInstance(CreateVehicleDto, {
        plate: 'ABC1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: '2020', // String que deve ser transformada
        color: 'Branco',
      });

      expect(typeof dto.year).toBe('number');
      expect(dto.year).toBe(2020);
    });

    it('should transform mileage to number when provided', () => {
      const dto = plainToInstance(CreateVehicleDto, {
        plate: 'ABC1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Branco',
        mileage: '50000', // String que deve ser transformada
      });

      expect(typeof dto.mileage).toBe('number');
      expect(dto.mileage).toBe(50000);
    });

    it('should accept optional mileage', async () => {
      const dto = plainToInstance(CreateVehicleDto, {
        plate: 'ABC1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Branco',
        // mileage não fornecido
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.mileage).toBeUndefined();
    });

    it('should validate plate format (old format)', async () => {
      const dto = plainToInstance(CreateVehicleDto, {
        plate: 'ABC1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Branco',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate plate format (new format)', async () => {
      const dto = plainToInstance(CreateVehicleDto, {
        plate: 'ABC1D23',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Branco',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid plate format', async () => {
      const dto = plainToInstance(CreateVehicleDto, {
        plate: 'INVALID',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Branco',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('plate');
    });

    it('should validate year range', async () => {
      const dto = plainToInstance(CreateVehicleDto, {
        plate: 'ABC1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 1800, // Muito antigo
        color: 'Branco',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('year');
    });

    it('should validate mileage minimum', async () => {
      const dto = plainToInstance(CreateVehicleDto, {
        plate: 'ABC1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Branco',
        mileage: -1, // Negativo
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('mileage');
    });
  });
});
