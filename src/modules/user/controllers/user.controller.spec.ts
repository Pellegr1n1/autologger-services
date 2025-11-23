import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from '../services/user.service';
import { UpdateUserDto } from '../dto/update-user.dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    avatar: null,
    authProvider: 'local' as const,
    isEmailVerified: false,
  };

  beforeEach(async () => {
    const mockUserService = {
      findById: jest.fn(),
      updateProfile: jest.fn(),
      deleteAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const user = mockUser as any;

      const result = await controller.getProfile(user);

      expect(result).toEqual(user);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const user = mockUser as any;
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      const updatedUser = { ...mockUser, name: 'Updated Name' };
      userService.updateProfile.mockResolvedValue(updatedUser as any);

      const result = await controller.updateProfile(user, updateUserDto);

      expect(userService.updateProfile).toHaveBeenCalledWith(
        'user-123',
        updateUserDto,
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('deleteAccount', () => {
    it('should delete user account', async () => {
      const user = mockUser as any;

      userService.deleteAccount.mockResolvedValue(undefined);

      const result = await controller.deleteAccount(user);

      expect(userService.deleteAccount).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ message: 'Conta excluída com sucesso' });
    });
  });
});
