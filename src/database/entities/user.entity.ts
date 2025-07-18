import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { QuantumCircuitEntity } from './quantum-circuit.entity';
import { QuantumJobEntity } from './quantum-job.entity';

export enum LicenseType {
  FREE = 'free',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  ACADEMIC = 'academic'
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  RESEARCHER = 'researcher',
  DEVELOPER = 'developer'
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  username: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ unique: true, length: 255 })
  licenseKey: string;

  @Column({
    type: 'enum',
    enum: LicenseType,
    default: LicenseType.FREE
  })
  licenseType: LicenseType;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date;

  @Column({ type: 'json', nullable: true })
  preferences: {
    theme: string;
    notifications: boolean;
    defaultShots: number;
    schedulingWeights: {
      performance: number;
      cost: number;
      reliability: number;
      availability: number;
    };
    preferredProviders: string[];
    maxCostPerJob: number;
    maxWaitTime: number;
  };

  @Column({ type: 'json', nullable: true })
  quotas: {
    maxJobs: number;
    maxCircuits: number;
    maxShotsPerJob: number;
    maxJobsPerHour: number;
    storageLimit: number; // in MB
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => QuantumCircuitEntity, circuit => circuit.user)
  circuits: QuantumCircuitEntity[];

  @OneToMany(() => QuantumJobEntity, job => job.user)
  jobs: QuantumJobEntity[];

  // Virtual fields
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isEnterprise(): boolean {
    return this.licenseType === LicenseType.ENTERPRISE;
  }

  get isProfessional(): boolean {
    return this.licenseType === LicenseType.PROFESSIONAL || this.licenseType === LicenseType.ENTERPRISE;
  }
}