import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from './user.repository';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';

describe('UserRepository', () => {
  let repository: UserRepository;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed-password',
    isActive: true,
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      const result = await repository.create(createUserDto);

      expect(userRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await repository.findByEmail('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await repository.findById('user-123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById('user-999');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        isEmailVerified: true,
      };

      const updatedUser = { ...mockUser, ...updateData };
      userRepository.update.mockResolvedValue(undefined as any);
      userRepository.findOne.mockResolvedValue(updatedUser as any);

      const result = await repository.update('user-123', updateData);

      expect(userRepository.update).toHaveBeenCalledWith(
        'user-123',
        updateData,
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should filter undefined values from update data', async () => {
      const updateData = {
        name: 'Updated Name',
        email: undefined,
        isEmailVerified: true,
      };

      const filteredData = {
        name: 'Updated Name',
        isEmailVerified: true,
      };

      const updatedUser = { ...mockUser, ...filteredData };
      userRepository.update.mockResolvedValue(undefined as any);
      userRepository.findOne.mockResolvedValue(updatedUser as any);

      await repository.update('user-123', updateData);

      expect(userRepository.update).toHaveBeenCalledWith(
        'user-123',
        filteredData,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete user', async () => {
      userRepository.update.mockResolvedValue(undefined as any);

      await repository.softDelete('user-123');

      expect(userRepository.update).toHaveBeenCalledWith('user-123', {
        isActive: false,
      });
    });
  });

  describe('hardDelete', () => {
    it('should hard delete user', async () => {
      userRepository.delete.mockResolvedValue(undefined as any);

      await repository.hardDelete('user-123');

      expect(userRepository.delete).toHaveBeenCalledWith('user-123');
    });
  });

  describe('findByGoogleId', () => {
    it('should find user by google id', async () => {
      const googleUser = {
        ...mockUser,
        googleId: 'google-123',
        authProvider: 'google' as any,
      };

      userRepository.findOne.mockResolvedValue(googleUser as any);

      const result = await repository.findByGoogleId('google-123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { googleId: 'google-123' },
      });
      expect(result).toEqual(googleUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByGoogleId('google-999');

      expect(result).toBeNull();
    });
  });

  describe('createGoogleUser', () => {
    it('should create google user successfully', async () => {
      const userData = {
        name: 'Google User',
        email: 'google@example.com',
        googleId: 'google-123',
        avatar: 'avatar-url',
        authProvider: 'google' as const,
        isActive: true,
      };

      const googleUser = {
        ...mockUser,
        ...userData,
      };

      userRepository.create.mockReturnValue(googleUser as any);
      userRepository.save.mockResolvedValue(googleUser as any);

      const result = await repository.createGoogleUser(userData);

      expect(userRepository.create).toHaveBeenCalledWith(userData);
      expect(userRepository.save).toHaveBeenCalledWith(googleUser);
      expect(result).toEqual(googleUser);
    });

    it('should create google user without avatar', async () => {
      const userData = {
        name: 'Google User',
        email: 'google@example.com',
        googleId: 'google-123',
        authProvider: 'google' as const,
        isActive: true,
      };

      const googleUser = {
        ...mockUser,
        ...userData,
      };

      userRepository.create.mockReturnValue(googleUser as any);
      userRepository.save.mockResolvedValue(googleUser as any);

      const result = await repository.createGoogleUser(userData);

      expect(result).toEqual(googleUser);
    });
  });
});
