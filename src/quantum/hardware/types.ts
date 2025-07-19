import { QuantumGate } from '../core/circuit';

/**
 * Hardware target abstraction for quantum devices
 */
export abstract class HardwareTarget {
    abstract readonly name: string;
    abstract readonly provider: string;
    abstract readonly numQubits: number;
    abstract readonly supportsCNOT: boolean;
    abstract readonly supportsNativeSWAP: boolean;
    
    abstract getTopology(): TopologyGraph;
    abstract getCalibration(): DeviceCalibration;
    abstract getGateErrorRate(gate: QuantumGate): number;
    abstract isConnected(qubit1: number, qubit2: number): boolean;
    abstract getHash(): string;
    
    /**
     * Get native gate set supported by this hardware
     */
    abstract getNativeGateSet(): Set<string>;
    
    /**
     * Get maximum execution time for circuits
     */
    abstract getMaxExecutionTime(): number;
    
    /**
     * Check if gate is natively supported
     */
    isNativeGate(gateType: string): boolean {
        return this.getNativeGateSet().has(gateType);
    }
    
    /**
     * Get cost of executing this gate on this hardware
     */
    abstract getGateCost(gate: QuantumGate): number;
}

/**
 * Physical topology graph representing qubit connectivity
 */
export class TopologyGraph {
    constructor(
        public readonly nodes: number[],
        public readonly edges: [number, number][]
    ) {}
    
    isConnected(qubit1: number, qubit2: number): boolean {
        return this.edges.some(([a, b]) => 
            (a === qubit1 && b === qubit2) || (a === qubit2 && b === qubit1)
        );
    }
    
    getNeighbors(qubit: number): number[] {
        return this.edges
            .filter(([a, b]) => a === qubit || b === qubit)
            .map(([a, b]) => a === qubit ? b : a);
    }
    
    getConnectivity(): number {
        return this.edges.length;
    }
    
    getAverageConnectivity(): number {
        const degrees = new Map<number, number>();
        
        for (const node of this.nodes) {
            degrees.set(node, this.getNeighbors(node).length);
        }
        
        const totalDegree = Array.from(degrees.values()).reduce((sum, degree) => sum + degree, 0);
        return totalDegree / this.nodes.length;
    }
    
    /**
     * Calculate shortest path between two qubits
     */
    shortestPath(start: number, end: number): number[] {
        if (start === end) return [start];
        
        const queue: number[] = [start];
        const visited = new Set<number>([start]);
        const parent = new Map<number, number>();
        
        while (queue.length > 0) {
            const current = queue.shift()!;
            
            for (const neighbor of this.getNeighbors(current)) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    parent.set(neighbor, current);
                    queue.push(neighbor);
                    
                    if (neighbor === end) {
                        // Reconstruct path
                        const path = [end];
                        let node = end;
                        while (parent.has(node)) {
                            node = parent.get(node)!;
                            path.unshift(node);
                        }
                        return path;
                    }
                }
            }
        }
        
        return []; // No path found
    }
    
    /**
     * Get distance between two qubits
     */
    distance(qubit1: number, qubit2: number): number {
        const path = this.shortestPath(qubit1, qubit2);
        return path.length > 0 ? path.length - 1 : Infinity;
    }
}

/**
 * Device calibration data and characteristics
 */
export interface DeviceCalibration {
    numQubits: number;
    coherenceTime: number; // Average T2 time in microseconds
    gateErrorRates: Map<string, number>;
    readoutErrorRate: number[];
    crosstalkMatrix: number[][]; // Crosstalk between qubits
    gateExecutionTimes: Map<string, number>; // in nanoseconds
    temperature: number; // mK for superconducting qubits
    timestamp: Date;
    
    // Hardware-specific parameters
    controlAmplitudes?: Map<string, number>;
    driveFrequencies?: number[];
    anharmonicity?: number[];
}

/**
 * IBM Quantum hardware target
 */
export class IBMQuantumTarget extends HardwareTarget {
    readonly name: string;
    readonly provider = 'IBM';
    readonly numQubits: number;
    readonly supportsCNOT = true;
    readonly supportsNativeSWAP = false;
    
    private topology: TopologyGraph;
    private calibration: DeviceCalibration;
    
    constructor(deviceName: string, topology: TopologyGraph, calibration: DeviceCalibration) {
        super();
        this.name = deviceName;
        this.numQubits = topology.nodes.length;
        this.topology = topology;
        this.calibration = calibration;
    }
    
    getTopology(): TopologyGraph {
        return this.topology;
    }
    
    getCalibration(): DeviceCalibration {
        return this.calibration;
    }
    
    getGateErrorRate(gate: QuantumGate): number {
        const baseRate = this.calibration.gateErrorRates.get(gate.type) || 0.001;
        
        // Add crosstalk penalty for two-qubit gates
        if (gate.qubits.length === 2) {
            const [q1, q2] = gate.qubits;
            const crosstalk = this.calibration.crosstalkMatrix[q1]?.[q2] || 0;
            return baseRate + crosstalk;
        }
        
        return baseRate;
    }
    
    isConnected(qubit1: number, qubit2: number): boolean {
        return this.topology.isConnected(qubit1, qubit2);
    }
    
    getNativeGateSet(): Set<string> {
        return new Set(['ID', 'RZ', 'SX', 'X', 'CX', 'RESET', 'MEASURE']);
    }
    
    getMaxExecutionTime(): number {
        return 100000; // 100ms
    }
    
    getGateCost(gate: QuantumGate): number {
        const costs = {
            'ID': 0,
            'RZ': 0, // Virtual gate
            'SX': 35, // ns
            'X': 35,
            'CX': 400, // ns
            'RESET': 1000,
            'MEASURE': 5000
        };
        
        return costs[gate.type] || 100;
    }
    
    getHash(): string {
        const topologyHash = this.topology.edges.map(e => e.join('-')).sort().join(',');
        const calibrationHash = Array.from(this.calibration.gateErrorRates.entries())
            .sort().map(([k, v]) => `${k}:${v.toFixed(6)}`).join(',');
        return `ibm-${this.name}-${topologyHash}-${calibrationHash}`;
    }
}

/**
 * Google Quantum AI hardware target
 */
export class GoogleQuantumTarget extends HardwareTarget {
    readonly name: string;
    readonly provider = 'Google';
    readonly numQubits: number;
    readonly supportsCNOT = false; // Uses CZ gates
    readonly supportsNativeSWAP = false;
    
    private topology: TopologyGraph;
    private calibration: DeviceCalibration;
    
    constructor(deviceName: string, topology: TopologyGraph, calibration: DeviceCalibration) {
        super();
        this.name = deviceName;
        this.numQubits = topology.nodes.length;
        this.topology = topology;
        this.calibration = calibration;
    }
    
    getTopology(): TopologyGraph {
        return this.topology;
    }
    
    getCalibration(): DeviceCalibration {
        return this.calibration;
    }
    
    getGateErrorRate(gate: QuantumGate): number {
        return this.calibration.gateErrorRates.get(gate.type) || 0.002;
    }
    
    isConnected(qubit1: number, qubit2: number): boolean {
        return this.topology.isConnected(qubit1, qubit2);
    }
    
    getNativeGateSet(): Set<string> {
        return new Set(['PhasedXZ', 'CZ', 'MEASURE']);
    }
    
    getMaxExecutionTime(): number {
        return 50000; // 50ms
    }
    
    getGateCost(gate: QuantumGate): number {
        const costs = {
            'PhasedXZ': 25, // ns
            'CZ': 300, // ns
            'MEASURE': 3000
        };
        
        return costs[gate.type] || 80;
    }
    
    getHash(): string {
        return `google-${this.name}-${this.topology.edges.length}-${this.calibration.timestamp.getTime()}`;
    }
}

/**
 * Rigetti Quantum Cloud Services target
 */
export class RigettiQuantumTarget extends HardwareTarget {
    readonly name: string;
    readonly provider = 'Rigetti';
    readonly numQubits: number;
    readonly supportsCNOT = true;
    readonly supportsNativeSWAP = false;
    
    private topology: TopologyGraph;
    private calibration: DeviceCalibration;
    
    constructor(deviceName: string, topology: TopologyGraph, calibration: DeviceCalibration) {
        super();
        this.name = deviceName;
        this.numQubits = topology.nodes.length;
        this.topology = topology;
        this.calibration = calibration;
    }
    
    getTopology(): TopologyGraph {
        return this.topology;
    }
    
    getCalibration(): DeviceCalibration {
        return this.calibration;
    }
    
    getGateErrorRate(gate: QuantumGate): number {
        return this.calibration.gateErrorRates.get(gate.type) || 0.015;
    }
    
    isConnected(qubit1: number, qubit2: number): boolean {
        return this.topology.isConnected(qubit1, qubit2);
    }
    
    getNativeGateSet(): Set<string> {
        return new Set(['RX', 'RZ', 'CZ', 'MEASURE']);
    }
    
    getMaxExecutionTime(): number {
        return 80000; // 80ms
    }
    
    getGateCost(gate: QuantumGate): number {
        const costs = {
            'RX': 50, // ns
            'RZ': 0, // Virtual
            'CZ': 250, // ns
            'MEASURE': 4000
        };
        
        return costs[gate.type] || 120;
    }
    
    getHash(): string {
        return `rigetti-${this.name}-${this.numQubits}-${this.calibration.coherenceTime}`;
    }
}

/**
 * IonQ trapped ion target
 */
export class IonQQuantumTarget extends HardwareTarget {
    readonly name: string;
    readonly provider = 'IonQ';
    readonly numQubits: number;
    readonly supportsCNOT = true;
    readonly supportsNativeSWAP = true; // All-to-all connectivity
    
    private calibration: DeviceCalibration;
    
    constructor(deviceName: string, numQubits: number, calibration: DeviceCalibration) {
        super();
        this.name = deviceName;
        this.numQubits = numQubits;
        this.calibration = calibration;
    }
    
    getTopology(): TopologyGraph {
        // All-to-all connectivity for trapped ions
        const nodes = Array.from({ length: this.numQubits }, (_, i) => i);
        const edges: [number, number][] = [];
        
        for (let i = 0; i < this.numQubits; i++) {
            for (let j = i + 1; j < this.numQubits; j++) {
                edges.push([i, j]);
            }
        }
        
        return new TopologyGraph(nodes, edges);
    }
    
    getCalibration(): DeviceCalibration {
        return this.calibration;
    }
    
    getGateErrorRate(gate: QuantumGate): number {
        const baseRate = this.calibration.gateErrorRates.get(gate.type) || 0.0005;
        
        // Distance-dependent error for long-range gates
        if (gate.qubits.length === 2) {
            const distance = Math.abs(gate.qubits[0] - gate.qubits[1]);
            return baseRate * (1 + distance * 0.1);
        }
        
        return baseRate;
    }
    
    isConnected(qubit1: number, qubit2: number): boolean {
        return true; // All-to-all connectivity
    }
    
    getNativeGateSet(): Set<string> {
        return new Set(['GPI', 'GPI2', 'MS', 'MEASURE']);
    }
    
    getMaxExecutionTime(): number {
        return 200000; // 200ms - longer for trapped ions
    }
    
    getGateCost(gate: QuantumGate): number {
        const costs = {
            'GPI': 10, // μs
            'GPI2': 10, // μs
            'MS': 50, // μs (Mølmer-Sørensen gate)
            'MEASURE': 100 // μs
        };
        
        return costs[gate.type] || 30;
    }
    
    getHash(): string {
        return `ionq-${this.name}-${this.numQubits}-all-to-all`;
    }
}

/**
 * Common topology generators for different hardware architectures
 */
export class TopologyGenerator {
    /**
     * Linear/chain topology
     */
    static linear(numQubits: number): TopologyGraph {
        const nodes = Array.from({ length: numQubits }, (_, i) => i);
        const edges: [number, number][] = [];
        
        for (let i = 0; i < numQubits - 1; i++) {
            edges.push([i, i + 1]);
        }
        
        return new TopologyGraph(nodes, edges);
    }
    
    /**
     * 2D grid topology
     */
    static grid(rows: number, cols: number): TopologyGraph {
        const numQubits = rows * cols;
        const nodes = Array.from({ length: numQubits }, (_, i) => i);
        const edges: [number, number][] = [];
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const qubit = row * cols + col;
                
                // Connect to right neighbor
                if (col < cols - 1) {
                    edges.push([qubit, qubit + 1]);
                }
                
                // Connect to bottom neighbor
                if (row < rows - 1) {
                    edges.push([qubit, qubit + cols]);
                }
            }
        }
        
        return new TopologyGraph(nodes, edges);
    }
    
    /**
     * Hexagonal lattice topology (like Google's Sycamore)
     */
    static hexagonal(layers: number): TopologyGraph {
        const nodes: number[] = [];
        const edges: [number, number][] = [];
        
        // This is a simplified version - actual hexagonal lattice is more complex
        let qubitIndex = 0;
        
        for (let layer = 0; layer < layers; layer++) {
            const qubitsInLayer = 6 * layer || 1; // Center has 1 qubit
            const layerStart = qubitIndex;
            
            for (let i = 0; i < qubitsInLayer; i++) {
                nodes.push(qubitIndex);
                
                // Connect within layer
                if (i > 0) {
                    edges.push([qubitIndex - 1, qubitIndex]);
                }
                
                // Connect to previous layer
                if (layer > 0) {
                    const prevLayerQubit = layerStart - qubitsInLayer / 2 + Math.floor(i / 2);
                    if (prevLayerQubit >= 0 && prevLayerQubit < layerStart) {
                        edges.push([prevLayerQubit, qubitIndex]);
                    }
                }
                
                qubitIndex++;
            }
            
            // Close the ring for layers > 0
            if (layer > 0 && qubitsInLayer > 1) {
                edges.push([layerStart, qubitIndex - 1]);
            }
        }
        
        return new TopologyGraph(nodes, edges);
    }
    
    /**
     * Heavy-hex topology (IBM's latest)
     */
    static heavyHex(distance: number): TopologyGraph {
        // Simplified heavy-hex topology
        const nodes: number[] = [];
        const edges: [number, number][] = [];
        
        // This would need a more sophisticated implementation
        // for a real heavy-hex topology
        return this.grid(distance * 2, distance * 2);
    }
}

/**
 * Device factory for creating hardware targets
 */
export class HardwareTargetFactory {
    private static readonly DEVICE_CONFIGS = new Map([
        ['ibm_washington', {
            provider: 'IBM',
            qubits: 127,
            topology: 'heavy_hex',
            baseErrorRate: 0.001
        }],
        ['google_sycamore', {
            provider: 'Google',
            qubits: 70,
            topology: 'hexagonal',
            baseErrorRate: 0.002
        }],
        ['rigetti_aspen', {
            provider: 'Rigetti',
            qubits: 32,
            topology: 'grid',
            baseErrorRate: 0.015
        }],
        ['ionq_aria', {
            provider: 'IonQ',
            qubits: 25,
            topology: 'all_to_all',
            baseErrorRate: 0.0005
        }]
    ]);
    
    static create(deviceName: string): HardwareTarget {
        const config = this.DEVICE_CONFIGS.get(deviceName);
        if (!config) {
            throw new Error(`Unknown device: ${deviceName}`);
        }
        
        const topology = this.createTopology(config.topology, config.qubits);
        const calibration = this.createMockCalibration(config.qubits, config.baseErrorRate);
        
        switch (config.provider) {
            case 'IBM':
                return new IBMQuantumTarget(deviceName, topology, calibration);
            case 'Google':
                return new GoogleQuantumTarget(deviceName, topology, calibration);
            case 'Rigetti':
                return new RigettiQuantumTarget(deviceName, topology, calibration);
            case 'IonQ':
                return new IonQQuantumTarget(deviceName, config.qubits, calibration);
            default:
                throw new Error(`Unknown provider: ${config.provider}`);
        }
    }
    
    private static createTopology(type: string, qubits: number): TopologyGraph {
        switch (type) {
            case 'linear':
                return TopologyGenerator.linear(qubits);
            case 'grid':
                const side = Math.ceil(Math.sqrt(qubits));
                return TopologyGenerator.grid(side, side);
            case 'hexagonal':
                const layers = Math.ceil(Math.sqrt(qubits / 6));
                return TopologyGenerator.hexagonal(layers);
            case 'heavy_hex':
                const distance = Math.ceil(Math.sqrt(qubits / 8));
                return TopologyGenerator.heavyHex(distance);
            default:
                return TopologyGenerator.linear(qubits);
        }
    }
    
    private static createMockCalibration(qubits: number, baseErrorRate: number): DeviceCalibration {
        const gateErrorRates = new Map([
            ['X', baseErrorRate],
            ['Y', baseErrorRate],
            ['Z', baseErrorRate * 0.1],
            ['H', baseErrorRate * 1.2],
            ['CX', baseErrorRate * 10],
            ['CZ', baseErrorRate * 8]
        ]);
        
        const readoutErrorRate = Array(qubits).fill(0).map(() => 
            baseErrorRate * 2 + Math.random() * baseErrorRate
        );
        
        const crosstalkMatrix = Array(qubits).fill(0).map(() => 
            Array(qubits).fill(0).map(() => Math.random() * baseErrorRate * 0.1)
        );
        
        return {
            numQubits: qubits,
            coherenceTime: 100 + Math.random() * 50, // μs
            gateErrorRates,
            readoutErrorRate,
            crosstalkMatrix,
            gateExecutionTimes: new Map([
                ['X', 35], ['Y', 35], ['Z', 0],
                ['CX', 400], ['CZ', 300]
            ]),
            temperature: 0.015, // 15 mK
            timestamp: new Date()
        };
    }
}

export interface CircuitExecutionResult {
    counts: Map<string, number>;
    executionTime: number;
    queueTime: number;
    calibrationData: DeviceCalibration;
    jobMetadata: {
        jobId: string;
        shots: number;
        circuitDepth: number;
        totalGates: number;
    };
}