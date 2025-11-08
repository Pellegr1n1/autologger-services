import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  it('should be defined', () => {
    expect(CreateUserDto).toBeDefined();
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = new CreateUserDto();
      dto.name = 'Test User';
      dto.email = 'test@example.com';
      dto.password = 'password123';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when name is too short', async () => {
      const dto = new CreateUserDto();
      dto.name = 'A';
      dto.email = 'test@example.com';
      dto.password = 'password123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should fail validation when email is invalid', async () => {
      const dto = new CreateUserDto();
      dto.name = 'Test User';
      dto.email = 'invalid-email';
      dto.password = 'password123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should fail validation when password is too short', async () => {
      const dto = new CreateUserDto();
      dto.name = 'Test User';
      dto.email = 'test@example.com';
      dto.password = 'short';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should pass validation when password is optional', async () => {
      const dto = new CreateUserDto();
      dto.name = 'Test User';
      dto.email = 'test@example.com';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});

