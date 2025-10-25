import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleShare } from '../entities/vehicle-share.entity';
import { VehicleService } from './vehicle.service';
import { VehicleServiceService } from './vehicle-service.service';
import { VehicleShareResponseDto, PublicVehicleInfoDto, PublicMaintenanceInfoDto } from '../dto/vehicle-share-response.dto';
import { VehicleResponseDto } from '../dto/vehicle-response.dto';
import { ServiceType, ServiceStatus } from '../entities/vehicle-service.entity';
import * as crypto from 'crypto';

@Injectable()
export class VehicleShareService {
  constructor(
    @InjectRepository(VehicleShare)
    private readonly vehicleShareRepository: Repository<VehicleShare>,
    private readonly vehicleService: VehicleService,
    private readonly vehicleServiceService: VehicleServiceService,
  ) {}

  /**
   * Gerar token de compartilhamento para um veículo
   */
  async generateShareToken(vehicleId: string, userId: string, expiresInDays: number = 30): Promise<VehicleShareResponseDto> {
    // Verificar se o veículo pertence ao usuário
    await this.vehicleService.findVehicleById(vehicleId, userId);

    // Gerar token único
    const shareToken = crypto.randomBytes(32).toString('hex');

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Criar registro de compartilhamento
    const vehicleShare = this.vehicleShareRepository.create({
      shareToken,
      vehicleId,
      expiresAt,
      isActive: true,
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
  async getPublicVehicleInfo(shareToken: string): Promise<PublicVehicleInfoDto> {
    const vehicleShare = await this.vehicleShareRepository.findOne({
      where: { shareToken, isActive: true },
      relations: ['vehicle'],
    });

    if (!vehicleShare) {
      throw new NotFoundException('Link de compartilhamento não encontrado ou expirado');
    }

    // Verificar se não expirou
    if (vehicleShare.expiresAt && vehicleShare.expiresAt < new Date()) {
      throw new UnauthorizedException('Link de compartilhamento expirado');
    }

    // Incrementar contador de visualizações
    vehicleShare.viewCount += 1;
    vehicleShare.lastViewedAt = new Date();
    await this.vehicleShareRepository.save(vehicleShare);

    const vehicle = vehicleShare.vehicle;

    // Buscar histórico de manutenções do veículo
    const maintenanceHistory = await this.getPublicMaintenanceHistory(vehicle.id);

    return {
      id: vehicle.id,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      mileage: vehicle.mileage,
      status: vehicle.status,
      createdAt: vehicle.createdAt,
      photoUrl: vehicle.photoUrl,
      maintenanceHistory,
    };
  }

  /**
   * Buscar histórico de manutenções público (sem dados sensíveis)
   */
  private async getPublicMaintenanceHistory(vehicleId: string): Promise<PublicMaintenanceInfoDto[]> {
    const services = await this.vehicleServiceService.findByVehicleId(vehicleId);

    return services.map(service => {
      // Converter anexos de string[] para PublicAttachmentDto[]
      const attachments = (service.attachments || []).map((url, index) => ({
        id: `attachment-${service.id}-${index}`,
        fileName: this.getFileNameFromUrl(url),
        fileUrl: url,
        fileType: this.getFileTypeFromUrl(url),
        fileSize: 0 // Não temos o tamanho salvo no banco
      }));

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
        attachments: attachments,
      };
    });
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
   * Extrair nome do arquivo da URL
   */
  private getFileNameFromUrl(url: string): string {
    if (!url) return 'Arquivo';
    const fileName = url.split('/').pop() || 'Arquivo';
    return fileName;
  }

  /**
   * Extrair tipo do arquivo da URL
   */
  private getFileTypeFromUrl(url: string): string {
    if (!url) return 'unknown';
    const extension = url.split('.').pop()?.toLowerCase() || '';
    
    if (extension === 'pdf') return 'application/pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['doc', 'docx'].includes(extension)) return 'application/msword';
    
    return 'unknown';
  }

  /**
   * Desativar token de compartilhamento
   */
  async deactivateShareToken(shareToken: string, userId: string): Promise<void> {
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
