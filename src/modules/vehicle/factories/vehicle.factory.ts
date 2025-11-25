import { Injectable, Inject, Logger } from '@nestjs/common';
import { Vehicle } from '../entities/vehicle.entity';
import { VehicleResponseDto } from '../dto/vehicle-response.dto';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { VehicleStatus } from '../enums/vehicle-status.enum';
import { IStorage } from '../../storage/interfaces/storage.interface';

@Injectable()
export class VehicleFactory {
  private readonly logger = new Logger(VehicleFactory.name);

  constructor(@Inject('STORAGE') private readonly storage: IStorage) {}

  /**
   * Converte uma entidade Vehicle para VehicleResponseDto
   * Converte URLs do storage (s3://) para URLs acessíveis automaticamente
   */
  async toResponseDto(vehicle: Vehicle): Promise<VehicleResponseDto> {
    // Converter URL do storage para URL acessível (pública ou assinada)
    let photoUrl = vehicle.photoUrl;
    if (photoUrl && this.storage && this.storage.getAccessibleUrl) {
      try {
        photoUrl = await this.storage.getAccessibleUrl(photoUrl);
      } catch (error) {
        // Em caso de erro, manter a URL original
        this.logger.error('Erro ao gerar URL acessível:', error);
        // Não propagar o erro, apenas usar a URL original
      }
    }

    return new VehicleResponseDto({
      id: vehicle.id,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      mileage: vehicle.mileage,
      photoUrl,
      status: vehicle.status,
      soldAt: vehicle.soldAt,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    });
  }

  /**
   * Converte um CreateVehicleDto para uma instância parcial de Vehicle
   */
  fromCreateDto(
    createVehicleDto: CreateVehicleDto,
    userId: string,
  ): Partial<Vehicle> {
    return {
      plate: createVehicleDto.plate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      brand: this.capitalizeFirstLetter(createVehicleDto.brand),
      model: this.capitalizeFirstLetter(createVehicleDto.model),
      year: createVehicleDto.year,
      color: this.capitalizeFirstLetter(createVehicleDto.color),
      mileage: createVehicleDto.mileage || 0,
      status: VehicleStatus.ACTIVE,
      userId,
    };
  }

  /**
   * Converte um array de Vehicle para array de VehicleResponseDto
   */
  async toResponseDtoArray(vehicles: Vehicle[]): Promise<VehicleResponseDto[]> {
    return await Promise.all(
      vehicles.map((vehicle) => this.toResponseDto(vehicle)),
    );
  }

  /**
   * Cria uma instância de Vehicle a partir de dados básicos
   */
  createVehicle(data: Partial<Vehicle>): Vehicle {
    // ✅ CORRIGIDO: Não usa mais o construtor customizado
    const vehicle = new Vehicle();

    // Atribui todas as propriedades manualmente
    Object.assign(vehicle, {
      ...data,
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
    });

    return vehicle;
  }

  /**
   * Formata a placa do veículo
   */
  formatPlate(plate: string): string {
    const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (cleanPlate.length === 7) {
      if (/^[A-Z]{3}\d{4}$/.test(cleanPlate)) {
        return cleanPlate.replace(/^([A-Z]{3})(\d{4})$/, '$1-$2');
      } else if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(cleanPlate)) {
        return cleanPlate;
      }
    }

    return cleanPlate;
  }

  /**
   * Valida se a placa está no formato correto
   */
  isValidPlate(plate: string): boolean {
    const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const oldFormat = /^[A-Z]{3}\d{4}$/;
    const mercosulFormat = /^[A-Z]{3}\d[A-Z]\d{2}$/;

    return oldFormat.test(cleanPlate) || mercosulFormat.test(cleanPlate);
  }

  /**
   * Formata o nome/marca/modelo com primeira letra maiúscula
   */
  private capitalizeFirstLetter(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Gera um resumo do veículo para exibição
   */
  getVehicleSummary(vehicle: Vehicle): string {
    return `${vehicle.brand} ${vehicle.model} ${vehicle.year} - ${vehicle.plate}`;
  }

  /**
   * Verifica se o veículo está ativo
   */
  isActive(vehicle: Vehicle): boolean {
    return vehicle.status === VehicleStatus.ACTIVE;
  }

  /**
   * Verifica se o veículo foi vendido
   */
  isSold(vehicle: Vehicle): boolean {
    return vehicle.status === VehicleStatus.SOLD;
  }

  /**
   * Formata quilometragem para exibição
   */
  formatMileage(mileage: number): string {
    return new Intl.NumberFormat('pt-BR').format(mileage) + ' km';
  }

  /**
   * Calcula a idade do veículo
   */
  getVehicleAge(year: number): number {
    return new Date().getFullYear() - year;
  }

  /**
   * Normaliza dados de entrada do veículo
   */
  normalizeVehicleData(data: Partial<Vehicle>): Partial<Vehicle> {
    return {
      ...data,
      plate: data.plate
        ? data.plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
        : undefined,
      brand: data.brand ? this.capitalizeFirstLetter(data.brand) : undefined,
      model: data.model ? this.capitalizeFirstLetter(data.model) : undefined,
      color: data.color ? this.capitalizeFirstLetter(data.color) : undefined,
    };
  }
}
