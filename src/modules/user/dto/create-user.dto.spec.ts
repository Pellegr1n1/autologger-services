import { CreateUserDto } from './create-user.dto';
import { DtoValidationTestHelper } from '../../../common/test-helpers/dto-validation.test-helper';

describe('CreateUserDto', () => {
  it('should be defined', () => {
    expect(CreateUserDto).toBeDefined();
  });

  describe('validation', () => {
    const validData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should pass validation with valid data', async () => {
      await DtoValidationTestHelper.expectValid(CreateUserDto, validData);
    });

    it('should fail validation when name is too short', async () => {
      await DtoValidationTestHelper.expectInvalid(
        CreateUserDto,
        { ...validData, name: 'A' },
        'name'
      );
    });

    it('should fail validation when email is invalid', async () => {
      await DtoValidationTestHelper.expectInvalid(
        CreateUserDto,
        { ...validData, email: 'invalid-email' },
        'email'
      );
    });

    it('should fail validation when password is too short', async () => {
      await DtoValidationTestHelper.expectInvalid(
        CreateUserDto,
        { ...validData, password: 'short' },
        'password'
      );
    });

    it('should pass validation when password is optional', async () => {
      const { password, ...dataWithoutPassword } = validData;
      await DtoValidationTestHelper.expectValid(CreateUserDto, dataWithoutPassword);
    });
  });
});

