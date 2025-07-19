import { QuantumCircuit } from '../../../../quantum/core/circuit/quantum-circuit';
import { QuantumGate } from '../../../../quantum/core/gates/quantum-gate';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'GATE_OVERLAP' | 'INVALID_QUBIT' | 'INVALID_CONNECTION' | 'CIRCUIT_DEPTH' | 'GATE_SEQUENCE';
  message: string;
  gateId?: string;
  position?: { x: number; y: number };
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  type: 'OPTIMIZATION' | 'PERFORMANCE' | 'FIDELITY';
  message: string;
  suggestion: string;
  gateIds?: string[];
}

export class CircuitValidator {
  private maxDepth: number = 1000;
  private maxGates: number = 10000;
  
  constructor(options: { maxDepth?: number; maxGates?: number } = {}) {
    this.maxDepth = options.maxDepth || 1000;
    this.maxGates = options.maxGates || 10000;
  }
  
  validateCircuit(circuit: QuantumCircuit): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Basic circuit constraints
    this.validateBasicConstraints(circuit, errors);
    
    // Gate positioning and overlaps
    this.validateGatePositioning(circuit, errors);
    
    // Qubit assignments
    this.validateQubitAssignments(circuit, errors);
    
    // Gate sequences and dependencies
    this.validateGateSequences(circuit, errors, warnings);
    
    // Performance optimizations
    this.validatePerformanceOptimizations(circuit, warnings);
    
    // Quantum fidelity considerations
    this.validateQuantumFidelity(circuit, warnings);
    
    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings
    };
  }
  
  private validateBasicConstraints(circuit: QuantumCircuit, errors: ValidationError[]): void {
    // Check circuit depth
    if (circuit.depth > this.maxDepth) {
      errors.push({
        type: 'CIRCUIT_DEPTH',
        message: `Circuit depth (${circuit.depth}) exceeds maximum allowed depth (${this.maxDepth})`,
        severity: 'error'
      });
    }
    
    // Check total gate count
    if (circuit.gates.length > this.maxGates) {
      errors.push({
        type: 'CIRCUIT_DEPTH',
        message: `Circuit has ${circuit.gates.length} gates, exceeding maximum (${this.maxGates})`,
        severity: 'error'
      });
    }
    
    // Check for minimum circuit requirements
    if (circuit.qubits === 0) {
      errors.push({
        type: 'INVALID_QUBIT',
        message: 'Circuit must have at least one qubit',
        severity: 'error'
      });
    }
  }
  
  private validateGatePositioning(circuit: QuantumCircuit, errors: ValidationError[]): void {
    const gatePositions = new Map<string, QuantumGate[]>();
    
    // Group gates by position
    circuit.gates.forEach(gate => {
      if (!gate.position) return;
      
      const posKey = `${gate.position.x},${gate.position.y}`;
      if (!gatePositions.has(posKey)) {
        gatePositions.set(posKey, []);
      }
      gatePositions.get(posKey)!.push(gate);
    });
    
    // Check for overlapping gates
    gatePositions.forEach((gates, position) => {
      if (gates.length > 1) {
        // Check if gates can coexist at the same position
        const conflictingGates = this.findConflictingGates(gates);
        
        if (conflictingGates.length > 0) {
          errors.push({
            type: 'GATE_OVERLAP',
            message: `Multiple gates overlap at position ${position}`,
            gateId: conflictingGates[0].id,
            position: conflictingGates[0].position,
            severity: 'error'
          });
        }
      }
    });
  }
  
  private findConflictingGates(gates: QuantumGate[]): QuantumGate[] {
    // Gates can coexist if they operate on different qubits
    const qubitMap = new Map<number, QuantumGate[]>();
    
    gates.forEach(gate => {
      gate.qubits.forEach(qubitIndex => {
        if (!qubitMap.has(qubitIndex)) {
          qubitMap.set(qubitIndex, []);
        }
        qubitMap.get(qubitIndex)!.push(gate);
      });
    });
    
    const conflicts: QuantumGate[] = [];
    qubitMap.forEach((gatesOnQubit, qubitIndex) => {
      if (gatesOnQubit.length > 1) {
        conflicts.push(...gatesOnQubit);
      }
    });
    
    return conflicts;
  }
  
  private validateQubitAssignments(circuit: QuantumCircuit, errors: ValidationError[]): void {
    circuit.gates.forEach(gate => {
      gate.qubits.forEach(qubitIndex => {
        if (qubitIndex < 0 || qubitIndex >= circuit.qubits) {
          errors.push({
            type: 'INVALID_QUBIT',
            message: `Gate ${gate.name} operates on invalid qubit ${qubitIndex} (circuit has ${circuit.qubits} qubits)`,
            gateId: gate.id,
            position: gate.position,
            severity: 'error'
          });
        }
      });
    });
  }
  
  private validateGateSequences(
    circuit: QuantumCircuit, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Check for invalid gate sequences that could cause quantum errors
    const qubitHistories = new Map<number, QuantumGate[]>();
    
    // Build execution order for each qubit
    circuit.gates
      .sort((a, b) => (a.position?.x || 0) - (b.position?.x || 0))
      .forEach(gate => {
        gate.qubits.forEach(qubitIndex => {
          if (!qubitHistories.has(qubitIndex)) {
            qubitHistories.set(qubitIndex, []);
          }
          qubitHistories.get(qubitIndex)!.push(gate);
        });
      });
    
    // Analyze sequences for each qubit
    qubitHistories.forEach((gateSequence, qubitIndex) => {
      this.analyzeQubitSequence(gateSequence, qubitIndex, errors, warnings);
    });
  }
  
  private analyzeQubitSequence(
    sequence: QuantumGate[], 
    qubitIndex: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    for (let i = 0; i < sequence.length - 1; i++) {
      const currentGate = sequence[i];
      const nextGate = sequence[i + 1];
      
      // Check for redundant gate sequences
      if (this.areGatesRedundant(currentGate, nextGate)) {
        warnings.push({
          type: 'OPTIMIZATION',
          message: `Redundant gate sequence detected on qubit ${qubitIndex}`,
          suggestion: `Consider removing redundant ${currentGate.name} + ${nextGate.name} sequence`,
          gateIds: [currentGate.id, nextGate.id]
        });
      }
      
      // Check for potentially problematic sequences
      if (this.isProblematicSequence(currentGate, nextGate)) {
        warnings.push({
          type: 'FIDELITY',
          message: `Potentially problematic gate sequence on qubit ${qubitIndex}`,
          suggestion: `Consider optimizing ${currentGate.name} → ${nextGate.name} sequence`,
          gateIds: [currentGate.id, nextGate.id]
        });
      }
    }
  }
  
  private areGatesRedundant(gate1: QuantumGate, gate2: QuantumGate): boolean {
    // Common redundant patterns
    const redundantPairs = [
      ['X', 'X'], // X^2 = I
      ['Y', 'Y'], // Y^2 = I
      ['Z', 'Z'], // Z^2 = I
      ['H', 'H'], // H^2 = I
      ['S', 'S', 'S', 'S'], // S^4 = I
      ['T', 'T', 'T', 'T', 'T', 'T', 'T', 'T'] // T^8 = I
    ];
    
    return redundantPairs.some(pair => 
      pair.length === 2 && 
      gate1.name === pair[0] && 
      gate2.name === pair[1]
    );
  }
  
  private isProblematicSequence(gate1: QuantumGate, gate2: QuantumGate): boolean {
    // Sequences that might cause decoherence or measurement errors
    const problematicSequences = [
      ['H', 'Z'], // Hadamard followed by Z can be optimized
      ['RX', 'RY'], // Consecutive rotations can be combined
      ['S', 'T'], // Phase gates can often be combined
    ];
    
    return problematicSequences.some(seq => 
      gate1.name === seq[0] && gate2.name === seq[1]
    );
  }
  
  private validatePerformanceOptimizations(circuit: QuantumCircuit, warnings: ValidationWarning[]): void {
    // Check circuit depth optimization opportunities
    if (circuit.depth > 50) {
      warnings.push({
        type: 'PERFORMANCE',
        message: 'Circuit depth is quite large, which may impact execution time and fidelity',
        suggestion: 'Consider circuit optimization or decomposition into smaller sub-circuits'
      });
    }
    
    // Check for parallelizable operations
    const parallelizableGates = this.findParallelizableGates(circuit);
    if (parallelizableGates.length > 0) {
      warnings.push({
        type: 'OPTIMIZATION',
        message: 'Found gates that could be executed in parallel',
        suggestion: 'Consider rearranging gates to reduce circuit depth',
        gateIds: parallelizableGates.map(g => g.id)
      });
    }
  }
  
  private findParallelizableGates(circuit: QuantumCircuit): QuantumGate[] {
    // Find gates that operate on disjoint qubit sets and could be parallelized
    const parallelizable: QuantumGate[] = [];
    
    for (let i = 0; i < circuit.gates.length - 1; i++) {
      const gate1 = circuit.gates[i];
      const gate2 = circuit.gates[i + 1];
      
      // Check if gates operate on disjoint qubit sets
      const qubits1 = new Set(gate1.qubits);
      const qubits2 = new Set(gate2.qubits);
      const intersection = new Set([...qubits1].filter(q => qubits2.has(q)));
      
      if (intersection.size === 0) {
        // Gates operate on different qubits and could be parallelized
        const pos1 = gate1.position?.x || 0;
        const pos2 = gate2.position?.x || 0;
        
        if (Math.abs(pos1 - pos2) < 100) { // They're close in time
          parallelizable.push(gate1, gate2);
        }
      }
    }
    
    return [...new Set(parallelizable)]; // Remove duplicates
  }
  
  private validateQuantumFidelity(circuit: QuantumCircuit, warnings: ValidationWarning[]): void {
    // Check for operations that might degrade fidelity
    let rotationGateCount = 0;
    let twoQubitGateCount = 0;
    
    circuit.gates.forEach(gate => {
      if (['RX', 'RY', 'RZ', 'U1', 'U2', 'U3'].includes(gate.name)) {
        rotationGateCount++;
      }
      
      if (gate.qubits.length > 1) {
        twoQubitGateCount++;
      }
    });
    
    // Warn about excessive rotation gates
    if (rotationGateCount > circuit.gates.length * 0.7) {
      warnings.push({
        type: 'FIDELITY',
        message: 'High proportion of rotation gates may impact fidelity',
        suggestion: 'Consider using native gate sets or optimizing rotation sequences'
      });
    }
    
    // Warn about excessive two-qubit gates
    if (twoQubitGateCount > circuit.gates.length * 0.5) {
      warnings.push({
        type: 'FIDELITY',
        message: 'High proportion of two-qubit gates may impact fidelity',
        suggestion: 'Two-qubit gates typically have higher error rates; consider circuit optimization'
      });
    }
  }
  
  // Real-time validation for live editing
  validateGatePlacement(
    circuit: QuantumCircuit, 
    gateType: string, 
    position: { x: number; y: number },
    qubitIndex: number
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check if position is valid
    if (qubitIndex < 0 || qubitIndex >= circuit.qubits) {
      errors.push({
        type: 'INVALID_QUBIT',
        message: `Cannot place gate on invalid qubit ${qubitIndex}`,
        severity: 'error',
        position
      });
    }
    
    // Check for overlaps at this position
    const overlappingGates = circuit.gates.filter(gate => 
      gate.position && 
      Math.abs(gate.position.x - position.x) < 20 &&
      Math.abs(gate.position.y - position.y) < 20 &&
      gate.qubits.includes(qubitIndex)
    );
    
    if (overlappingGates.length > 0) {
      errors.push({
        type: 'GATE_OVERLAP',
        message: 'Gate would overlap with existing gate',
        severity: 'error',
        position
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}