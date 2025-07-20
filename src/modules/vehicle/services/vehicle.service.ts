import { Injectable, NotFoundException } from '@nestjs/common';
import { VehicleRepository } from '../repositories/vehicle.repository';
import { VehicleBusinessRulesService } from './vehicle-business-rules.service';
import { VehicleFactory } from '../factories/vehicle.factory';
import { IVehicleService } from '../interfaces/vehicle.interface';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { VehicleResponseDto } from '../dto/vehicle-response.dto';
import { MarkVehicleSoldDto } from '../dto/mark-vehicle-sold.dto';

@Injectable()
export class VehicleService implements IVehicleService {
  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly businessRules: VehicleBusinessRulesService,
    private readonly vehicleFactory: VehicleFactory,
  ) {}

  async createVehicle(
    createVehicleDto: CreateVehicleDto,
    userId: string,
  ): Promise<VehicleResponseDto> {
    // Validar regras de negócio
    await this.businessRules.validateActiveVehicleLimit(userId);
    await this.businessRules.validateUniquePlate(createVehicleDto.plate);
    await this.businessRules.validateUniqueRenavam(createVehicleDto.renavam);

    // Criar veículo
    const vehicle = await this.vehicleRepository.create(createVehicleDto, userId);

    return this.vehicleFactory.toResponseDto(vehicle);
  }

  async findUserVehicles(userId: string): Promise<{
    active: VehicleResponseDto[];
    sold: VehicleResponseDto[];
  }> {
    const [activeVehicles, soldVehicles] = await Promise.all([
      this.vehicleRepository.findActiveByUserId(userId),
      this.vehicleRepository.findSoldByUserId(userId),
    ]);

    return {
      active: activeVehicles.map(vehicle => this.vehicleFactory.toResponseDto(vehicle)),
      sold: soldVehicles.map(vehicle => this.vehicleFactory.toResponseDto(vehicle)),
    };
  }

  async findVehicleById(id: string, userId: string): Promise<VehicleResponseDto> {
    const vehicle = await this.vehicleRepository.findByIdAndUserId(id, userId);

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    return this.vehicleFactory.toResponseDto(vehicle);
  }

  async updateVehicle(
    id: string,
    updateVehicleDto: UpdateVehicleDto,
    userId: string,
  ): Promise<VehicleResponseDto> {
    // Validar propriedade e permissões
    await this.businessRules.validateVehicleOwnership(id, userId);
    await this.businessRules.validateVehicleCanBeUpdated(id);

    // Atualizar veículo
    const vehicle = await this.vehicleRepository.update(id, updateVehicleDto);

    return this.vehicleFactory.toResponseDto(vehicle);
  }

  async markVehicleAsSold(
    id: string,
    markVehicleSoldDto: MarkVehicleSoldDto,
    userId: string,
  ): Promise<VehicleResponseDto> {
    // Validar regras de negócio
    await this.businessRules.validateVehicleCanBeSold(id, userId);

    // Marcar como vendido
    const soldAt = markVehicleSoldDto.soldAt ? new Date(markVehicleSoldDto.soldAt) : new Date();
    const vehicle = await this.vehicleRepository.markAsSold(id, soldAt);

    return this.vehicleFactory.toResponseDto(vehicle);
  }

  async getActiveVehiclesCount(userId: string): Promise<number> {
    return this.vehicleRepository.countActiveByUserId(userId);
  }

  async deleteVehicle(id: string, userId: string): Promise<void> {
    // Validar propriedade
    await this.businessRules.validateVehicleOwnership(id, userId);

    // Deletar veículo
    await this.vehicleRepository.delete(id);
  }
}
