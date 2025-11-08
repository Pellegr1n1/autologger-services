import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { VehicleRepository } from '../repositories/vehicle.repository';

@Injectable()
export class VehicleBusinessRulesService {
  constructor(private readonly vehicleRepository: VehicleRepository) {}

  async validateActiveVehicleLimit(userId: string): Promise<void> {
    const activeVehiclesCount = await this.vehicleRepository.countActiveByUserId(userId);
    
    if (activeVehiclesCount >= 2) {
      throw new BadRequestException(
        'Usuário já possui o limite máximo de 2 veículos ativos. ' +
        'Marque um veículo como vendido para cadastrar um novo.'
      );
    }
  }

  async validateUniquePlate(plate: string, excludeId?: string): Promise<void> {
    const exists = await this.vehicleRepository.existsByPlate(plate, excludeId);
    
    if (exists) {
      throw new ConflictException(`Já existe um veículo cadastrado com a placa ${plate}`);
    }
  }

  async validateVehicleOwnership(vehicleId: string, userId: string): Promise<void> {
    const vehicle = await this.vehicleRepository.findByIdAndUserId(vehicleId, userId);
    
    if (!vehicle) {
      throw new BadRequestException('Veículo não encontrado ou não pertence ao usuário');
    }
  }

  async validateVehicleCanBeUpdated(vehicleId: string): Promise<void> {
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    
    if (!vehicle) {
      throw new BadRequestException('Veículo não encontrado');
    }

    // Adicionar validações específicas se necessário
    // Por exemplo: não permitir edição de veículos vendidos em certas condições
  }

  async validateVehicleCanBeSold(vehicleId: string, userId: string): Promise<void> {
    const vehicle = await this.vehicleRepository.findByIdAndUserId(vehicleId, userId);
    
    if (!vehicle) {
      throw new BadRequestException('Veículo não encontrado ou não pertence ao usuário');
    }

    if (vehicle.status === 'sold') {
      throw new BadRequestException('Veículo já foi marcado como vendido');
    }
  }
}