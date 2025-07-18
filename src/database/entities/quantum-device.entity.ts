import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { QuantumJobEntity } from './quantum-job.entity';

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
  CALIBRATING = 'calibrating',
  ERROR = 'error'
}

export enum DeviceType {
  SIMULATOR = 'simulator',
  SUPERCONDUCTING = 'superconducting',
  ION_TRAP = 'ion_trap',
  PHOTONIC = 'photonic',
  NEUTRAL_ATOM = 'neutral_atom',
  TOPOLOGICAL = 'topological'
}

export interface DeviceTopology {
  couplingMap: [number, number][];
  qubitCount: number;
  dimensions: number;
  connectivity: 'linear' | 'grid' | 'star' | 'full' | 'custom';
  layout?: {
    positions: Array<{ x: number; y: number; z?: number }>;
    connections: Array<{ from: number; to: number; strength?: number }>;
  };
}

export interface DeviceCalibration {
  timestamp: Date;
  gateErrors: Record<string, Record<string, number>>;
  readoutErrors: number[];
  coherenceTimes: {
    T1: number[];
    T2: number[];
    T2Star: number[];
  };
  crossTalk: number[][];
  frequencyMap: number[];
  gateTime: Record<string, number>;
  fidelity: {
    single: number[];
    two: number[][];
    readout: number[];
  };
}

export interface DeviceCostModel {
  costPerShot: number;
  costPerSecond: number;
  minimumCost: number;
  currency: string;
  billing: 'per_shot' | 'per_second' | 'per_job' | 'subscription';
}

export interface DeviceCapabilities {
  maxShots: number;
  maxExperiments: number;
  supportsParametricGates: boolean;
  supportsConditionalOperations: boolean;
  supportsMultipleCircuits: boolean;
  supportedGates: string[];
  nativeGates: string[];
  errorCorrection?: {
    supported: boolean;
    codes: string[];
  };
}

export interface DeviceMetrics {
  uptimePercentage: number;
  avgQueueTime: number;
  avgExecutionTime: number;
  jobsCompleted: number;
  jobsFailed: number;
  totalShots: number;
  currentLoad: number;
  performance: {
    throughput: number;
    reliability: number;
    efficiency: number;
  };
  trends: {
    daily: Array<{ date: string; value: number }>;
    weekly: Array<{ week: string; value: number }>;
    monthly: Array<{ month: string; value: number }>;
  };
}

@Entity('quantum_devices')
export class QuantumDeviceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  providerId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100 })
  provider: string;

  @Column({ length: 50 })
  version: string;

  @Column({
    type: 'enum',
    enum: DeviceType,
    default: DeviceType.SIMULATOR
  })
  type: DeviceType;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.OFFLINE
  })
  status: DeviceStatus;

  @Column({ type: 'json' })
  topology: DeviceTopology;

  @Column({ type: 'json', nullable: true })
  calibration: DeviceCalibration;

  @Column({ type: 'json', nullable: true })
  costModel: DeviceCostModel;

  @Column({ type: 'json' })
  capabilities: DeviceCapabilities;

  @Column({ type: 'json', nullable: true })
  metrics: DeviceMetrics;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  institution: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  queueLength: number;

  @Column({ type: 'float', nullable: true })
  temperature: number; // Operating temperature in K

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ type: 'int', default: 0 })
  maxConcurrentJobs: number;

  @Column({ type: 'timestamp', nullable: true })
  lastCalibration: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextMaintenance: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastStatusUpdate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => QuantumJobEntity, job => job.device)
  jobs: QuantumJobEntity[];

  // Virtual fields
  get isOnline(): boolean {
    return this.status === DeviceStatus.ONLINE;
  }

  get isSimulator(): boolean {
    return this.type === DeviceType.SIMULATOR;
  }

  get qubitCount(): number {
    return this.topology.qubitCount;
  }

  get avgFidelity(): number {
    if (!this.calibration?.fidelity) return 0;
    const singleQubitFidelity = this.calibration.fidelity.single.reduce((a, b) => a + b, 0) / this.calibration.fidelity.single.length;
    const readoutFidelity = this.calibration.fidelity.readout.reduce((a, b) => a + b, 0) / this.calibration.fidelity.readout.length;
    return (singleQubitFidelity + readoutFidelity) / 2;
  }

  get healthScore(): number {
    let score = 1.0;

    // Status factor
    switch (this.status) {
      case DeviceStatus.ONLINE:
        score *= 1.0;
        break;
      case DeviceStatus.MAINTENANCE:
        score *= 0.3;
        break;
      case DeviceStatus.CALIBRATING:
        score *= 0.7;
        break;
      case DeviceStatus.OFFLINE:
      case DeviceStatus.ERROR:
        score *= 0.0;
        break;
    }

    // Queue factor
    const queuePenalty = Math.min(this.queueLength / 100, 0.5);
    score *= (1.0 - queuePenalty);

    // Calibration freshness
    if (this.lastCalibration) {
      const calibrationAge = Date.now() - this.lastCalibration.getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const agePenalty = Math.min(calibrationAge / maxAge, 0.3);
      score *= (1.0 - agePenalty);
    }

    return Math.max(0, Math.min(1, score));
  }

  get estimatedWaitTime(): number {
    if (!this.isOnline) return Infinity;
    
    const avgJobTime = this.metrics?.avgExecutionTime || 60000; // 1 minute default
    return this.queueLength * avgJobTime;
  }

  // Helper methods
  updateStatus(status: DeviceStatus, message?: string): void {
    this.status = status;
    this.lastStatusUpdate = new Date();
    
    if (status === DeviceStatus.ONLINE && this.metrics) {
      this.metrics.uptimePercentage = Math.min(this.metrics.uptimePercentage + 0.1, 100);
    }
  }

  updateCalibration(calibration: Partial<DeviceCalibration>): void {
    this.calibration = { ...this.calibration, ...calibration, timestamp: new Date() } as DeviceCalibration;
    this.lastCalibration = new Date();
  }

  updateMetrics(metrics: Partial<DeviceMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics } as DeviceMetrics;
  }

  addJob(): void {
    this.queueLength += 1;
  }

  removeJob(): void {
    this.queueLength = Math.max(0, this.queueLength - 1);
  }

  canExecuteJob(jobParameters: any): boolean {
    if (!this.isOnline) return false;
    if (this.queueLength >= this.maxConcurrentJobs && this.maxConcurrentJobs > 0) return false;
    if (jobParameters.shots > this.capabilities.maxShots) return false;
    
    // Check if all required gates are supported
    if (jobParameters.requiredGates) {
      return jobParameters.requiredGates.every((gate: string) => 
        this.capabilities.supportedGates.includes(gate)
      );
    }
    
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      providerId: this.providerId,
      name: this.name,
      provider: this.provider,
      version: this.version,
      type: this.type,
      status: this.status,
      qubitCount: this.qubitCount,
      topology: this.topology,
      calibration: this.calibration,
      costModel: this.costModel,
      capabilities: this.capabilities,
      metrics: this.metrics,
      queueLength: this.queueLength,
      avgFidelity: this.avgFidelity,
      healthScore: this.healthScore,
      estimatedWaitTime: this.estimatedWaitTime,
      lastCalibration: this.lastCalibration,
      lastStatusUpdate: this.lastStatusUpdate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}