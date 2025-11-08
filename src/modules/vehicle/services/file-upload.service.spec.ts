import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileUploadService } from './file-upload.service';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

describe('FileUploadService', () => {
  let service: FileUploadService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileUploadService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FileUploadService>(FileUploadService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadPhoto', () => {
    it('should return null when file is not provided', async () => {
      const result = await service.uploadPhoto(null);

      expect(result).toBeNull();
    });

    it('should upload photo successfully', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
      };

      (path.join as jest.Mock).mockReturnValue('/uploads/vehicles');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (path.extname as jest.Mock).mockReturnValue('.jpg');
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      configService.get.mockReturnValue(3001);

      const result = await service.uploadPhoto(mockFile as any);

      expect(result).toContain('uploads/vehicles');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
      };

      (path.join as jest.Mock).mockReturnValue('/uploads/vehicles');
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (path.extname as jest.Mock).mockReturnValue('.jpg');
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      configService.get.mockReturnValue(3001);

      await service.uploadPhoto(mockFile as any);

      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('deletePhoto', () => {
    it('should return when photoUrl is not provided', async () => {
      await service.deletePhoto(null);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should delete photo successfully', async () => {
      const photoUrl = 'http://localhost:3001/uploads/vehicles/test.jpg';

      (path.join as jest.Mock).mockReturnValue('/uploads/vehicles/test.jpg');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      await service.deletePhoto(photoUrl);

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should not throw error when file does not exist', async () => {
      const photoUrl = 'http://localhost:3001/uploads/vehicles/test.jpg';

      (path.join as jest.Mock).mockReturnValue('/uploads/vehicles/test.jpg');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.deletePhoto(photoUrl)).resolves.not.toThrow();
    });

    it('should handle error when deleting photo', async () => {
      const photoUrl = 'http://localhost:3001/uploads/vehicles/test.jpg';
      const error = new Error('Delete error');

      (path.join as jest.Mock).mockReturnValue('/uploads/vehicles/test.jpg');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.deletePhoto(photoUrl);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getPhotoPath', () => {
    it('should return null when photoUrl is not provided', () => {
      const result = service.getPhotoPath(null);

      expect(result).toBeNull();
    });

    it('should return photo path when photoUrl is provided', () => {
      const photoUrl = 'uploads/vehicles/test.jpg';
      (path.join as jest.Mock).mockReturnValue('/uploads/vehicles/test.jpg');

      const result = service.getPhotoPath(photoUrl);

      expect(path.join).toHaveBeenCalled();
      expect(result).toBe('/uploads/vehicles/test.jpg');
    });
  });

  describe('uploadAttachment', () => {
    it('should return null when file is not provided', async () => {
      const result = await service.uploadAttachment(null);

      expect(result).toBeNull();
    });

    it('should upload attachment successfully', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test'),
      };

      (path.join as jest.Mock).mockReturnValue('/uploads/attachments');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (path.extname as jest.Mock).mockReturnValue('.pdf');
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      configService.get.mockReturnValue(3001);

      const result = await service.uploadAttachment(mockFile as any);

      expect(result).toContain('uploads/attachments');
    });

    it('should create directory if it does not exist', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test'),
      };

      (path.join as jest.Mock).mockReturnValue('/uploads/attachments');
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (path.extname as jest.Mock).mockReturnValue('.pdf');
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      configService.get.mockReturnValue(3001);

      await service.uploadAttachment(mockFile as any);

      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('uploadMultipleAttachments', () => {
    it('should return empty array when files are not provided', async () => {
      const result = await service.uploadMultipleAttachments(null);

      expect(result).toEqual([]);
    });

    it('should upload multiple attachments', async () => {
      const mockFiles = [
        { originalname: 'test1.pdf', buffer: Buffer.from('test1') },
        { originalname: 'test2.pdf', buffer: Buffer.from('test2') },
      ];

      (path.join as jest.Mock).mockReturnValue('/uploads/attachments');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (path.extname as jest.Mock).mockReturnValue('.pdf');
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      configService.get.mockReturnValue(3001);

      const result = await service.uploadMultipleAttachments(
        mockFiles as any,
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('deleteAttachment', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return when attachmentUrl is not provided', async () => {
      await service.deleteAttachment(null);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should delete attachment successfully', async () => {
      const attachmentUrl =
        'http://localhost:3001/uploads/attachments/test.pdf';

      (path.join as jest.Mock).mockReturnValue(
        '/uploads/attachments/test.pdf',
      );
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      await service.deleteAttachment(attachmentUrl);

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should not throw error when file does not exist', async () => {
      const attachmentUrl =
        'http://localhost:3001/uploads/attachments/test.pdf';

      (path.join as jest.Mock).mockReturnValue(
        '/uploads/attachments/test.pdf',
      );
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.deleteAttachment(attachmentUrl)).resolves.not.toThrow();
    });

    it('should handle error when deleting attachment', async () => {
      const attachmentUrl =
        'http://localhost:3001/uploads/attachments/test.pdf';
      const error = new Error('Delete error');

      (path.join as jest.Mock).mockReturnValue(
        '/uploads/attachments/test.pdf',
      );
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.deleteAttachment(attachmentUrl);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

