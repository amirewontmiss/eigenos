import * as crypto from 'crypto';

/**
 * Quantum circuit representation with gates, qubits, and classical bits
 */
export class QuantumCircuit {
    public gates: QuantumGate[] = [];
    public classicalBits: number = 0;
    public metadata: CircuitMetadata = {};
    
    constructor(public readonly numQubits: number) {}
    
    /**
     * Add a quantum gate to the circuit
     */
    addGate(gate: QuantumGate): void {
        // Validate qubit indices
        for (const qubit of gate.qubits) {
            if (qubit < 0 || qubit >= this.numQubits) {
                throw new Error(`Qubit index ${qubit} out of range [0, ${this.numQubits - 1}]`);
            }
        }
        
        this.gates.push(gate);
    }
    
    /**
     * Add single-qubit gates
     */
    x(qubit: number): QuantumCircuit {
        this.addGate(new QuantumGate('X', [qubit]));
        return this;
    }
    
    y(qubit: number): QuantumCircuit {
        this.addGate(new QuantumGate('Y', [qubit]));
        return this;
    }
    
    z(qubit: number): QuantumCircuit {
        this.addGate(new QuantumGate('Z', [qubit]));
        return this;
    }
    
    h(qubit: number): QuantumCircuit {
        this.addGate(new QuantumGate('H', [qubit]));
        return this;
    }
    
    s(qubit: number): QuantumCircuit {
        this.addGate(new QuantumGate('S', [qubit]));
        return this;
    }
    
    t(qubit: number): QuantumCircuit {
        this.addGate(new QuantumGate('T', [qubit]));
        return this;
    }
    
    /**
     * Rotation gates
     */
    rx(qubit: number, angle: number): QuantumCircuit {
        this.addGate(new QuantumGate('RX', [qubit], [angle]));
        return this;
    }
    
    ry(qubit: number, angle: number): QuantumCircuit {
        this.addGate(new QuantumGate('RY', [qubit], [angle]));
        return this;
    }
    
    rz(qubit: number, angle: number): QuantumCircuit {
        this.addGate(new QuantumGate('RZ', [qubit], [angle]));
        return this;
    }
    
    /**
     * Two-qubit gates
     */
    cx(control: number, target: number): QuantumCircuit {
        this.addGate(new QuantumGate('CX', [control, target]));
        return this;
    }
    
    cnot(control: number, target: number): QuantumCircuit {
        return this.cx(control, target);
    }
    
    cz(control: number, target: number): QuantumCircuit {
        this.addGate(new QuantumGate('CZ', [control, target]));
        return this;
    }
    
    swap(qubit1: number, qubit2: number): QuantumCircuit {
        this.addGate(new QuantumGate('SWAP', [qubit1, qubit2]));
        return this;
    }
    
    /**
     * Three-qubit gates
     */
    ccx(control1: number, control2: number, target: number): QuantumCircuit {
        this.addGate(new QuantumGate('CCX', [control1, control2, target]));
        return this;
    }
    
    toffoli(control1: number, control2: number, target: number): QuantumCircuit {
        return this.ccx(control1, control2, target);
    }
    
    /**
     * Measurement
     */
    measure(qubit: number, classicalBit?: number): QuantumCircuit {
        const cbit = classicalBit ?? this.classicalBits++;
        this.addGate(new QuantumGate('MEASURE', [qubit], [cbit]));
        return this;
    }
    
    measureAll(): QuantumCircuit {
        for (let i = 0; i < this.numQubits; i++) {
            this.measure(i);
        }
        return this;
    }
    
    /**
     * Circuit analysis
     */
    depth(): number {
        if (this.gates.length === 0) return 0;
        
        const layers = this.getLayers();
        return layers.length;
    }
    
    gateCount(): number {
        return this.gates.length;
    }
    
    twoQubitGateCount(): number {
        return this.gates.filter(gate => gate.qubits.length === 2).length;
    }
    
    /**
     * Get circuit as layers for parallelization analysis
     */
    getLayers(): QuantumGate[][] {
        const layers: QuantumGate[][] = [];
        const activeQubits = new Set<number>();
        
        let currentLayer: QuantumGate[] = [];
        
        for (const gate of this.gates) {
            const gateQubits = new Set(gate.qubits);
            
            // Check if this gate conflicts with any gate in the current layer
            let hasConflict = false;
            for (const qubit of gateQubits) {
                if (activeQubits.has(qubit)) {
                    hasConflict = true;
                    break;
                }
            }
            
            if (hasConflict) {
                // Start new layer
                if (currentLayer.length > 0) {
                    layers.push(currentLayer);
                }
                currentLayer = [gate];
                activeQubits.clear();
                gate.qubits.forEach(q => activeQubits.add(q));
            } else {
                // Add to current layer
                currentLayer.push(gate);
                gate.qubits.forEach(q => activeQubits.add(q));
            }
        }
        
        if (currentLayer.length > 0) {
            layers.push(currentLayer);
        }
        
        return layers;
    }
    
    /**
     * Clone the circuit
     */
    clone(): QuantumCircuit {
        const cloned = new QuantumCircuit(this.numQubits);
        cloned.gates = this.gates.map(gate => gate.clone());
        cloned.classicalBits = this.classicalBits;
        cloned.metadata = { ...this.metadata };
        return cloned;
    }
    
    /**
     * Generate hash for caching
     */
    getHash(): string {
        const circuitData = {
            numQubits: this.numQubits,
            gates: this.gates.map(gate => ({
                type: gate.type,
                qubits: gate.qubits,
                parameters: gate.parameters
            }))
        };
        
        return crypto.createHash('sha256')
            .update(JSON.stringify(circuitData))
            .digest('hex');
    }
    
    /**
     * Get circuit statistics
     */
    getStatistics(): CircuitStatistics {
        const gateTypes = new Map<string, number>();
        let maxQubitUsed = -1;
        const qubitUsage = new Array(this.numQubits).fill(0);
        
        for (const gate of this.gates) {
            // Count gate types
            gateTypes.set(gate.type, (gateTypes.get(gate.type) || 0) + 1);
            
            // Track qubit usage
            for (const qubit of gate.qubits) {
                maxQubitUsed = Math.max(maxQubitUsed, qubit);
                qubitUsage[qubit]++;
            }
        }
        
        return {
            totalGates: this.gates.length,
            depth: this.depth(),
            qubitCount: this.numQubits,
            activeQubitCount: maxQubitUsed + 1,
            gateTypes,
            qubitUsage,
            twoQubitGateCount: this.twoQubitGateCount(),
            averageQubitUtilization: qubitUsage.reduce((sum, usage) => sum + usage, 0) / this.numQubits
        };
    }
    
    /**
     * Convert to QASM string
     */
    toQASM(): string {
        let qasm = `OPENQASM 2.0;\ninclude "qelib1.inc";\n`;
        qasm += `qreg q[${this.numQubits}];\n`;
        
        if (this.classicalBits > 0) {
            qasm += `creg c[${this.classicalBits}];\n`;
        }
        
        for (const gate of this.gates) {
            qasm += gate.toQASM() + '\n';
        }
        
        return qasm;
    }
    
    /**
     * Convert to Cirq format
     */
    toCirq(): string {
        let cirq = `import cirq\n\n`;
        cirq += `qubits = [cirq.LineQubit(${Array.from({length: this.numQubits}, (_, i) => i).join('), cirq.LineQubit(')})]\n`;
        cirq += `circuit = cirq.Circuit()\n\n`;
        
        for (const gate of this.gates) {
            cirq += `circuit.append(${gate.toCirq()})\n`;
        }
        
        return cirq;
    }
    
    /**
     * Append another circuit
     */
    append(other: QuantumCircuit): QuantumCircuit {
        if (other.numQubits !== this.numQubits) {
            throw new Error('Cannot append circuits with different qubit counts');
        }
        
        for (const gate of other.gates) {
            this.addGate(gate.clone());
        }
        
        this.classicalBits = Math.max(this.classicalBits, other.classicalBits);
        return this;
    }
    
    /**
     * Create a barrier (for visualization and optimization hints)
     */
    barrier(qubits?: number[]): QuantumCircuit {
        const targetQubits = qubits || Array.from({length: this.numQubits}, (_, i) => i);
        this.addGate(new QuantumGate('BARRIER', targetQubits));
        return this;
    }
}

/**
 * Quantum gate representation
 */
export class QuantumGate {
    constructor(
        public readonly type: string,
        public readonly qubits: number[],
        public readonly parameters: number[] = [],
        public readonly metadata: GateMetadata = {}
    ) {}
    
    /**
     * Check if gate is parameterized
     */
    isParameterized(): boolean {
        return this.parameters.length > 0;
    }
    
    /**
     * Check if gate is single qubit
     */
    isSingleQubit(): boolean {
        return this.qubits.length === 1;
    }
    
    /**
     * Check if gate is two qubit
     */
    isTwoQubit(): boolean {
        return this.qubits.length === 2;
    }
    
    /**
     * Check if gate is measurement
     */
    isMeasurement(): boolean {
        return this.type === 'MEASURE';
    }
    
    /**
     * Clone the gate
     */
    clone(): QuantumGate {
        return new QuantumGate(
            this.type,
            [...this.qubits],
            [...this.parameters],
            { ...this.metadata }
        );
    }
    
    /**
     * Get gate duration (if available)
     */
    get duration(): number | undefined {
        return this.metadata.duration;
    }
    
    /**
     * Convert to QASM representation
     */
    toQASM(): string {
        const qubits = this.qubits.map(q => `q[${q}]`).join(', ');
        
        switch (this.type) {
            case 'X':
                return `x ${qubits};`;
            case 'Y':
                return `y ${qubits};`;
            case 'Z':
                return `z ${qubits};`;
            case 'H':
                return `h ${qubits};`;
            case 'S':
                return `s ${qubits};`;
            case 'T':
                return `t ${qubits};`;
            case 'RX':
                return `rx(${this.parameters[0]}) ${qubits};`;
            case 'RY':
                return `ry(${this.parameters[0]}) ${qubits};`;
            case 'RZ':
                return `rz(${this.parameters[0]}) ${qubits};`;
            case 'CX':
            case 'CNOT':
                return `cx ${qubits};`;
            case 'CZ':
                return `cz ${qubits};`;
            case 'SWAP':
                return `swap ${qubits};`;
            case 'CCX':
                return `ccx ${qubits};`;
            case 'MEASURE':
                return `measure ${qubits} -> c[${this.parameters[0] || 0}];`;
            case 'BARRIER':
                return `barrier ${qubits};`;
            default:
                return `// Unknown gate: ${this.type}`;
        }
    }
    
    /**
     * Convert to Cirq representation
     */
    toCirq(): string {
        const qubits = this.qubits.map(q => `qubits[${q}]`).join(', ');
        
        switch (this.type) {
            case 'X':
                return `cirq.X(${qubits})`;
            case 'Y':
                return `cirq.Y(${qubits})`;
            case 'Z':
                return `cirq.Z(${qubits})`;
            case 'H':
                return `cirq.H(${qubits})`;
            case 'S':
                return `cirq.S(${qubits})`;
            case 'T':
                return `cirq.T(${qubits})`;
            case 'RX':
                return `cirq.rx(${this.parameters[0]})(${qubits})`;
            case 'RY':
                return `cirq.ry(${this.parameters[0]})(${qubits})`;
            case 'RZ':
                return `cirq.rz(${this.parameters[0]})(${qubits})`;
            case 'CX':
            case 'CNOT':
                return `cirq.CNOT(${qubits})`;
            case 'CZ':
                return `cirq.CZ(${qubits})`;
            case 'SWAP':
                return `cirq.SWAP(${qubits})`;
            case 'CCX':
                return `cirq.CCX(${qubits})`;
            case 'MEASURE':
                return `cirq.measure(${qubits})`;
            default:
                return `# Unknown gate: ${this.type}`;
        }
    }
    
    /**
     * Get gate matrix (for single and two qubit gates)
     */
    getMatrix(): number[][] | null {
        switch (this.type) {
            case 'I':
                return [[1, 0], [0, 1]];
            case 'X':
                return [[0, 1], [1, 0]];
            case 'Y':
                return [[0, -1], [1, 0]]; // Note: using real representation
            case 'Z':
                return [[1, 0], [0, -1]];
            case 'H':
                const inv_sqrt2 = 1 / Math.sqrt(2);
                return [[inv_sqrt2, inv_sqrt2], [inv_sqrt2, -inv_sqrt2]];
            case 'S':
                return [[1, 0], [0, 1]]; // Simplified (should be [[1, 0], [0, i]])
            case 'T':
                return [[1, 0], [0, 1]]; // Simplified (should be [[1, 0], [0, e^(iπ/4)]])
            // Add more gates as needed
            default:
                return null;
        }
    }
}

/**
 * Qubit representation
 */
export class Qubit {
    constructor(
        public readonly index: number,
        public readonly name?: string
    ) {}
    
    toString(): string {
        return this.name || `q${this.index}`;
    }
}

/**
 * Classical bit representation
 */
export class ClassicalBit {
    constructor(
        public readonly index: number,
        public readonly name?: string
    ) {}
    
    toString(): string {
        return this.name || `c${this.index}`;
    }
}

// Type definitions
export interface CircuitMetadata {
    name?: string;
    description?: string;
    author?: string;
    created?: Date;
    version?: string;
    tags?: string[];
}

export interface GateMetadata {
    duration?: number; // nanoseconds
    errorRate?: number;
    calibrationData?: any;
    pulse?: PulseSequence;
    virtual?: boolean;
}

export interface PulseSequence {
    amplitudes: number[];
    phases: number[];
    frequencies: number[];
    duration: number;
}

export interface CircuitStatistics {
    totalGates: number;
    depth: number;
    qubitCount: number;
    activeQubitCount: number;
    gateTypes: Map<string, number>;
    qubitUsage: number[];
    twoQubitGateCount: number;
    averageQubitUtilization: number;
}

/**
 * Circuit builder for common patterns
 */
export class CircuitBuilder {
    private circuit: QuantumCircuit;
    
    constructor(numQubits: number) {
        this.circuit = new QuantumCircuit(numQubits);
    }
    
    /**
     * Bell state preparation
     */
    bellState(qubit1: number, qubit2: number): CircuitBuilder {
        this.circuit.h(qubit1);
        this.circuit.cx(qubit1, qubit2);
        return this;
    }
    
    /**
     * GHZ state preparation
     */
    ghzState(qubits: number[]): CircuitBuilder {
        if (qubits.length < 2) {
            throw new Error('GHZ state requires at least 2 qubits');
        }
        
        this.circuit.h(qubits[0]);
        for (let i = 1; i < qubits.length; i++) {
            this.circuit.cx(qubits[0], qubits[i]);
        }
        return this;
    }
    
    /**
     * Quantum Fourier Transform
     */
    qft(qubits: number[]): CircuitBuilder {
        const n = qubits.length;
        
        for (let i = 0; i < n; i++) {
            this.circuit.h(qubits[i]);
            
            for (let j = i + 1; j < n; j++) {
                const angle = Math.PI / Math.pow(2, j - i);
                this.circuit.addGate(new QuantumGate('CRZ', [qubits[j], qubits[i]], [angle]));
            }
        }
        
        // Reverse the order
        for (let i = 0; i < Math.floor(n / 2); i++) {
            this.circuit.swap(qubits[i], qubits[n - 1 - i]);
        }
        
        return this;
    }
    
    /**
     * Quantum Approximate Optimization Algorithm (QAOA) layer
     */
    qaoaLayer(qubits: number[], gamma: number, beta: number): CircuitBuilder {
        // Problem Hamiltonian (example: all Z-Z interactions)
        for (let i = 0; i < qubits.length - 1; i++) {
            this.circuit.cx(qubits[i], qubits[i + 1]);
            this.circuit.rz(qubits[i + 1], 2 * gamma);
            this.circuit.cx(qubits[i], qubits[i + 1]);
        }
        
        // Mixer Hamiltonian (X rotations)
        for (const qubit of qubits) {
            this.circuit.rx(qubit, 2 * beta);
        }
        
        return this;
    }
    
    /**
     * Variational Quantum Eigensolver (VQE) ansatz
     */
    vqeAnsatz(qubits: number[], parameters: number[]): CircuitBuilder {
        if (parameters.length !== qubits.length * 2) {
            throw new Error('Parameter count must be 2 * number of qubits');
        }
        
        // Initial layer
        for (let i = 0; i < qubits.length; i++) {
            this.circuit.ry(qubits[i], parameters[i]);
        }
        
        // Entangling layer
        for (let i = 0; i < qubits.length - 1; i++) {
            this.circuit.cx(qubits[i], qubits[i + 1]);
        }
        
        // Final layer
        for (let i = 0; i < qubits.length; i++) {
            this.circuit.ry(qubits[i], parameters[qubits.length + i]);
        }
        
        return this;
    }
    
    /**
     * Random circuit for benchmarking
     */
    randomCircuit(depth: number, twoQubitProbability: number = 0.3): CircuitBuilder {
        const singleQubitGates = ['X', 'Y', 'Z', 'H', 'S', 'T'];
        const twoQubitGates = ['CX', 'CZ'];
        
        for (let layer = 0; layer < depth; layer++) {
            for (let qubit = 0; qubit < this.circuit.numQubits; qubit++) {
                if (Math.random() < twoQubitProbability && qubit < this.circuit.numQubits - 1) {
                    // Add two-qubit gate
                    const gateType = twoQubitGates[Math.floor(Math.random() * twoQubitGates.length)];
                    this.circuit.addGate(new QuantumGate(gateType, [qubit, qubit + 1]));
                } else {
                    // Add single-qubit gate
                    const gateType = singleQubitGates[Math.floor(Math.random() * singleQubitGates.length)];
                    this.circuit.addGate(new QuantumGate(gateType, [qubit]));
                }
            }
        }
        
        return this;
    }
    
    /**
     * Build and return the circuit
     */
    build(): QuantumCircuit {
        return this.circuit;
    }
}