import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany
} from 'typeorm';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ unique: true, length: 255 })
    email: string;


    @Column({ nullable: true })
    password?: string;

    @Column({ nullable: true })
    googleId?: string;

    @Column({ nullable: true })
    avatar?: string;

    @Column({ default: 'local' })
    authProvider: 'local' | 'google';

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => Vehicle, (vehicle) => vehicle.user, {
        cascade: false,
        eager: false,
    })
    vehicles: Vehicle[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }
}