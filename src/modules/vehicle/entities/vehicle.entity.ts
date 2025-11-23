import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { VehicleStatus } from '../enums/vehicle-status.enum';
import { EncryptedTransformer } from '../../../common/decorators/encrypted-column.decorator';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Placa do veículo (criptografada no banco de dados)
   * Usa criptografia determinística para permitir constraints UNIQUE e buscas
   */
  @Column({
    type: 'varchar',
    length: 255, // Aumentado para acomodar texto criptografado em base64
    unique: true,
    transformer: new EncryptedTransformer(),
  })
  plate: string;

  @Column({ type: 'varchar', length: 50 })
  brand: string;

  @Column({ type: 'varchar', length: 50 })
  model: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar', length: 30 })
  color: string;

  @Column({ type: 'int', default: 0 })
  mileage: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photoUrl: string;

  @Column({
    type: 'enum',
    enum: VehicleStatus,
    default: VehicleStatus.ACTIVE,
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
