import { QuantumGate, QuantumMeasurement } from './quantum-gate';

export interface CircuitMetadata {
  readonly author?: string;
  readonly description?: string;
  readonly tags?: string[];
  readonly created?: Date;
  readonly modified?: Date;
  readonly version?: string;
}

export class QuantumCircuit {
  private _gates: QuantumGate[] = [];
  private _measurements: QuantumMeasurement[] = [];
  private _classicalBits: number = 0;
  private _metadata: CircuitMetadata;

  constructor(
    public readonly qubits: number,
    public readonly name: string = '',
    metadata: CircuitMetadata = {}
  ) {
    this._metadata = {
      ...metadata,
      created: metadata.created || new Date(),
      modified: metadata.modified || new Date()
    };
  }

  addGate(gate: QuantumGate): QuantumCircuit {
    this.validateGate(gate);
    this._gates.push(gate);
    this._metadata = { ...this._metadata, modified: new Date() };
    return this;
  }

  addMeasurement(qubit: number, classicalBit: number): QuantumCircuit {
    if (qubit >= this.qubits) {
      throw new Error(`Cannot measure qubit ${qubit}: circuit only has ${this.qubits} qubits`);
    }
    this._measurements.push(new QuantumMeasurement(qubit, classicalBit));
    this._classicalBits = Math.max(this._classicalBits, classicalBit + 1);
    this._metadata = { ...this._metadata, modified: new Date() };
    return this;
  }

  get gates(): readonly QuantumGate[] { return [...this._gates]; }
  get measurements(): readonly QuantumMeasurement[] { return [...this._measurements]; }
  get depth(): number { return this.calculateDepth(); }
  get classicalBits(): number { return this._classicalBits; }
  get metadata(): CircuitMetadata { return this._metadata; }

  private validateGate(gate: QuantumGate): void {
    const maxQubit = Math.max(...gate.qubits);
    if (maxQubit >= this.qubits) {
      throw new Error(`Gate operates on qubit ${maxQubit} but circuit only has ${this.qubits} qubits`);
    }
  }

  private calculateDepth(): number {
    const qubitLastUsed = new Array(this.qubits).fill(0);
    let maxDepth = 0;

    for (const gate of this._gates) {
      const gateDepth = Math.max(...gate.qubits.map(q => qubitLastUsed[q])) + 1;
      gate.qubits.forEach(q => qubitLastUsed[q] = gateDepth);
      maxDepth = Math.max(maxDepth, gateDepth);
    }

    return maxDepth;
  }

  gateCount(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const gate of this._gates) {
      counts[gate.name] = (counts[gate.name] || 0) + 1;
    }
    return counts;
  }

  totalGateCount(): number {
    return this._gates.length;
  }

  getQubitConnectivity(): [number, number][] {
    const connections: [number, number][] = [];
    for (const gate of this._gates) {
      if (gate.qubits.length === 2) {
        connections.push([gate.qubits[0], gate.qubits[1]]);
      }
    }
    return connections;
  }

  slice(startGate: number, endGate?: number): QuantumCircuit {
    const end = endGate ?? this._gates.length;
    const slicedCircuit = new QuantumCircuit(this.qubits, `${this.name}_slice`, this._metadata);
    
    for (let i = startGate; i < end && i < this._gates.length; i++) {
      slicedCircuit.addGate(this._gates[i]);
    }
    
    return slicedCircuit;
  }

  reverse(): QuantumCircuit {
    const reversed = new QuantumCircuit(this.qubits, `${this.name}_reverse`, this._metadata);
    
    for (let i = this._gates.length - 1; i >= 0; i--) {
      reversed.addGate(this._gates[i].inverse());
    }
    
    return reversed;
  }

  copy(): QuantumCircuit {
    const copied = new QuantumCircuit(this.qubits, this.name, this._metadata);
    
    for (const gate of this._gates) {
      copied.addGate(gate);
    }
    
    for (const measurement of this._measurements) {
      copied.addMeasurement(measurement.qubit, measurement.classicalBit);
    }
    
    return copied;
  }

  compose(other: QuantumCircuit): QuantumCircuit {
    if (this.qubits !== other.qubits) {
      throw new Error('Cannot compose circuits with different numbers of qubits');
    }
    
    const composed = this.copy();
    
    for (const gate of other.gates) {
      composed.addGate(gate);
    }
    
    for (const measurement of other.measurements) {
      composed.addMeasurement(measurement.qubit, measurement.classicalBit);
    }
    
    return composed;
  }

  power(exponent: number): QuantumCircuit {
    if (exponent < 0) {
      throw new Error('Negative exponents not supported');
    }
    
    if (exponent === 0) {
      return new QuantumCircuit(this.qubits, `${this.name}_power_0`, this._metadata);
    }
    
    let result = this.copy();
    for (let i = 1; i < exponent; i++) {
      result = result.compose(this);
    }
    
    result.name = `${this.name}_power_${exponent}`;
    return result;
  }

  toQASM(): string {
    let qasm = 'OPENQASM 2.0;\n';
    qasm += 'include "qelib1.inc";\n';
    qasm += `qreg q[${this.qubits}];\n`;
    
    if (this._classicalBits > 0) {
      qasm += `creg c[${this._classicalBits}];\n`;
    }
    
    for (const gate of this._gates) {
      qasm += this.gateToQASM(gate) + '\n';
    }
    
    for (const measurement of this._measurements) {
      qasm += `measure q[${measurement.qubit}] -> c[${measurement.classicalBit}];\n`;
    }
    
    return qasm;
  }

  private gateToQASM(gate: QuantumGate): string {
    switch (gate.name.toLowerCase()) {
      case 'h':
        return `h q[${gate.qubits[0]}];`;
      case 'x':
        return `x q[${gate.qubits[0]}];`;
      case 'y':
        return `y q[${gate.qubits[0]}];`;
      case 'z':
        return `z q[${gate.qubits[0]}];`;
      case 's':
        return `s q[${gate.qubits[0]}];`;
      case 't':
        return `t q[${gate.qubits[0]}];`;
      case 'cnot':
        return `cx q[${gate.qubits[0]}],q[${gate.qubits[1]}];`;
      case 'cz':
        return `cz q[${gate.qubits[0]}],q[${gate.qubits[1]}];`;
      case 'rx':
        return `rx(${gate.parameters[0]}) q[${gate.qubits[0]}];`;
      case 'ry':
        return `ry(${gate.parameters[0]}) q[${gate.qubits[0]}];`;
      case 'rz':
        return `rz(${gate.parameters[0]}) q[${gate.qubits[0]}];`;
      default:
        throw new Error(`Unsupported gate for QASM conversion: ${gate.name}`);
    }
  }

  toString(): string {
    let result = `QuantumCircuit(${this.qubits} qubits, ${this._gates.length} gates, depth=${this.depth})\n`;
    
    if (this.name) {
      result += `Name: ${this.name}\n`;
    }
    
    const gateCounts = this.gateCount();
    result += 'Gate counts:\n';
    for (const [gateName, count] of Object.entries(gateCounts)) {
      result += `  ${gateName}: ${count}\n`;
    }
    
    return result;
  }
}