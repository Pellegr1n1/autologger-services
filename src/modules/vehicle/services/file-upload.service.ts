import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { IStorage } from '../../storage/interfaces/storage.interface';
import { LoggerService } from '../../../common/logger/logger.service';

@Injectable()
export class FileUploadService {
  constructor(
    private configService: ConfigService,
    @Inject('STORAGE') private storage: IStorage,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('FileUploadService');
  }

  private generateUniqueFileName(originalName: string): string {
    const fileExtension = originalName.includes('.')
      ? originalName.split('.').pop()
      : '';
    return fileExtension ? `${uuidv4()}.${fileExtension}` : uuidv4();
  }

  private async uploadFile(file: any, folder: string): Promise<string> {
    if (!file) {
      return null;
    }

    if (!this.storage) {
      this.logger.error(
        'Storage não está configurado',
        null,
        'FileUploadService',
      );
      throw new Error('Storage não está configurado');
    }

    if (!file.buffer) {
      this.logger.error(
        'Arquivo não possui buffer',
        null,
        'FileUploadService',
        {
          fileName: file.originalname,
          folder,
        },
      );
      throw new Error('Arquivo inválido: buffer não encontrado');
    }

    try {
      const originalName = file.originalname || 'file';
      const fileName = this.generateUniqueFileName(originalName);

      const startTime = Date.now();
      const url = await this.storage.upload(file.buffer, fileName, folder);
      const duration = Date.now() - startTime;

      // Log apenas se for lento ou em desenvolvimento
      const isProduction = process.env.NODE_ENV === 'production';
      if (!isProduction || duration > 1000) {
        this.logger.log('Upload de arquivo concluído', 'FileUploadService', {
          fileName,
          folder,
          duration: `${duration}ms`,
        });
      }

      return url;
    } catch (error) {
      this.logger.error(
        'Erro ao fazer upload de arquivo',
        error.stack,
        'FileUploadService',
        {
          fileName: file.originalname,
          folder,
          errorMessage: error.message,
        },
      );
      throw error;
    }
  }

  private async deleteFile(fileUrl: string, fileType: string): Promise<void> {
    if (!fileUrl) {
      return;
    }

    try {
      await this.storage.delete(fileUrl);
    } catch (error) {
      this.logger.error(
        `Erro ao deletar ${fileType}`,
        error.stack,
        'FileUploadService',
        {
          fileUrl,
          fileType,
          errorMessage: error.message,
        },
      );
      throw error;
    }
  }

  async uploadPhoto(file: any): Promise<string> {
    return this.uploadFile(file, 'vehicles');
  }

  async deletePhoto(photoUrl: string): Promise<void> {
    return this.deleteFile(photoUrl, 'foto');
  }

  getPhotoPath(photoUrl: string): string {
    // Para AWS S3 e outros storages em nuvem, retornar a URL diretamente
    // Para local storage, pode ser necessário ajustar conforme necessário
    return photoUrl;
  }

  async uploadAttachment(file: any): Promise<string> {
    return this.uploadFile(file, 'attachments');
  }

  async uploadMultipleAttachments(files: any[]): Promise<string[]> {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map((file) => this.uploadAttachment(file));
    return await Promise.all(uploadPromises);
  }

  async deleteAttachment(attachmentUrl: string): Promise<void> {
    return this.deleteFile(attachmentUrl, 'anexo');
  }
}
