import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Vehicle } from '../entities/vehicle.entity';
import { VehicleStatus } from '../enums/vehicle-status.enum';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';

@Injectable()
export class VehicleRepository {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async create(
    createVehicleDto: CreateVehicleDto,
    userId: string,
  ): Promise<Vehicle> {
    const vehicle = this.vehicleRepository.create({
      ...createVehicleDto,
      userId,
      mileage: createVehicleDto.mileage || 0,
    });

    return this.vehicleRepository.save(vehicle);
  }

  async findById(id: string): Promise<Vehicle | null> {
    return this.vehicleRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Vehicle | null> {
    return this.vehicleRepository.findOne({
      where: { id, userId },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<Vehicle[]> {
    return this.vehicleRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveByUserId(userId: string): Promise<Vehicle[]> {
    return this.vehicleRepository.find({
      where: { 
        userId, 
        status: VehicleStatus.ACTIVE 
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findSoldByUserId(userId: string): Promise<Vehicle[]> {
    return this.vehicleRepository.find({
      where: { 
        userId, 
        status: VehicleStatus.SOLD 
      },
      order: { soldAt: 'DESC' },
    });
  }

  async countActiveByUserId(userId: string): Promise<number> {
    return this.vehicleRepository.count({
      where: { 
        userId, 
        status: VehicleStatus.ACTIVE 
      },
    });
  }

  async existsByPlate(plate: string, excludeId?: string): Promise<boolean> {
    const whereCondition: FindOptionsWhere<Vehicle> = { plate };
    
    if (excludeId) {
      whereCondition.id = { $ne: excludeId } as any;
    }

    const count = await this.vehicleRepository.count({
      where: whereCondition,
    });

    return count > 0;
  }

  async update(
    id: string,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    await this.vehicleRepository.update(id, updateVehicleDto);
    return this.findById(id);
  }

  async markAsSold(id: string, soldAt?: Date): Promise<Vehicle> {
    const soldDate = soldAt || new Date();
    
    await this.vehicleRepository.update(id, {
      status: VehicleStatus.SOLD,
      soldAt: soldDate,
    });

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.vehicleRepository.delete(id);
  }

  async findByStatus(status: VehicleStatus): Promise<Vehicle[]> {
    return this.vehicleRepository.find({
      where: { status },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}