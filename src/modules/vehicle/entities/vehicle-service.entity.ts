import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';

export enum ServiceStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum ServiceType {
  MAINTENANCE = 'maintenance',
  REPAIR = 'repair',
  INSPECTION = 'inspection',
  FUEL = 'fuel',
  EXPENSE = 'expense',
  OTHER = 'other',
}

@Entity('vehicle_services')
export class VehicleService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({
    type: 'enum',
    enum: ServiceType,
    default: ServiceType.MAINTENANCE,
  })
  type: ServiceType;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'service_date', type: 'date' })
  serviceDate: Date;

  @Column({ type: 'integer' })
  mileage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cost: number;

  @Column({ type: 'varchar', length: 200 })
  location: string;

  @Column({ type: 'text', array: true, nullable: true })
  attachments: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  technician: string;

  @Column({ type: 'boolean', default: false })
  warranty: boolean;

  @Column({ name: 'next_service_date', type: 'date', nullable: true })
  nextServiceDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.PENDING,
  })
  status: ServiceStatus;

  // Blockchain fields
  @Column({ name: 'blockchain_hash', type: 'varchar', length: 66, nullable: true })
  blockchainHash: string;

  @Column({ name: 'previous_hash', type: 'varchar', length: 66, nullable: true })
  previousHash: string;

  @Column({ name: 'merkle_root', type: 'varchar', length: 66, nullable: true })
  merkleRoot: string;

  @Column({ name: 'is_immutable', type: 'boolean', default: false })
  isImmutable: boolean;

  @Column({ name: 'can_edit', type: 'boolean', default: true })
  canEdit: boolean;

  @Column({ name: 'blockchain_confirmed_at', type: 'timestamp', nullable: true })
  blockchainConfirmedAt: Date;

  @Column({ name: 'confirmed_by', type: 'varchar', length: 100, nullable: true })
  confirmedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
