import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { QuantumCircuitEntity } from './quantum-circuit.entity';
import { QuantumDeviceEntity } from './quantum-device.entity';

export enum JobStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface JobResults {
  counts: Record<string, number>;
  probabilities: Record<string, number>;
  memory?: string[];
  executionTime: number;
  queueTime: number;
  shots: number;
  success: boolean;
  fidelity?: number;
  errorRate?: number;
  calibrationData?: any;
}

export interface JobParameters {
  shots: number;
  memory: boolean;
  seedSimulator?: number;
  seedTranspiler?: number;
  optimizationLevel: number;
  maxCredits?: number;
  customGateSet?: string[];
  errorMitigation?: {
    enabled: boolean;
    method: string;
    options?: any;
  };
}

export interface SchedulingInfo {
  estimatedStartTime?: Date;
  estimatedCompletionTime?: Date;
  actualStartTime?: Date;
  actualCompletionTime?: Date;
  queuePosition?: number;
  priority: number;
  schedulingScore?: number;
  devicePreference?: string;
}

@Entity('quantum_jobs')
export class QuantumJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING
  })
  status: JobStatus;

  @Column({
    type: 'enum',
    enum: JobPriority,
    default: JobPriority.NORMAL
  })
  priority: JobPriority;

  @Column({ type: 'json' })
  parameters: JobParameters;

  @Column({ type: 'json', nullable: true })
  results: JobResults;

  @Column({ type: 'json', nullable: true })
  schedulingInfo: SchedulingInfo;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerJobId: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'json', nullable: true })
  errorDetails: any;

  @Column({ type: 'float', nullable: true })
  cost: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', nullable: true })
  executionTimeMs: number;

  @Column({ type: 'int', nullable: true })
  queueTimeMs: number;

  @Column({ type: 'json', nullable: true })
  metrics: {
    cpuUsage?: number;
    memoryUsage?: number;
    networkLatency?: number;
    deviceUtilization?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity, user => user.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  userId: string;

  @ManyToOne(() => QuantumCircuitEntity, circuit => circuit.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'circuitId' })
  circuit: QuantumCircuitEntity;

  @Column()
  circuitId: string;

  @ManyToOne(() => QuantumDeviceEntity, device => device.jobs, { nullable: true })
  @JoinColumn({ name: 'deviceId' })
  device: QuantumDeviceEntity;

  @Column({ nullable: true })
  deviceId: string;

  // Virtual fields
  get isCompleted(): boolean {
    return this.status === JobStatus.COMPLETED;
  }

  get isFailed(): boolean {
    return this.status === JobStatus.FAILED || this.status === JobStatus.TIMEOUT;
  }

  get isRunning(): boolean {
    return this.status === JobStatus.RUNNING || this.status === JobStatus.QUEUED;
  }

  get totalTimeMs(): number {
    if (this.submittedAt && this.completedAt) {
      return this.completedAt.getTime() - this.submittedAt.getTime();
    }
    return 0;
  }

  get successRate(): number {
    if (!this.results || !this.results.success) return 0;
    return this.results.fidelity || 1;
  }

  get efficiency(): number {
    if (!this.executionTimeMs || !this.queueTimeMs) return 0;
    return this.executionTimeMs / (this.executionTimeMs + this.queueTimeMs);
  }

  // Helper methods
  updateStatus(status: JobStatus, errorMessage?: string): void {
    this.status = status;
    if (errorMessage) {
      this.errorMessage = errorMessage;
    }

    const now = new Date();
    switch (status) {
      case JobStatus.QUEUED:
        this.submittedAt = now;
        break;
      case JobStatus.RUNNING:
        this.startedAt = now;
        if (this.submittedAt) {
          this.queueTimeMs = now.getTime() - this.submittedAt.getTime();
        }
        break;
      case JobStatus.COMPLETED:
      case JobStatus.FAILED:
      case JobStatus.CANCELLED:
      case JobStatus.TIMEOUT:
        this.completedAt = now;
        if (this.startedAt) {
          this.executionTimeMs = now.getTime() - this.startedAt.getTime();
        }
        break;
    }
  }

  setResults(results: JobResults): void {
    this.results = results;
    this.status = results.success ? JobStatus.COMPLETED : JobStatus.FAILED;
    this.updateStatus(this.status);
  }

  calculateCost(device: QuantumDeviceEntity): number {
    if (!device.costModel) return 0;

    const shotCost = this.parameters.shots * device.costModel.costPerShot;
    const timeCost = this.executionTimeMs ? (this.executionTimeMs / 1000) * device.costModel.costPerSecond : 0;
    
    return Math.max(shotCost + timeCost, device.costModel.minimumCost || 0);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      status: this.status,
      priority: this.priority,
      parameters: this.parameters,
      results: this.results,
      cost: this.cost,
      currency: this.currency,
      executionTimeMs: this.executionTimeMs,
      queueTimeMs: this.queueTimeMs,
      totalTimeMs: this.totalTimeMs,
      successRate: this.successRate,
      efficiency: this.efficiency,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      submittedAt: this.submittedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    };
  }
}