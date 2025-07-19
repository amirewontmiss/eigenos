import { QuantumGate } from '../core/circuit';
import { HardwareTarget } from '../hardware/types';

/**
 * Comprehensive optimization metrics tracking
 */
export class OptimizationMetrics {
    private steps: OptimizationStep[] = [];
    private startTime: number = Date.now();
    
    addStep(step: OptimizationStep): void {
        this.steps.push(step);
    }
    
    getOriginalMetrics(): CircuitMetrics {
        if (this.steps.length === 0) {
            throw new Error('No optimization steps recorded');
        }
        
        const firstStep = this.steps[0];
        return {
            gateCount: firstStep.gateCountBefore,
            depth: firstStep.depthBefore,
            twoQubitGateCount: this.countTwoQubitGates(firstStep.gateCountBefore),
            fidelity: firstStep.fidelityBefore
        };
    }
    
    getFinalMetrics(): CircuitMetrics {
        if (this.steps.length === 0) {
            throw new Error('No optimization steps recorded');
        }
        
        const lastStep = this.steps[this.steps.length - 1];
        return {
            gateCount: lastStep.gateCountAfter,
            depth: lastStep.depthAfter,
            twoQubitGateCount: this.countTwoQubitGates(lastStep.gateCountAfter),
            fidelity: lastStep.fidelityAfter
        };
    }
    
    getTotalDuration(): number {
        return this.steps.reduce((total, step) => total + step.duration, 0);
    }
    
    getStepSummary(): OptimizationStepSummary[] {
        return this.steps.map(step => ({
            stepName: step.stepName,
            duration: step.duration,
            gateReduction: step.gateCountBefore - step.gateCountAfter,
            depthReduction: step.depthBefore - step.depthAfter,
            improvementRatio: this.calculateImprovement(step)
        }));
    }
    
    private countTwoQubitGates(totalGates: number): number {
        // Rough estimate - in practice this would be calculated from actual gates
        return Math.floor(totalGates * 0.3);
    }
    
    private calculateImprovement(step: OptimizationStep): number {
        const gateImprovement = (step.gateCountBefore - step.gateCountAfter) / step.gateCountBefore;
        const depthImprovement = (step.depthBefore - step.depthAfter) / step.depthBefore;
        return (gateImprovement + depthImprovement) / 2;
    }
}

export interface OptimizationStep {
    stepName: string;
    duration: number;
    gateCountBefore: number;
    gateCountAfter: number;
    depthBefore: number;
    depthAfter: number;
    fidelityBefore?: number;
    fidelityAfter?: number;
    swapCount?: number;
    commutationMoves?: number;
    rotationCombinations?: number;
    mitigationGatesAdded?: number;
    routingOverhead?: number;
    parallelizationGain?: number;
    gateReduction?: number;
    estimatedFidelityImprovement?: number;
}

export interface CircuitMetrics {
    gateCount: number;
    depth: number;
    twoQubitGateCount: number;
    fidelity?: number;
}

export interface OptimizationStepSummary {
    stepName: string;
    duration: number;
    gateReduction: number;
    depthReduction: number;
    improvementRatio: number;
}

/**
 * Cost model interface for optimization decisions
 */
export interface CostModel {
    calculateGateCost(gate: QuantumGate, target: HardwareTarget): number;
    calculateDepthCost(depth: number): number;
}

/**
 * Circuit compilation and optimization configuration
 */
export interface OptimizationConfig {
    target: HardwareTarget;
    optimizationLevel: 0 | 1 | 2 | 3; // 0=none, 1=basic, 2=standard, 3=aggressive
    enableRouting: boolean;
    enableErrorMitigation: boolean;
    maxOptimizationTime?: number; // milliseconds
    preserveLayout?: boolean;
    customPasses?: OptimizationPass[];
}

export interface OptimizationPass {
    name: string;
    priority: number;
    enabled: boolean;
    configuration?: Record<string, any>;
}

/**
 * Advanced optimization algorithms
 */
export enum OptimizationAlgorithm {
    SABRE_ROUTING = 'sabre_routing',
    COMMUTATION_ANALYSIS = 'commutation_analysis',
    GATE_FUSION = 'gate_fusion',
    DYNAMICAL_DECOUPLING = 'dynamical_decoupling',
    VIRTUAL_SWAP = 'virtual_swap',
    APPROXIMATE_SYNTHESIS = 'approximate_synthesis'
}

/**
 * Quantum error characterization for optimization
 */
export interface ErrorModel {
    singleQubitGateError: Map<string, number>; // gate_type -> error_rate
    twoQubitGateError: Map<string, number>;
    readoutError: number[];
    coherenceTime: number[];
    gateTime: Map<string, number>;
    crosstalk: number[][]; // crosstalk matrix
}

/**
 * Circuit analysis results
 */
export interface CircuitAnalysis {
    criticalPath: QuantumGate[];
    parallelizationOpportunities: ParallelizationOpportunity[];
    commutationGroups: QuantumGate[][];
    resourceUtilization: ResourceUtilization;
    errorBudget: ErrorBudgetAnalysis;
}

export interface ParallelizationOpportunity {
    gates: QuantumGate[];
    estimatedSpeedup: number;
    requiredResources: number;
}

export interface ResourceUtilization {
    qubitUtilization: number[]; // per qubit
    averageUtilization: number;
    peakUtilization: number;
    idleTime: number[];
}

export interface ErrorBudgetAnalysis {
    totalExpectedError: number;
    errorContributions: Map<string, number>; // gate_type -> total_error
    criticalErrorSources: string[];
    recommendedMitigations: string[];
}

/**
 * Hardware-aware optimization strategies
 */
export interface HardwareAwareStrategy {
    preferredGateSet: Set<string>;
    nativeConnectivity: boolean;
    supportsParallelGates: boolean;
    hasEfficientSWAP: boolean;
    optimalCircuitDepth: number;
    calibrationData?: CalibrationData;
}

export interface CalibrationData {
    gateErrorRates: Map<string, number>;
    gateTimes: Map<string, number>;
    qubitCoherenceTimes: number[];
    readoutFidelities: number[];
    timestamp: Date;
    temperature: number;
    crosstalkMatrix?: number[][];
}

/**
 * Benchmarking and performance tracking
 */
export interface OptimizationBenchmark {
    circuitId: string;
    originalMetrics: CircuitMetrics;
    optimizedMetrics: CircuitMetrics;
    optimizationTime: number;
    algorithmUsed: string[];
    hardwareTarget: string;
    timestamp: Date;
    improvementScore: number;
}

export class BenchmarkTracker {
    private benchmarks: OptimizationBenchmark[] = [];
    
    addBenchmark(benchmark: OptimizationBenchmark): void {
        this.benchmarks.push(benchmark);
    }
    
    getAverageImprovement(algorithm?: string): number {
        const filtered = algorithm 
            ? this.benchmarks.filter(b => b.algorithmUsed.includes(algorithm))
            : this.benchmarks;
            
        if (filtered.length === 0) return 0;
        
        return filtered.reduce((sum, b) => sum + b.improvementScore, 0) / filtered.length;
    }
    
    getBestPerformingAlgorithm(): string {
        const algorithmScores = new Map<string, number[]>();
        
        for (const benchmark of this.benchmarks) {
            for (const algorithm of benchmark.algorithmUsed) {
                if (!algorithmScores.has(algorithm)) {
                    algorithmScores.set(algorithm, []);
                }
                algorithmScores.get(algorithm)!.push(benchmark.improvementScore);
            }
        }
        
        let bestAlgorithm = '';
        let bestScore = -Infinity;
        
        for (const [algorithm, scores] of algorithmScores) {
            const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            if (avgScore > bestScore) {
                bestScore = avgScore;
                bestAlgorithm = algorithm;
            }
        }
        
        return bestAlgorithm;
    }
    
    exportMetrics(): OptimizationMetricsExport {
        return {
            totalBenchmarks: this.benchmarks.length,
            averageImprovement: this.getAverageImprovement(),
            bestAlgorithm: this.getBestPerformingAlgorithm(),
            benchmarkHistory: this.benchmarks.map(b => ({
                circuitId: b.circuitId,
                improvementScore: b.improvementScore,
                optimizationTime: b.optimizationTime,
                timestamp: b.timestamp
            }))
        };
    }
}

export interface OptimizationMetricsExport {
    totalBenchmarks: number;
    averageImprovement: number;
    bestAlgorithm: string;
    benchmarkHistory: {
        circuitId: string;
        improvementScore: number;
        optimizationTime: number;
        timestamp: Date;
    }[];
}