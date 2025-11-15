import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { IStorage } from '../../storage/interfaces/storage.interface';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(
    private configService: ConfigService,
    @Inject('STORAGE') private storage: IStorage,
  ) {}

  private generateUniqueFileName(originalName: string): string {
    const fileExtension = originalName.includes('.') 
      ? originalName.split('.').pop() 
      : '';
    return fileExtension 
      ? `${uuidv4()}.${fileExtension}` 
      : uuidv4();
  }

  private async uploadFile(file: any, folder: string): Promise<string> {
    if (!file) {
      return null;
    }

    const originalName = file.originalname || 'file';
    const fileName = this.generateUniqueFileName(originalName);
    return await this.storage.upload(file.buffer, fileName, folder);
  }

  private async deleteFile(fileUrl: string, fileType: string): Promise<void> {
    if (!fileUrl) {
      return;
    }

    try {
      await this.storage.delete(fileUrl);
    } catch (error) {
      this.logger.error(`Erro ao deletar ${fileType}:`, error);
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

    const uploadPromises = files.map(file => this.uploadAttachment(file));
    return await Promise.all(uploadPromises);
  }

  async deleteAttachment(attachmentUrl: string): Promise<void> {
    return this.deleteFile(attachmentUrl, 'anexo');
  }
}

