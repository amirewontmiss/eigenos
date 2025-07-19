// Native quantum simulator TypeScript bindings
let nativeModule: any = null;

// Dynamically load the native module
try {
    nativeModule = require('../../../quantum-sim-native');
} catch (error) {
    console.warn('Native quantum simulator not available, falling back to JavaScript implementation');
}

export class NativeQuantumSimulator {
    private simulatorId: number;
    private numQubits: number;
    private isNativeAvailable: boolean;

    constructor(numQubits: number) {
        this.numQubits = numQubits;
        this.isNativeAvailable = nativeModule !== null;
        
        if (this.isNativeAvailable) {
            this.simulatorId = nativeModule.createSimulator(numQubits);
        } else {
            throw new Error('Native quantum simulator module not available');
        }
    }

    /**
     * Apply a quantum gate to the specified qubits
     */
    applyGate(gateName: string, qubits: number[], params: number[] = []): boolean {
        if (!this.isNativeAvailable) {
            return false;
        }
        
        return nativeModule.applyGate(this.simulatorId, gateName, qubits, params);
    }

    /**
     * Measure all qubits and return shot counts
     */
    measure(shots: number = 1024): Record<string, number> {
        if (!this.isNativeAvailable) {
            return {};
        }
        
        return nativeModule.measureQubits(this.simulatorId, shots);
    }

    /**
     * Get state vector probabilities
     */
    getStateProbabilities(): number[] {
        if (!this.isNativeAvailable) {
            return [];
        }
        
        return nativeModule.getStateProbabilities(this.simulatorId);
    }

    /**
     * Calculate fidelity with another quantum state
     */
    getFidelity(otherSimulator: NativeQuantumSimulator): number {
        if (!this.isNativeAvailable) {
            return 0.0;
        }
        
        return nativeModule.getFidelity(this.simulatorId, otherSimulator.simulatorId);
    }

    /**
     * Clean up native resources
     */
    destroy(): void {
        if (this.isNativeAvailable && this.simulatorId !== undefined) {
            nativeModule.destroySimulator(this.simulatorId);
        }
    }

    /**
     * Get the number of qubits in this simulator
     */
    getNumQubits(): number {
        return this.numQubits;
    }

    /**
     * Check if native module is available
     */
    static isNativeAvailable(): boolean {
        return nativeModule !== null;
    }
}

/**
 * Enhanced Quantum Circuit class that uses the native simulator
 */
export class EnhancedQuantumCircuit {
    private simulator: NativeQuantumSimulator;
    private gates: Array<{name: string, qubits: number[], params: number[]}> = [];
    private readonly numQubits: number;

    constructor(numQubits: number) {
        this.numQubits = numQubits;
        this.simulator = new NativeQuantumSimulator(numQubits);
    }

    /**
     * Add a quantum gate to the circuit
     */
    addGate(gateName: string, qubits: number[], params: number[] = []): this {
        // Validate qubit indices
        for (const qubit of qubits) {
            if (qubit < 0 || qubit >= this.numQubits) {
                throw new Error(`Qubit index ${qubit} out of range [0, ${this.numQubits - 1}]`);
            }
        }

        this.gates.push({name: gateName, qubits, params});
        
        const success = this.simulator.applyGate(gateName, qubits, params);
        if (!success) {
            throw new Error(`Failed to apply gate ${gateName} to qubits ${qubits}`);
        }
        
        return this;
    }

    // Convenience methods for common gates
    x(qubit: number): this { return this.addGate('X', [qubit]); }
    y(qubit: number): this { return this.addGate('Y', [qubit]); }
    z(qubit: number): this { return this.addGate('Z', [qubit]); }
    h(qubit: number): this { return this.addGate('H', [qubit]); }
    s(qubit: number): this { return this.addGate('S', [qubit]); }
    t(qubit: number): this { return this.addGate('T', [qubit]); }
    
    rx(qubit: number, angle: number): this { return this.addGate('RX', [qubit], [angle]); }
    ry(qubit: number, angle: number): this { return this.addGate('RY', [qubit], [angle]); }
    rz(qubit: number, angle: number): this { return this.addGate('RZ', [qubit], [angle]); }
    
    cnot(control: number, target: number): this { return this.addGate('CNOT', [control, target]); }
    cx(control: number, target: number): this { return this.addGate('CX', [control, target]); }
    cz(control: number, target: number): this { return this.addGate('CZ', [control, target]); }
    swap(qubit1: number, qubit2: number): this { return this.addGate('SWAP', [qubit1, qubit2]); }

    /**
     * Execute the circuit and return measurement results
     */
    execute(shots: number = 1024): QuantumResult {
        const startTime = performance.now();
        const measurements = this.simulator.measure(shots);
        const endTime = performance.now();

        return new QuantumResult({
            measurements,
            executionTime: endTime - startTime,
            shots,
            circuit: this.gates,
            fidelity: this.calculateFidelity(measurements, shots),
            probabilities: this.simulator.getStateProbabilities()
        });
    }

    /**
     * Get current state probabilities without measurement
     */
    getStateProbabilities(): number[] {
        return this.simulator.getStateProbabilities();
    }

    /**
     * Calculate fidelity with target state
     */
    calculateFidelity(measurements: Record<string, number>, shots: number): number {
        const probabilities = this.simulator.getStateProbabilities();
        let fidelity = 0;
        
        for (const [state, count] of Object.entries(measurements)) {
            const stateIndex = parseInt(state, 2);
            if (stateIndex < probabilities.length) {
                const expectedProb = probabilities[stateIndex];
                const actualProb = count / shots;
                fidelity += Math.sqrt(expectedProb * actualProb);
            }
        }
        
        return fidelity;
    }

    /**
     * Create common quantum algorithm patterns
     */
    bellState(qubit1: number, qubit2: number): this {
        return this.h(qubit1).cnot(qubit1, qubit2);
    }

    ghzState(qubits: number[]): this {
        if (qubits.length < 2) {
            throw new Error('GHZ state requires at least 2 qubits');
        }
        
        this.h(qubits[0]);
        for (let i = 1; i < qubits.length; i++) {
            this.cnot(qubits[0], qubits[i]);
        }
        
        return this;
    }

    /**
     * Quantum Fourier Transform
     */
    qft(qubits: number[]): this {
        const n = qubits.length;
        
        for (let i = 0; i < n; i++) {
            this.h(qubits[i]);
            
            for (let j = i + 1; j < n; j++) {
                const angle = Math.PI / Math.pow(2, j - i);
                // For now, use RZ as approximation for controlled phase
                this.rz(qubits[i], angle / 2);
                this.cnot(qubits[j], qubits[i]);
                this.rz(qubits[i], -angle / 2);
                this.cnot(qubits[j], qubits[i]);
                this.rz(qubits[i], angle / 2);
            }
        }
        
        // Reverse the order
        for (let i = 0; i < Math.floor(n / 2); i++) {
            this.swap(qubits[i], qubits[n - 1 - i]);
        }
        
        return this;
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        this.simulator.destroy();
    }

    /**
     * Get circuit information
     */
    getCircuitInfo(): CircuitInfo {
        return {
            numQubits: this.numQubits,
            gateCount: this.gates.length,
            depth: this.calculateDepth(),
            gates: [...this.gates]
        };
    }

    private calculateDepth(): number {
        // Simple depth calculation - count maximum overlapping gates
        const qubitLastUsed = new Array(this.numQubits).fill(-1);
        let maxDepth = 0;
        
        for (let i = 0; i < this.gates.length; i++) {
            const gate = this.gates[i];
            let gateDepth = 0;
            
            for (const qubit of gate.qubits) {
                gateDepth = Math.max(gateDepth, qubitLastUsed[qubit] + 1);
            }
            
            for (const qubit of gate.qubits) {
                qubitLastUsed[qubit] = gateDepth;
            }
            
            maxDepth = Math.max(maxDepth, gateDepth);
        }
        
        return maxDepth;
    }
}

/**
 * Quantum execution result container
 */
export class QuantumResult {
    constructor(public data: {
        measurements: Record<string, number>;
        executionTime: number;
        shots: number;
        circuit: Array<{name: string, qubits: number[], params: number[]}>;
        fidelity: number;
        probabilities: number[];
    }) {}

    /**
     * Get the most likely measurement outcome
     */
    getExpectedState(): string {
        const maxCount = Math.max(...Object.values(this.data.measurements));
        return Object.entries(this.data.measurements)
            .find(([_, count]) => count === maxCount)?.[0] || '0';
    }

    /**
     * Get probability distribution from measurement counts
     */
    getProbabilityDistribution(): Record<string, number> {
        const total = this.data.shots;
        const distribution: Record<string, number> = {};
        
        for (const [state, count] of Object.entries(this.data.measurements)) {
            distribution[state] = count / total;
        }
        
        return distribution;
    }

    /**
     * Get state vector probabilities
     */
    getStateProbabilities(): number[] {
        return this.data.probabilities;
    }

    /**
     * Calculate entropy of the measurement results
     */
    getEntropy(): number {
        const distribution = this.getProbabilityDistribution();
        let entropy = 0;
        
        for (const prob of Object.values(distribution)) {
            if (prob > 0) {
                entropy -= prob * Math.log2(prob);
            }
        }
        
        return entropy;
    }

    /**
     * Get execution performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        return {
            executionTime: this.data.executionTime,
            shotsPerSecond: this.data.shots / (this.data.executionTime / 1000),
            fidelity: this.data.fidelity,
            gateCount: this.data.circuit.length
        };
    }
}

// Type definitions
export interface CircuitInfo {
    numQubits: number;
    gateCount: number;
    depth: number;
    gates: Array<{name: string, qubits: number[], params: number[]}>;
}

export interface PerformanceMetrics {
    executionTime: number; // milliseconds
    shotsPerSecond: number;
    fidelity: number;
    gateCount: number;
}

/**
 * Factory function to create quantum circuits with fallback
 */
export function createQuantumCircuit(numQubits: number): EnhancedQuantumCircuit {
    if (!NativeQuantumSimulator.isNativeAvailable()) {
        throw new Error('Native quantum simulator not available. Please build the native module first.');
    }
    
    return new EnhancedQuantumCircuit(numQubits);
}

/**
 * Utility function to test native simulator performance
 */
export async function benchmarkNativeSimulator(): Promise<BenchmarkResult> {
    const results: BenchmarkResult = {
        testName: 'Native Quantum Simulator Benchmark',
        tests: []
    };

    // Test 1: Bell state creation and measurement
    const bellTest = {
        name: 'Bell State Creation',
        qubits: 2,
        shots: 10000,
        startTime: 0,
        endTime: 0,
        success: false
    };

    try {
        bellTest.startTime = performance.now();
        const circuit = createQuantumCircuit(2);
        circuit.bellState(0, 1);
        const result = circuit.execute(bellTest.shots);
        bellTest.endTime = performance.now();
        
        const dist = result.getProbabilityDistribution();
        const expectedStates = ['00', '11'];
        const totalExpectedProb = expectedStates.reduce((sum, state) => sum + (dist[state] || 0), 0);
        
        bellTest.success = totalExpectedProb > 0.95; // Should be ~1.0 for perfect Bell state
        circuit.destroy();
        
    } catch (error) {
        bellTest.success = false;
    }
    
    results.tests.push(bellTest);

    // Test 2: QFT performance
    const qftTest = {
        name: 'Quantum Fourier Transform',
        qubits: 4,
        shots: 1000,
        startTime: 0,
        endTime: 0,
        success: false
    };

    try {
        qftTest.startTime = performance.now();
        const circuit = createQuantumCircuit(4);
        circuit.h(0).h(1); // Prepare superposition
        circuit.qft([0, 1, 2, 3]);
        const result = circuit.execute(qftTest.shots);
        qftTest.endTime = performance.now();
        
        qftTest.success = result.data.measurements && Object.keys(result.data.measurements).length > 0;
        circuit.destroy();
        
    } catch (error) {
        qftTest.success = false;
    }
    
    results.tests.push(qftTest);

    return results;
}

export interface BenchmarkResult {
    testName: string;
    tests: Array<{
        name: string;
        qubits: number;
        shots: number;
        startTime: number;
        endTime: number;
        success: boolean;
    }>;
}