import { Injectable } from '@nestjs/common';
import { Vehicle } from '../entities/vehicle.entity';
import { VehicleResponseDto } from '../dto/vehicle-response.dto';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { VehicleStatus } from '../enums/vehicle-status.enum';

@Injectable()
export class VehicleFactory {
  /**
   * Converte uma entidade Vehicle para VehicleResponseDto
   */
  toResponseDto(vehicle: Vehicle): VehicleResponseDto {
    return new VehicleResponseDto({
      id: vehicle.id,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      renavam: vehicle.renavam,
      mileage: vehicle.mileage,
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
      renavam: createVehicleDto.renavam,
      mileage: createVehicleDto.mileage || 0,
      status: VehicleStatus.ACTIVE,
      userId,
    };
  }

  /**
   * Converte um array de Vehicle para array de VehicleResponseDto
   */
  toResponseDtoArray(vehicles: Vehicle[]): VehicleResponseDto[] {
    return vehicles.map(vehicle => this.toResponseDto(vehicle));
  }

  /**
   * Cria uma instância de Vehicle a partir de dados básicos
   */
  createVehicle(data: Partial<Vehicle>): Vehicle {
    return new Vehicle({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Formata a placa do veículo
   */
  formatPlate(plate: string): string {
    const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (cleanPlate.length === 7) {
      return cleanPlate.replace(/^([A-Z]{3})([0-9]{4})$/, '$1-$2');
    } else if (cleanPlate.length === 7 && /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(cleanPlate)) {
      return cleanPlate.replace(/^([A-Z]{3})([0-9][A-Z][0-9]{2})$/, '$1-$2');
    }
    
    return cleanPlate;
  }

  /**
   * Valida se a placa está no formato correto
   */
  isValidPlate(plate: string): boolean {
    const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
    const mercosulFormat = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
    
    return oldFormat.test(cleanPlate) || mercosulFormat.test(cleanPlate);
  }

  /**
   * Valida se o RENAVAM está no formato correto
   */
  isValidRenavam(renavam: string): boolean {
    const cleanRenavam = renavam.replace(/\D/g, '');
    return cleanRenavam.length === 11 && /^[0-9]{11}$/.test(cleanRenavam);
  }

  /**
   * Formata o nome/marca/modelo com primeira letra maiúscula
   */
  private capitalizeFirstLetter(text: string): string {
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
}