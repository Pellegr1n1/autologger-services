import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorage } from '../interfaces/storage.interface';

@Injectable()
export class S3StorageProvider implements IStorage {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly useSignedUrls: boolean;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.useSignedUrls =
      this.configService.get<string>('AWS_S3_USE_SIGNED_URLS', 'true') ===
      'true';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!this.bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME deve estar configurado');
    }

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS S3 não está configurado. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY',
      );
    }

    // Inicializar cliente S3
    try {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const urlType = this.useSignedUrls
        ? 'URLs assinadas (privado)'
        : 'URLs públicas';
      this.logger.log(
        `AWS S3 inicializado com sucesso (bucket: ${this.bucketName}, region: ${this.region}, modo: ${urlType})`,
      );
    } catch (error) {
      this.logger.error('Erro ao inicializar AWS S3:', error);
      throw error;
    }
  }

  async upload(
    fileBuffer: Buffer,
    fileName: string,
    folder: string,
  ): Promise<string> {
    try {
      const filePath = `${folder}/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
        Body: fileBuffer,
        ContentType: this.getContentType(fileName),
        Metadata: {
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      this.logger.log(`Arquivo enviado para AWS S3: ${filePath}`);

      // Se usar URLs assinadas, retornar a URL do arquivo (não assinada ainda)
      // A URL será assinada quando necessário via método getSignedUrl
      if (this.useSignedUrls) {
        // Retornar path do S3 que será usado para gerar URL assinada depois
        return `s3://${this.bucketName}/${filePath}`;
      }

      // Se não usar URLs assinadas, retornar URL pública
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filePath}`;
    } catch (error) {
      this.logger.error('Erro ao fazer upload para AWS S3:', error);

      // Mensagem mais clara para erro de bucket não encontrado
      if (this.isNotFoundError(error)) {
        const errorMessage =
          `Bucket "${this.bucketName}" não existe. ` +
          `Verifique se o bucket foi criado na região ${this.region}.`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      throw error;
    }
  }

  /**
   * Gera uma URL assinada temporária para acessar um arquivo privado
   * @param fileUrl URL do arquivo (pode ser s3:// ou https://)
   * @param expiresIn Tempo de expiração em segundos (padrão: 3600 = 1 hora)
   * @returns URL assinada temporária
   */
  async getSignedUrlForFile(
    fileUrl: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const filePath = this.extractFilePathFromUrl(fileUrl);

      if (!filePath) {
        this.logger.warn(`URL inválida para gerar signed URL: ${fileUrl}`);
        return fileUrl; // Retornar a URL original se não conseguir extrair o path
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.debug(
        `URL assinada gerada para ${filePath} (expira em ${expiresIn}s)`,
      );

      return signedUrl;
    } catch (error) {
      this.logger.error('Erro ao gerar URL assinada:', error);
      return fileUrl; // Em caso de erro, retornar URL original
    }
  }

  /**
   * Obtém uma URL acessível para o arquivo
   * Se usar signed URLs, gera URL temporária; senão retorna URL pública
   * @param fileUrl URL do arquivo armazenado
   * @param expiresIn Tempo de expiração em segundos (padrão: 3600)
   * @returns URL acessível para o frontend
   */
  async getAccessibleUrl(
    fileUrl: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    if (!fileUrl) {
      return null;
    }

    // Se estiver usando signed URLs, gerar URL assinada
    if (this.useSignedUrls) {
      return this.getSignedUrlForFile(fileUrl, expiresIn);
    }

    // Se não estiver usando signed URLs, a URL já é pública
    return fileUrl;
  }

  async delete(fileUrl: string): Promise<void> {
    if (!fileUrl) {
      return;
    }

    try {
      const filePath = this.extractFilePathFromUrl(fileUrl);

      if (!filePath) {
        this.logger.warn(`URL inválida do AWS S3: ${fileUrl}`);
        return;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      await this.s3Client.send(command);
      this.logger.log(`Arquivo deletado do AWS S3: ${filePath}`);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        this.logger.warn(`Arquivo não encontrado no AWS S3: ${fileUrl}`);
        return;
      }

      // Se for erro de URL inválida, apenas avisar e retornar
      if (error instanceof TypeError && error.message.includes('Invalid URL')) {
        this.logger.warn(`URL inválida fornecida para deleção: ${fileUrl}`);
        return;
      }

      this.logger.error('Erro ao deletar arquivo do AWS S3:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    try {
      return !!this.bucketName && !!this.s3Client;
    } catch {
      return false;
    }
  }

  private getContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (!ext) {
      return 'application/octet-stream';
    }

    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Extrai o caminho do arquivo de uma URL do S3
   * @param fileUrl URL do arquivo no S3
   * @returns Caminho do arquivo ou null se a URL for inválida
   */
  private extractFilePathFromUrl(fileUrl: string): string | null {
    try {
      // Formato s3://bucket/path/to/file
      if (fileUrl.startsWith('s3://')) {
        const parts = fileUrl.substring(5).split('/');
        if (parts[0] === this.bucketName && parts.length > 1) {
          return parts.slice(1).join('/');
        }
        return null;
      }

      // Extrair caminho do arquivo da URL HTTP/HTTPS
      // Formatos possíveis:
      // https://bucket-name.s3.region.amazonaws.com/path/to/file
      // https://s3.region.amazonaws.com/bucket-name/path/to/file
      const url = new URL(fileUrl);

      if (url.hostname.startsWith(this.bucketName)) {
        // Formato: https://bucket-name.s3.region.amazonaws.com/path/to/file
        return url.pathname.substring(1); // Remove a barra inicial
      }

      // Formato: https://s3.region.amazonaws.com/bucket-name/path/to/file
      const pathParts = url.pathname.split('/').filter(Boolean);
      const bucketIndex = pathParts.indexOf(this.bucketName);

      if (bucketIndex === -1 || bucketIndex === pathParts.length - 1) {
        return null;
      }

      return pathParts.slice(bucketIndex + 1).join('/');
    } catch {
      return null;
    }
  }

  /**
   * Verifica se o erro é um erro 404 (recurso não encontrado)
   * @param error Erro a ser verificado
   * @returns true se for erro 404
   */
  private isNotFoundError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;
      return (
        errorObj.name === 'NoSuchBucket' ||
        errorObj.name === 'NoSuchKey' ||
        (errorObj.$metadata as Record<string, unknown>)?.httpStatusCode === 404
      );
    }
    return false;
  }
}
