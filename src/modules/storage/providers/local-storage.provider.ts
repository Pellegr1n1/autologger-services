import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { IStorage } from '../interfaces/storage.interface';

@Injectable()
export class LocalStorageProvider implements IStorage {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly baseUrl: string;
  private readonly basePath: string;

  constructor(private configService: ConfigService) {
    this.basePath = path.join(process.cwd(), 'storage', 'uploads');
    const port = this.configService.get('PORT') || 3001;
    const host = this.configService.get('HOST') || 'localhost';
    this.baseUrl = `http://${host}:${port}/uploads`;
  }

  async upload(fileBuffer: Buffer, fileName: string, folder: string): Promise<string> {
    const uploadDir = path.join(this.basePath, folder);
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    
    // Salvar arquivo
    fs.writeFileSync(filePath, fileBuffer);

    // Retornar URL pública
    return `${this.baseUrl}/${folder}/${fileName}`;
  }

  async delete(fileUrl: string): Promise<void> {
    if (!fileUrl) {
      return;
    }

    try {
      // Extrair o caminho relativo da URL
      const urlPath = new URL(fileUrl).pathname;
      const relativePath = urlPath.replace('/uploads/', '');
      const filePath = path.join(this.basePath, relativePath);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Arquivo deletado: ${filePath}`);
      }
    } catch (error) {
      this.logger.error('Erro ao deletar arquivo:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return true; // Local storage sempre está disponível
  }

  /**
   * Obtém URL acessível para o arquivo
   * No local storage, a URL já está pronta para uso
   * @param fileUrl URL do arquivo local
   * @returns URL acessível
   */
  async getAccessibleUrl(fileUrl: string): Promise<string> {
    return fileUrl; // Local storage já retorna URLs prontas
  }
}

