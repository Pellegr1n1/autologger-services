import { Injectable, NotFoundException } from '@nestjs/common';
import { VehicleRepository } from '../repositories/vehicle.repository';
import { VehicleBusinessRulesService } from './vehicle-business-rules.service';
import { VehicleFactory } from '../factories/vehicle.factory';
import { IVehicleService } from '../interfaces/vehicle.interface';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { VehicleResponseDto } from '../dto/vehicle-response.dto';
import { MarkVehicleSoldDto } from '../dto/mark-vehicle-sold.dto';
import { FileUploadService } from './file-upload.service';

@Injectable()
export class VehicleService implements IVehicleService {
  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly businessRules: VehicleBusinessRulesService,
    private readonly vehicleFactory: VehicleFactory,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async createVehicle(
    createVehicleDto: CreateVehicleDto,
    userId: string,
  ): Promise<VehicleResponseDto> {
    // Validar regras de negócio
    await this.businessRules.validateActiveVehicleLimit(userId);
    await this.businessRules.validateUniquePlate(createVehicleDto.plate);

    // Upload da foto se fornecida
    let photoUrl: string = null;
    if (createVehicleDto.photo) {
      photoUrl = await this.fileUploadService.uploadPhoto(createVehicleDto.photo);
    }

    // Criar veículo com foto
    const vehicleData = {
      ...createVehicleDto,
      photoUrl,
    };
    delete vehicleData.photo; // Remover arquivo do DTO

    const vehicle = await this.vehicleRepository.create(vehicleData, userId);

    return await this.vehicleFactory.toResponseDto(vehicle);
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
      active: await Promise.all(activeVehicles.map(vehicle => this.vehicleFactory.toResponseDto(vehicle))),
      sold: await Promise.all(soldVehicles.map(vehicle => this.vehicleFactory.toResponseDto(vehicle))),
    };
  }

  async findVehicleById(id: string, userId: string): Promise<VehicleResponseDto> {
    const vehicle = await this.vehicleRepository.findByIdAndUserId(id, userId);

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    return await this.vehicleFactory.toResponseDto(vehicle);
  }

  async updateVehicle(
    id: string,
    updateVehicleDto: UpdateVehicleDto,
    userId: string,
  ): Promise<VehicleResponseDto> {
    // Validar propriedade e permissões
    await this.businessRules.validateVehicleOwnership(id, userId);
    await this.businessRules.validateVehicleCanBeUpdated(id);

    // Buscar veículo atual para verificar se tem foto
    const currentVehicle = await this.vehicleRepository.findByIdAndUserId(id, userId);
    
    // Upload da nova foto se fornecida
    let photoUrl: string = currentVehicle.photoUrl;
    if (updateVehicleDto.photo) {
      // Deletar foto antiga se existir
      if (currentVehicle.photoUrl) {
        await this.fileUploadService.deletePhoto(currentVehicle.photoUrl);
      }
      
      // Upload da nova foto
      photoUrl = await this.fileUploadService.uploadPhoto(updateVehicleDto.photo);
    }

    // Atualizar veículo com foto
    const vehicleData = {
      ...updateVehicleDto,
      photoUrl,
    };
    delete vehicleData.photo; // Remover arquivo do DTO

    const vehicle = await this.vehicleRepository.update(id, vehicleData);

    return await this.vehicleFactory.toResponseDto(vehicle);
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

    return await this.vehicleFactory.toResponseDto(vehicle);
  }

  async getActiveVehiclesCount(userId: string): Promise<number> {
    return this.vehicleRepository.countActiveByUserId(userId);
  }

  async deleteVehicle(id: string, userId: string): Promise<void> {
    // Validar propriedade
    await this.businessRules.validateVehicleOwnership(id, userId);

    // Buscar veículo para deletar foto
    const vehicle = await this.vehicleRepository.findByIdAndUserId(id, userId);
    
    // Deletar foto se existir
    if (vehicle.photoUrl) {
      await this.fileUploadService.deletePhoto(vehicle.photoUrl);
    }

    // Deletar veículo
    await this.vehicleRepository.delete(id);
  }
}
