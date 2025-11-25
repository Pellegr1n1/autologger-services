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
import { LoggerService } from '../../../common/logger/logger.service';

@Injectable()
export class VehicleService implements IVehicleService {
  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly businessRules: VehicleBusinessRulesService,
    private readonly vehicleFactory: VehicleFactory,
    private readonly fileUploadService: FileUploadService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('VehicleService');
  }

  async createVehicle(
    createVehicleDto: CreateVehicleDto,
    userId: string,
  ): Promise<VehicleResponseDto> {
    try {
      await this.businessRules.validateActiveVehicleLimit(userId);
      await this.businessRules.validateUniquePlate(createVehicleDto.plate);

      let photoUrl: string = null;
      if (createVehicleDto.photo) {
        try {
          photoUrl = await this.fileUploadService.uploadPhoto(
            createVehicleDto.photo,
          );
        } catch (error) {
          this.logger.error(
            'Erro ao fazer upload da foto do veículo',
            error.stack,
            'VehicleService',
            { userId },
          );
          // Continuar sem foto se houver erro no upload
        }
      }

      const vehicleData = {
        ...createVehicleDto,
        photoUrl,
      };
      delete vehicleData.photo;

      const vehicle = await this.vehicleRepository.create(vehicleData, userId);
      return await this.vehicleFactory.toResponseDto(vehicle);
    } catch (error) {
      this.logger.error(
        'Erro ao criar veículo',
        error.stack,
        'VehicleService',
        { userId, plate: createVehicleDto?.plate },
      );
      throw error;
    }
  }

  async findUserVehicles(userId: string): Promise<{
    active: VehicleResponseDto[];
    sold: VehicleResponseDto[];
  }> {
    try {
      const [activeVehicles, soldVehicles] = await Promise.all([
        this.vehicleRepository.findActiveByUserId(userId),
        this.vehicleRepository.findSoldByUserId(userId),
      ]);

      return {
        active: await Promise.all(
          activeVehicles.map((vehicle) =>
            this.vehicleFactory.toResponseDto(vehicle),
          ),
        ),
        sold: await Promise.all(
          soldVehicles.map((vehicle) =>
            this.vehicleFactory.toResponseDto(vehicle),
          ),
        ),
      };
    } catch (error) {
      this.logger.error(
        'Erro ao buscar veículos do usuário',
        error.stack,
        'VehicleService',
        { userId },
      );
      throw error;
    }
  }

  async findVehicleById(
    id: string,
    userId: string,
  ): Promise<VehicleResponseDto> {
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
    await this.businessRules.validateVehicleOwnership(id, userId);
    await this.businessRules.validateVehicleCanBeUpdated(id);

    const currentVehicle = await this.vehicleRepository.findByIdAndUserId(
      id,
      userId,
    );

    let photoUrl: string = currentVehicle.photoUrl;
    if (updateVehicleDto.photo) {
      if (currentVehicle.photoUrl) {
        await this.fileUploadService.deletePhoto(currentVehicle.photoUrl);
      }
      photoUrl = await this.fileUploadService.uploadPhoto(
        updateVehicleDto.photo,
      );
    }

    const vehicleData = {
      ...updateVehicleDto,
      photoUrl,
    };
    delete vehicleData.photo;

    const vehicle = await this.vehicleRepository.update(id, vehicleData);
    return await this.vehicleFactory.toResponseDto(vehicle);
  }

  async markVehicleAsSold(
    id: string,
    markVehicleSoldDto: MarkVehicleSoldDto,
    userId: string,
  ): Promise<VehicleResponseDto> {
    await this.businessRules.validateVehicleCanBeSold(id, userId);

    const soldAt = markVehicleSoldDto.soldAt
      ? new Date(markVehicleSoldDto.soldAt)
      : new Date();
    const vehicle = await this.vehicleRepository.markAsSold(id, soldAt);
    return await this.vehicleFactory.toResponseDto(vehicle);
  }

  async getActiveVehiclesCount(userId: string): Promise<number> {
    return this.vehicleRepository.countActiveByUserId(userId);
  }

  async deleteVehicle(id: string, userId: string): Promise<void> {
    await this.businessRules.validateVehicleOwnership(id, userId);

    const vehicle = await this.vehicleRepository.findByIdAndUserId(id, userId);

    if (vehicle.photoUrl) {
      await this.fileUploadService.deletePhoto(vehicle.photoUrl);
    }

    await this.vehicleRepository.delete(id);
  }
}
