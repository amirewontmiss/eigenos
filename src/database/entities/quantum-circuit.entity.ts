import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { QuantumJobEntity } from './quantum-job.entity';

export interface QuantumGateData {
  id: string;
  type: string;
  qubits: number[];
  parameters?: number[];
  position: { x: number; y: number };
  label?: string;
}

export interface QuantumMeasurementData {
  qubit: number;
  classicalBit: number;
}

export interface CircuitMetadata {
  author?: string;
  description?: string;
  tags?: string[];
  version?: string;
  complexity?: {
    depth: number;
    gateCount: number;
    twoQubitGateCount: number;
  };
  optimizations?: {
    level: number;
    transpiled: boolean;
    targetDevice?: string;
  };
}

@Entity('quantum_circuits')
export class QuantumCircuitEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int' })
  qubits: number;

  @Column({ type: 'int' })
  classicalBits: number;

  @Column({ type: 'json' })
  gates: QuantumGateData[];

  @Column({ type: 'json', nullable: true })
  measurements: QuantumMeasurementData[];

  @Column({ type: 'json', nullable: true })
  metadata: CircuitMetadata;

  @Column({ type: 'text', nullable: true })
  qasmCode: string;

  @Column({ type: 'int', default: 0 })
  depth: number;

  @Column({ type: 'int', default: 0 })
  gateCount: number;

  @Column({ type: 'boolean', default: false })
  isTemplate: boolean;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'boolean', default: false })
  isOptimized: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  parentCircuitId: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  usage_count: number;

  @Column({ type: 'float', nullable: true })
  averageExecutionTime: number;

  @Column({ type: 'float', nullable: true })
  averageFidelity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity, user => user.circuits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  userId: string;

  @OneToMany(() => QuantumJobEntity, job => job.circuit)
  jobs: QuantumJobEntity[];

  // Virtual fields
  get complexity(): 'low' | 'medium' | 'high' | 'extreme' {
    if (this.gateCount < 10) return 'low';
    if (this.gateCount < 50) return 'medium';
    if (this.gateCount < 200) return 'high';
    return 'extreme';
  }

  get twoQubitGateCount(): number {
    return this.gates.filter(gate => gate.qubits.length === 2).length;
  }

  get parameterizedGateCount(): number {
    return this.gates.filter(gate => gate.parameters && gate.parameters.length > 0).length;
  }

  get estimatedExecutionTime(): number {
    // Simple heuristic: base time + gate time + depth penalty
    const baseTime = 1000; // 1 second base
    const gateTime = this.gateCount * 10; // 10ms per gate
    const depthPenalty = this.depth * 50; // 50ms per depth level
    const qubitPenalty = Math.pow(this.qubits, 1.5) * 100; // Exponential qubit penalty
    
    return baseTime + gateTime + depthPenalty + qubitPenalty;
  }

  // Helper methods
  calculateStats(): void {
    this.gateCount = this.gates.length;
    this.depth = this.calculateDepth();
  }

  private calculateDepth(): number {
    if (this.gates.length === 0) return 0;
    
    const qubitLastUsed = new Array(this.qubits).fill(0);
    let maxDepth = 0;

    for (const gate of this.gates) {
      const gateDepth = Math.max(...gate.qubits.map(q => qubitLastUsed[q])) + 1;
      gate.qubits.forEach(q => qubitLastUsed[q] = gateDepth);
      maxDepth = Math.max(maxDepth, gateDepth);
    }

    return maxDepth;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      qubits: this.qubits,
      classicalBits: this.classicalBits,
      gates: this.gates,
      measurements: this.measurements,
      metadata: this.metadata,
      depth: this.depth,
      gateCount: this.gateCount,
      complexity: this.complexity,
      estimatedExecutionTime: this.estimatedExecutionTime,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}