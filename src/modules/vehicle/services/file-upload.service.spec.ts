import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { IStorage } from '../../storage/interfaces/storage.interface';
import { LoggerService } from '../../../common/logger/logger.service';
import { LoggerServiceTestHelper } from '../../../common/test-helpers/logger-service.test-helper';

describe('FileUploadService', () => {
  let service: FileUploadService;
  let mockStorage: jest.Mocked<IStorage>;
  let loggerErrorSpy: jest.SpyInstance;

  const createMockFile = (
    originalname: string,
    buffer: string = 'test',
  ): any => ({
    originalname,
    buffer: Buffer.from(buffer),
  });

  const mockUploadResult = 'https://storage.example.com/uploaded-file.jpg';

  beforeEach(async () => {
    mockStorage = {
      upload: jest.fn().mockResolvedValue(mockUploadResult),
      delete: jest.fn().mockResolvedValue(undefined),
      getUrl: jest.fn(),
    } as any;

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockLoggerService = LoggerServiceTestHelper.createMockLoggerService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileUploadService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'STORAGE',
          useValue: mockStorage,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<FileUploadService>(FileUploadService);

    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
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
      const mockFile = createMockFile('test.jpg');

      const result = await service.uploadPhoto(mockFile);

      expect(mockStorage.upload).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.stringMatching(/\.jpg$/),
        'vehicles',
      );
      expect(result).toBe(mockUploadResult);
    });

    it('should handle file without extension', async () => {
      const mockFile = createMockFile('test');

      await service.uploadPhoto(mockFile);

      expect(mockStorage.upload).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.not.stringContaining('.'),
        'vehicles',
      );
    });
  });

  describe('deletePhoto', () => {
    it('should return when photoUrl is not provided', async () => {
      await service.deletePhoto(null);
      expect(mockStorage.delete).not.toHaveBeenCalled();
    });

    it('should delete photo successfully', async () => {
      const photoUrl = 'https://storage.example.com/photo.jpg';

      await service.deletePhoto(photoUrl);

      expect(mockStorage.delete).toHaveBeenCalledWith(photoUrl);
    });

    it('should handle error when deleting photo', async () => {
      const photoUrl = 'https://storage.example.com/photo.jpg';
      const error = new Error('Delete error');

      mockStorage.delete.mockRejectedValueOnce(error);

      await expect(service.deletePhoto(photoUrl)).rejects.toThrow(
        'Delete error',
      );

      expect(mockStorage.delete).toHaveBeenCalledWith(photoUrl);
    });
  });

  describe('getPhotoPath', () => {
    it('should return photo path', () => {
      const photoUrl = 'https://storage.example.com/photo.jpg';

      const result = service.getPhotoPath(photoUrl);

      expect(result).toBe(photoUrl);
    });
  });

  describe('uploadAttachment', () => {
    it('should return null when file is not provided', async () => {
      const result = await service.uploadAttachment(null);
      expect(result).toBeNull();
    });

    it('should upload attachment successfully', async () => {
      const mockFile = createMockFile('test.pdf');

      const result = await service.uploadAttachment(mockFile);

      expect(mockStorage.upload).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.stringMatching(/\.pdf$/),
        'attachments',
      );
      expect(result).toBe(mockUploadResult);
    });
  });

  describe('uploadMultipleAttachments', () => {
    it('should return empty array when files are not provided', async () => {
      const result = await service.uploadMultipleAttachments(null);
      expect(result).toEqual([]);
    });

    it('should return empty array when files array is empty', async () => {
      const result = await service.uploadMultipleAttachments([]);
      expect(result).toEqual([]);
    });

    it('should upload multiple attachments', async () => {
      const mockFiles = [
        createMockFile('test1.pdf'),
        createMockFile('test2.pdf'),
      ];

      const result = await service.uploadMultipleAttachments(mockFiles);

      expect(mockStorage.upload).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result).toEqual([mockUploadResult, mockUploadResult]);
    });
  });

  describe('deleteAttachment', () => {
    it('should return when attachmentUrl is not provided', async () => {
      await service.deleteAttachment(null);
      expect(mockStorage.delete).not.toHaveBeenCalled();
    });

    it('should delete attachment successfully', async () => {
      const attachmentUrl = 'https://storage.example.com/attachment.pdf';

      await service.deleteAttachment(attachmentUrl);

      expect(mockStorage.delete).toHaveBeenCalledWith(attachmentUrl);
    });

    it('should handle error when deleting attachment', async () => {
      const attachmentUrl = 'https://storage.example.com/attachment.pdf';
      const error = new Error('Delete error');

      mockStorage.delete.mockRejectedValueOnce(error);

      await expect(service.deleteAttachment(attachmentUrl)).rejects.toThrow(
        'Delete error',
      );

      expect(mockStorage.delete).toHaveBeenCalledWith(attachmentUrl);
    });
  });
});
