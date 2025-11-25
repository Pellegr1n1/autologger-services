import { Injectable, Inject, Logger } from '@nestjs/common';
import { VehicleService } from '../entities/vehicle-service.entity';
import { IStorage } from '../../storage/interfaces/storage.interface';

@Injectable()
export class VehicleServiceFactory {
  private readonly logger = new Logger(VehicleServiceFactory.name);

  constructor(@Inject('STORAGE') private readonly storage: IStorage) {}

  /**
   * Converte URLs de anexos s3:// para URLs acessíveis (assinadas ou públicas)
   */
  async toResponseDto(service: VehicleService): Promise<VehicleService> {
    // Se não há anexos, retornar o serviço como está
    if (!service.attachments || service.attachments.length === 0) {
      return service;
    }

    // Converter URLs dos anexos
    if (this.storage && this.storage.getAccessibleUrl) {
      try {
        const accessibleAttachments = await Promise.all(
          service.attachments.map(async (url) => {
            if (!url) {
              return url; // Retornar URL vazia/null como está
            }
            try {
              const accessibleUrl = await this.storage.getAccessibleUrl(url);
              // Só usar a URL acessível se for válida
              return accessibleUrl || url;
            } catch (error) {
              this.logger.error(
                `Erro ao gerar URL acessível para anexo: ${error}`,
              );
              return url; // Retornar URL original em caso de erro
            }
          }),
        );

        return {
          ...service,
          attachments: accessibleAttachments,
        };
      } catch (error) {
        this.logger.error(`Erro ao processar anexos: ${error}`);
        // Em caso de erro geral, retornar o serviço com URLs originais
        return service;
      }
    }

    return service;
  }

  /**
   * Converte array de serviços
   */
  async toResponseDtoArray(
    services: VehicleService[],
  ): Promise<VehicleService[]> {
    return Promise.all(services.map((service) => this.toResponseDto(service)));
  }
}
