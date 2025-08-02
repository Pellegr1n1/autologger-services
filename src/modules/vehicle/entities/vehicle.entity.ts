import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { VehicleStatus } from '../enums/vehicle-status.enum';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 8, unique: true })
  plate: string;

  @Column({ type: 'varchar', length: 50 })
  brand: string;

  @Column({ type: 'varchar', length: 50 })
  model: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar', length: 30 })
  color: string;

  @Column({ type: 'varchar', length: 11, unique: true })
  renavam: string;

  @Column({ type: 'int', default: 0 })
  mileage: number;

  @Column({
    type: 'enum',
    enum: VehicleStatus,
    default: VehicleStatus.ACTIVE
  })
  status: VehicleStatus;

  @Column({ type: 'timestamp', nullable: true })
  soldAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.vehicles, { 
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Relacionamento com eventos (será implementado no módulo de eventos)
  // @OneToMany(() => Event, event => event.vehicle, {
  //   cascade: ['remove'], // Deletar eventos se deletar veículo
  //   eager: false,
  // })
  // events: Event[];
}