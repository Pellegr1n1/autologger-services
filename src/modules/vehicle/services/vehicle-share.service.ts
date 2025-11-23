import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleShare } from '../entities/vehicle-share.entity';
import { VehicleService } from './vehicle.service';
import { VehicleServiceService } from './vehicle-service.service';
import {
  VehicleShareResponseDto,
  PublicVehicleInfoDto,
  PublicMaintenanceInfoDto,
  PublicAttachmentDto,
} from '../dto/vehicle-share-response.dto';
import { ServiceType, ServiceStatus } from '../entities/vehicle-service.entity';
import { VehicleStatus } from '../enums/vehicle-status.enum';
import { IStorage } from '../../storage/interfaces/storage.interface';
import { generateSecureToken } from '../../../common/utils/token.util';

@Injectable()
export class VehicleShareService {
  private readonly logger = new Logger(VehicleShareService.name);

  constructor(
    @InjectRepository(VehicleShare)
    private readonly vehicleShareRepository: Repository<VehicleShare>,
    private readonly vehicleService: VehicleService,
    private readonly vehicleServiceService: VehicleServiceService,
    @Inject('STORAGE') private readonly storage: IStorage,
  ) {}

  /**
   * Gerar token de compartilhamento para um veículo
   */
  async generateShareToken(
    vehicleId: string,
    userId: string,
    expiresInDays: number = 30,
    includeAttachments: boolean = false,
  ): Promise<VehicleShareResponseDto> {
    // Verificar se o veículo pertence ao usuário
    const vehicle = await this.vehicleService.findVehicleById(
      vehicleId,
      userId,
    );

    // Verificar se o veículo foi vendido e bloquear geração de link
    if (vehicle.status === VehicleStatus.SOLD) {
      throw new BadRequestException(
        'Não é possível gerar link de compartilhamento para veículos vendidos',
      );
    }

    // Gerar token único
    const shareToken = generateSecureToken();

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Criar registro de compartilhamento
    const vehicleShare = this.vehicleShareRepository.create({
      shareToken,
      vehicleId,
      expiresAt,
      isActive: true,
      includeAttachments,
    });

    await this.vehicleShareRepository.save(vehicleShare);

    // Gerar URL pública
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vehicles/share/${shareToken}`;

    return {
      shareToken,
      shareUrl,
      expiresAt,
      isActive: true,
    };
  }

  /**
   * Buscar informações públicas do veículo pelo token
   */
  async getPublicVehicleInfo(
    shareToken: string,
  ): Promise<PublicVehicleInfoDto> {
    const vehicleShare = await this.vehicleShareRepository.findOne({
      where: { shareToken, isActive: true },
      relations: ['vehicle'],
    });

    if (!vehicleShare) {
      throw new NotFoundException(
        'Link de compartilhamento não encontrado ou expirado',
      );
    }

    if (vehicleShare.expiresAt && vehicleShare.expiresAt < new Date()) {
      throw new UnauthorizedException('Link de compartilhamento expirado');
    }

    const vehicle = vehicleShare.vehicle;

    if (vehicle.status !== 'active') {
      throw new UnauthorizedException(
        'Este veículo foi vendido e não está mais disponível para visualização pública',
      );
    }

    vehicleShare.viewCount += 1;
    vehicleShare.lastViewedAt = new Date();
    await this.vehicleShareRepository.save(vehicleShare);

    // Converter URL da foto do veículo
    let photoUrl = vehicle.photoUrl;
    if (photoUrl && this.storage.getAccessibleUrl) {
      try {
        photoUrl = await this.storage.getAccessibleUrl(photoUrl);
      } catch {
        this.logger.error(`Erro ao gerar URL acessível para foto do veículo`);
      }
    }

    const maintenanceHistory = await this.getPublicMaintenanceHistory(
      vehicle.id,
      vehicleShare.includeAttachments,
    );

    return {
      id: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      mileage: vehicle.mileage,
      status: vehicle.status,
      createdAt: vehicle.createdAt,
      photoUrl,
      maintenanceHistory,
    };
  }

  /**
   * Buscar histórico de serviços público (sem dados sensíveis)
   */
  private async getPublicMaintenanceHistory(
    vehicleId: string,
    includeAttachments: boolean = false,
  ): Promise<PublicMaintenanceInfoDto[]> {
    const services =
      await this.vehicleServiceService.findByVehicleId(vehicleId);

    // Processar serviços de forma assíncrona para converter URLs
    const processedServices = await Promise.all(
      services.map(async (service) => {
        // Converter anexos de string[] para PublicAttachmentDto[] apenas se includeAttachments for true
        let attachments: PublicAttachmentDto[] | undefined;

        if (
          includeAttachments &&
          service.attachments &&
          service.attachments.length > 0
        ) {
          // Converter URLs s3:// para URLs acessíveis (assinadas)
          attachments = await Promise.all(
            service.attachments.map(async (url, index) => {
              let accessibleUrl = url;

              // Converter URL do storage para URL acessível
              if (url && this.storage.getAccessibleUrl) {
                try {
                  accessibleUrl = await this.storage.getAccessibleUrl(url);
                } catch {
                  // Em caso de erro, manter URL original
                  this.logger.error(`Erro ao gerar URL acessível para anexo`);
                }
              }

              return {
                id: `attachment-${service.id}-${index}`,
                fileName: this.getFileNameFromUrl(url),
                fileUrl: accessibleUrl, // URL acessível (assinada)
                fileType: this.getFileTypeFromUrl(url),
                fileSize: 0, // Não temos o tamanho salvo no banco
              };
            }),
          );
        }

        return {
          type: this.mapServiceType(service.type),
          category: service.category,
          description: service.description,
          serviceDate: service.serviceDate,
          mileage: service.mileage,
          cost: service.cost,
          location: service.location,
          technician: service.technician,
          warranty: service.warranty,
          nextServiceDate: service.nextServiceDate,
          notes: service.notes,
          blockchainStatus: this.mapBlockchainStatus(service.status),
          blockchainHash: service.blockchainHash,
          createdAt: service.createdAt,
          attachments: attachments,
        };
      }),
    );

    return processedServices;
  }

  /**
   * Mapear tipo de serviço para formato legível
   */
  private mapServiceType(type: ServiceType): string {
    const typeMap = {
      [ServiceType.MAINTENANCE]: 'Manutenção',
      [ServiceType.REPAIR]: 'Reparo',
      [ServiceType.INSPECTION]: 'Inspeção',
      [ServiceType.FUEL]: 'Combustível',
      [ServiceType.EXPENSE]: 'Despesa',
      [ServiceType.OTHER]: 'Outro',
    };
    return typeMap[type] || 'Outro';
  }

  /**
   * Mapear status blockchain para formato legível
   */
  private mapBlockchainStatus(status: ServiceStatus): string {
    const statusMap = {
      [ServiceStatus.PENDING]: 'Pendente',
      [ServiceStatus.CONFIRMED]: 'Confirmado',
      [ServiceStatus.REJECTED]: 'Rejeitado',
      [ServiceStatus.EXPIRED]: 'Expirado',
    };
    return statusMap[status] || 'Pendente';
  }

  /**
   * Extrair nome do arquivo da URL (sem parâmetros de query string)
   */
  private getFileNameFromUrl(url: string): string {
    if (!url) return 'Arquivo';

    try {
      // Extrair o caminho da URL (removendo protocolo s3:// ou http/https)
      const urlPath = url
        .replace(/^s3:\/\/[^/]+\//, '')
        .replace(/^https?:\/\/[^/]+\//, '');

      // Pegar a última parte do caminho (nome do arquivo)
      const fileName = urlPath.split('/').pop() || 'Arquivo';

      // Remover parâmetros de query string (ex: ?X-Amz-Algorithm=...)
      const cleanFileName = fileName.split('?')[0];

      return cleanFileName || 'Arquivo';
    } catch {
      return 'Arquivo';
    }
  }

  /**
   * Extrair tipo do arquivo da URL
   */
  private getFileTypeFromUrl(url: string): string {
    if (!url) return 'unknown';

    // Remover query string para pegar a extensão corretamente
    const cleanUrl = url.split('?')[0];
    const extension = cleanUrl.split('.').pop()?.toLowerCase() || '';

    // Mapa de extensões para tipos MIME
    const extensionTypeMap: Record<string, string> = {
      // PDFs
      pdf: 'application/pdf',
      // Imagens
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      webp: 'image',
      bmp: 'image',
      svg: 'image',
      // Documentos Word
      doc: 'application/msword',
      docx: 'application/msword',
      // Planilhas Excel
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.ms-excel',
      csv: 'application/vnd.ms-excel',
      // Apresentações PowerPoint
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.ms-powerpoint',
      // Arquivos de texto
      txt: 'text/plain',
      text: 'text/plain',
    };

    return extensionTypeMap[extension] || 'unknown';
  }

  /**
   * Desativar token de compartilhamento
   */
  async deactivateShareToken(
    shareToken: string,
    userId: string,
  ): Promise<void> {
    const vehicleShare = await this.vehicleShareRepository.findOne({
      where: { shareToken },
      relations: ['vehicle'],
    });

    if (!vehicleShare) {
      throw new NotFoundException('Token de compartilhamento não encontrado');
    }

    // Verificar se o veículo pertence ao usuário
    await this.vehicleService.findVehicleById(vehicleShare.vehicleId, userId);

    vehicleShare.isActive = false;
    await this.vehicleShareRepository.save(vehicleShare);
  }

  /**
   * Listar tokens de compartilhamento de um usuário
   */
  async getUserShareTokens(userId: string): Promise<VehicleShare[]> {
    return this.vehicleShareRepository.find({
      where: { vehicle: { userId } },
      relations: ['vehicle'],
      order: { createdAt: 'DESC' },
    });
  }
}
