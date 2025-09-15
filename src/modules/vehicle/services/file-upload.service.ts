import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadService {
  constructor(private configService: ConfigService) {}

  async uploadPhoto(file: any): Promise<string> {
    if (!file) {
      return null;
    }

    // Criar diretório de uploads se não existir
    const uploadDir = path.join(process.cwd(), 'uploads', 'vehicles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Gerar nome único para o arquivo
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Salvar arquivo
    fs.writeFileSync(filePath, file.buffer);

    // Retornar URL relativa
    return `/uploads/vehicles/${fileName}`;
  }

  async deletePhoto(photoUrl: string): Promise<void> {
    if (!photoUrl) {
      return;
    }

    try {
      const filePath = path.join(process.cwd(), photoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Erro ao deletar foto:', error);
    }
  }

  getPhotoPath(photoUrl: string): string {
    if (!photoUrl) {
      return null;
    }

    return path.join(process.cwd(), photoUrl);
  }
}
