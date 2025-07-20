import { Vehicle } from '../entities/vehicle.entity';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { VehicleResponseDto } from '../dto/vehicle-response.dto';
import { MarkVehicleSoldDto } from '../dto/mark-vehicle-sold.dto';
import { VehicleStatus } from '../enums/vehicle-status.enum';

export interface IVehicleService {
  createVehicle(createVehicleDto: CreateVehicleDto, userId: string): Promise<VehicleResponseDto>;
  findUserVehicles(userId: string): Promise<{
    active: VehicleResponseDto[];
    sold: VehicleResponseDto[];
  }>;
  findVehicleById(id: string, userId: string): Promise<VehicleResponseDto>;
  updateVehicle(id: string, updateVehicleDto: UpdateVehicleDto, userId: string): Promise<VehicleResponseDto>;
  markVehicleAsSold(id: string, markVehicleSoldDto: MarkVehicleSoldDto, userId: string): Promise<VehicleResponseDto>;
  getActiveVehiclesCount(userId: string): Promise<number>;
  deleteVehicle(id: string, userId: string): Promise<void>;
}

export interface IVehicleRepository {
  create(createVehicleDto: CreateVehicleDto, userId: string): Promise<Vehicle>;
  findById(id: string): Promise<Vehicle | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Vehicle | null>;
  findByUserId(userId: string): Promise<Vehicle[]>;
  findActiveByUserId(userId: string): Promise<Vehicle[]>;
  findSoldByUserId(userId: string): Promise<Vehicle[]>;
  countActiveByUserId(userId: string): Promise<number>;
  existsByPlate(plate: string, excludeId?: string): Promise<boolean>;
  existsByRenavam(renavam: string, excludeId?: string): Promise<boolean>;
  update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<Vehicle>;
  markAsSold(id: string, soldAt?: Date): Promise<Vehicle>;
  delete(id: string): Promise<void>;
  findByStatus(status: VehicleStatus): Promise<Vehicle[]>;
}

export interface IVehicleBusinessRules {
  validateActiveVehicleLimit(userId: string): Promise<void>;
  validateUniquePlate(plate: string, excludeId?: string): Promise<void>;
  validateUniqueRenavam(renavam: string, excludeId?: string): Promise<void>;
  validateVehicleOwnership(vehicleId: string, userId: string): Promise<void>;
  validateVehicleCanBeUpdated(vehicleId: string): Promise<void>;
  validateVehicleCanBeSold(vehicleId: string, userId: string): Promise<void>;
}

export interface IVehicleFactory {
  toResponseDto(vehicle: Vehicle): VehicleResponseDto;
  fromCreateDto(createVehicleDto: CreateVehicleDto, userId: string): Partial<Vehicle>;
  toResponseDtoArray(vehicles: Vehicle[]): VehicleResponseDto[];
  createVehicle(data: Partial<Vehicle>): Vehicle;
  formatPlate(plate: string): string;
  isValidPlate(plate: string): boolean;
  isValidRenavam(renavam: string): boolean;
  getVehicleSummary(vehicle: Vehicle): string;
  isActive(vehicle: Vehicle): boolean;
  isSold(vehicle: Vehicle): boolean;
}

export interface VehicleSearchFilters {
  status?: VehicleStatus;
  brand?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  mileageFrom?: number;
  mileageTo?: number;
}

export interface VehicleStatistics {
  totalVehicles: number;
  activeVehicles: number;
  soldVehicles: number;
  averageMileage: number;
  mostCommonBrand: string;
  oldestVehicle: Vehicle | null;
  newestVehicle: Vehicle | null;
}