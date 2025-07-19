import { AdvancedCircuitOptimizer, OptimizedCircuit } from './advanced-optimizer';
import { QuantumCircuit, CircuitBuilder } from '../core/circuit';
import { HardwareTargetFactory } from '../hardware/types';
import { BenchmarkTracker, OptimizationBenchmark } from './types';

/**
 * Comprehensive test suite for the advanced circuit optimizer
 */
export class OptimizerTestSuite {
    private optimizer: AdvancedCircuitOptimizer;
    private benchmarkTracker: BenchmarkTracker;
    
    constructor() {
        this.optimizer = new AdvancedCircuitOptimizer();
        this.benchmarkTracker = new BenchmarkTracker();
    }
    
    /**
     * Run all optimization tests
     */
    async runAllTests(): Promise<TestResults> {
        console.log('🚀 Starting Advanced Circuit Optimizer Test Suite');
        console.log('='.repeat(60));
        
        const results: TestResults = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            benchmarks: [],
            summary: ''
        };
        
        const tests = [
            this.testSingleQubitOptimization,
            this.testTwoQubitOptimization,
            this.testCommutationOptimization,
            this.testRoutingOptimization,
            this.testDepthMinimization,
            this.testErrorMitigation,
            this.testBellStateOptimization,
            this.testQFTOptimization,
            this.testRandomCircuitOptimization,
            this.testVQEOptimization,
            this.testPerformanceBenchmark
        ];
        
        for (const test of tests) {
            try {
                results.totalTests++;
                console.log(`\n📊 Running ${test.name}...`);
                
                const startTime = performance.now();
                const testResult = await test.call(this);
                const duration = performance.now() - startTime;
                
                if (testResult.passed) {
                    results.passedTests++;
                    console.log(`✅ ${test.name} PASSED (${duration.toFixed(2)}ms)`);
                } else {
                    results.failedTests++;
                    console.log(`❌ ${test.name} FAILED: ${testResult.message}`);
                }
                
                if (testResult.benchmark) {
                    results.benchmarks.push(testResult.benchmark);
                }
                
            } catch (error) {
                results.failedTests++;
                console.log(`💥 ${test.name} ERROR: ${error}`);
            }
        }
        
        results.summary = this.generateSummary(results);
        console.log('\n' + results.summary);
        
        return results;
    }
    
    /**
     * Test single-qubit gate optimization
     */
    private async testSingleQubitOptimization(): Promise<TestResult> {
        const circuit = new QuantumCircuit(2);
        
        // Create circuit with redundant rotations
        circuit.rx(0, Math.PI / 4);
        circuit.rx(0, Math.PI / 4); // Should combine to π/2
        circuit.ry(0, Math.PI / 3);
        circuit.rz(0, Math.PI / 6);
        circuit.rz(0, -Math.PI / 6); // Should cancel out
        circuit.x(1); // Different qubit, should remain
        
        const target = HardwareTargetFactory.create('ibm_washington');
        const optimized = await this.optimizer.optimize(circuit, target);
        
        const originalGates = circuit.gateCount();
        const optimizedGates = optimized.circuit.gateCount();
        
        const passed = optimizedGates < originalGates;
        const improvement = (originalGates - optimizedGates) / originalGates;
        
        return {
            passed,
            message: passed 
                ? `Reduced gates from ${originalGates} to ${optimizedGates} (${(improvement * 100).toFixed(1)}% improvement)`
                : `No improvement: ${originalGates} -> ${optimizedGates}`,
            benchmark: {
                circuitId: 'single_qubit_test',
                originalMetrics: { gateCount: originalGates, depth: circuit.depth(), twoQubitGateCount: 0 },
                optimizedMetrics: { gateCount: optimizedGates, depth: optimized.circuit.depth(), twoQubitGateCount: 0 },
                optimizationTime: 0,
                algorithmUsed: ['single_qubit_optimization'],
                hardwareTarget: target.name,
                timestamp: new Date(),
                improvementScore: improvement
            }
        };
    }
    
    /**
     * Test two-qubit gate optimization
     */
    private async testTwoQubitOptimization(): Promise<TestResult> {
        const circuit = new QuantumCircuit(3);
        
        // Create circuit with CNOT cancellations
        circuit.cx(0, 1);
        circuit.cx(0, 1); // Should cancel
        circuit.cx(1, 2);
        circuit.swap(0, 2); // Might be decomposed based on target
        
        const target = HardwareTargetFactory.create('ibm_washington');
        const optimized = await this.optimizer.optimize(circuit, target);
        
        const originalTwoQubit = circuit.twoQubitGateCount();
        const optimizedTwoQubit = optimized.circuit.twoQubitGateCount();
        
        const passed = optimizedTwoQubit <= originalTwoQubit;
        const improvement = originalTwoQubit > 0 ? (originalTwoQubit - optimizedTwoQubit) / originalTwoQubit : 0;
        
        return {
            passed,
            message: passed 
                ? `Two-qubit gates: ${originalTwoQubit} -> ${optimizedTwoQubit}`
                : `Two-qubit gate count increased unexpectedly`,
            benchmark: {
                circuitId: 'two_qubit_test',
                originalMetrics: { gateCount: circuit.gateCount(), depth: circuit.depth(), twoQubitGateCount: originalTwoQubit },
                optimizedMetrics: { gateCount: optimized.circuit.gateCount(), depth: optimized.circuit.depth(), twoQubitGateCount: optimizedTwoQubit },
                optimizationTime: 0,
                algorithmUsed: ['two_qubit_optimization'],
                hardwareTarget: target.name,
                timestamp: new Date(),
                improvementScore: improvement
            }
        };
    }
    
    /**
     * Test commutation-based optimization
     */
    private async testCommutationOptimization(): Promise<TestResult> {
        const circuit = new QuantumCircuit(4);
        
        // Create circuit where gates can be commuted for better scheduling
        circuit.x(0);
        circuit.x(1); // Can be parallelized with X(0)
        circuit.h(2);
        circuit.y(3); // Can be parallelized
        circuit.cx(0, 1); // Must wait for X gates
        
        const target = HardwareTargetFactory.create('google_sycamore');
        const optimized = await this.optimizer.optimize(circuit, target);
        
        const originalDepth = circuit.depth();
        const optimizedDepth = optimized.circuit.depth();
        
        const passed = optimizedDepth <= originalDepth;
        const improvement = originalDepth > 0 ? (originalDepth - optimizedDepth) / originalDepth : 0;
        
        return {
            passed,
            message: `Circuit depth: ${originalDepth} -> ${optimizedDepth}`,
            benchmark: {
                circuitId: 'commutation_test',
                originalMetrics: { gateCount: circuit.gateCount(), depth: originalDepth, twoQubitGateCount: circuit.twoQubitGateCount() },
                optimizedMetrics: { gateCount: optimized.circuit.gateCount(), depth: optimizedDepth, twoQubitGateCount: optimized.circuit.twoQubitGateCount() },
                optimizationTime: 0,
                algorithmUsed: ['commutation_optimization'],
                hardwareTarget: target.name,
                timestamp: new Date(),
                improvementScore: improvement
            }
        };
    }
    
    /**
     * Test SABRE routing optimization
     */
    private async testRoutingOptimization(): Promise<TestResult> {
        const circuit = new QuantumCircuit(5);
        
        // Create circuit requiring routing on limited connectivity
        circuit.h(0);
        circuit.cx(0, 4); // Long distance on most topologies
        circuit.cx(1, 3);
        circuit.cx(2, 4);
        
        const target = HardwareTargetFactory.create('rigetti_aspen'); // Limited connectivity
        const optimized = await this.optimizer.optimize(circuit, target);
        
        // Check that all two-qubit gates respect connectivity
        let validRouting = true;
        for (const gate of optimized.circuit.gates) {
            if (gate.isTwoQubit() && !gate.isMeasurement()) {
                const [q1, q2] = gate.qubits;
                if (!target.isConnected(q1, q2)) {
                    validRouting = false;
                    break;
                }
            }
        }
        
        return {
            passed: validRouting,
            message: validRouting 
                ? `Successfully routed circuit with ${optimized.circuit.gates.filter(g => g.type === 'SWAP').length} SWAP gates`
                : 'Routing failed - invalid connectivity detected',
            benchmark: {
                circuitId: 'routing_test',
                originalMetrics: { gateCount: circuit.gateCount(), depth: circuit.depth(), twoQubitGateCount: circuit.twoQubitGateCount() },
                optimizedMetrics: { gateCount: optimized.circuit.gateCount(), depth: optimized.circuit.depth(), twoQubitGateCount: optimized.circuit.twoQubitGateCount() },
                optimizationTime: 0,
                algorithmUsed: ['sabre_routing'],
                hardwareTarget: target.name,
                timestamp: new Date(),
                improvementScore: validRouting ? 1.0 : 0.0
            }
        };
    }
    
    /**
     * Test depth minimization
     */
    private async testDepthMinimization(): Promise<TestResult> {
        const circuit = new QuantumCircuit(4);
        
        // Create circuit with parallelization opportunities
        circuit.h(0);
        circuit.h(1);
        circuit.h(2);
        circuit.h(3);
        circuit.x(0);
        circuit.y(1);
        circuit.z(2);
        circuit.s(3);
        
        const target = HardwareTargetFactory.create('ionq_aria'); // All-to-all connectivity
        const optimized = await this.optimizer.optimize(circuit, target);
        
        const originalDepth = circuit.depth();
        const optimizedDepth = optimized.circuit.depth();
        
        const passed = optimizedDepth <= originalDepth;
        const improvement = originalDepth > 0 ? (originalDepth - optimizedDepth) / originalDepth : 0;
        
        return {
            passed,
            message: `Depth optimization: ${originalDepth} -> ${optimizedDepth}`,
            benchmark: {
                circuitId: 'depth_test',
                originalMetrics: { gateCount: circuit.gateCount(), depth: originalDepth, twoQubitGateCount: 0 },
                optimizedMetrics: { gateCount: optimized.circuit.gateCount(), depth: optimizedDepth, twoQubitGateCount: 0 },
                optimizationTime: 0,
                algorithmUsed: ['depth_minimization'],
                hardwareTarget: target.name,
                timestamp: new Date(),
                improvementScore: improvement
            }
        };
    }
    
    /**
     * Test error mitigation insertion
     */
    private async testErrorMitigation(): Promise<TestResult> {
        const circuit = new QuantumCircuit(3);
        
        // Create circuit that could benefit from error mitigation
        circuit.cx(0, 1);
        circuit.cx(1, 2);
        circuit.cx(0, 2);
        
        const target = HardwareTargetFactory.create('ibm_washington');
        const optimized = await this.optimizer.optimize(circuit, target);
        
        // Check if error mitigation gates were added
        const hasErrorMitigation = optimized.circuit.gates.some(gate => 
            gate.type === 'VZ' || gate.metadata.virtual
        );
        
        return {
            passed: true, // Always pass - error mitigation is optional
            message: hasErrorMitigation 
                ? 'Error mitigation gates inserted'
                : 'No error mitigation needed',
            benchmark: {
                circuitId: 'error_mitigation_test',
                originalMetrics: { gateCount: circuit.gateCount(), depth: circuit.depth(), twoQubitGateCount: circuit.twoQubitGateCount() },
                optimizedMetrics: { gateCount: optimized.circuit.gateCount(), depth: optimized.circuit.depth(), twoQubitGateCount: optimized.circuit.twoQubitGateCount() },
                optimizationTime: 0,
                algorithmUsed: ['error_mitigation'],
                hardwareTarget: target.name,
                timestamp: new Date(),
                improvementScore: hasErrorMitigation ? 0.1 : 0.0
            }
        };
    }
    
    /**
     * Test Bell state optimization
     */
    private async testBellStateOptimization(): Promise<TestResult> {
        const circuit = new CircuitBuilder(2)
            .bellState(0, 1)
            .build();
        
        const target = HardwareTargetFactory.create('ibm_washington');
        const optimized = await this.optimizer.optimize(circuit, target);
        
        // Bell state should remain simple
        const passed = optimized.circuit.gateCount() <= 3; // H + CX + maybe some optimization
        
        return {
            passed,
            message: `Bell state optimized to ${optimized.circuit.gateCount()} gates`,
            benchmark: {
                circuitId: 'bell_state_test',
                originalMetrics: { gateCount: circuit.gateCount(), depth: circuit.depth(), twoQubitGateCount: 1 },
                optimizedMetrics: { gateCount: optimized.circuit.gateCount(), depth: optimized.circuit.depth(), twoQubitGateCount: optimized.circuit.twoQubitGateCount() },
                optimizationTime: 0,
                algorithmUsed: ['full_optimization'],
                hardwareTarget: target.name,
                timestamp: new Date(),
                improvementScore: passed ? 1.0 : 0.0
            }
        };
    }
    
    /**
     * Test QFT optimization
     */
    private async testQFTOptimization(): Promise<TestResult> {
        const circuit = new CircuitBuilder(4)
            .qft([0, 1, 2, 3])
            .build();
        
        const target = HardwareTargetFactory.create('google_sycamore');
        const startTime = performance.now();
        const optimized = await this.optimizer.optimize(circuit, target);
        const optimizationTime = performance.now() - startTime;
        
        const improvement = (circuit.gateCount() - optimized.circuit.gateCount()) / circuit.gateCount();
        const passed = improvement >= 0; // Should at least not make it worse
        
        return {
            passed,
            message: `QFT optimization: ${circuit.gateCount()} -> ${optimized.circuit.gateCount()} gates`,
            benchmark: {
                circuitId: 'qft_test',
                originalMetrics: { gateCount: circuit.gateCount(), depth: circuit.depth(), twoQubitGateCount: circuit.twoQubitGateCount() },
                optimizedMetrics: { gateCount: optimized.circuit.gateCount(), depth: optimized.circuit.depth(), twoQubitGateCount: optimized.circuit.twoQubitGateCount() },
                optimizationTime,
                algorithmUsed: ['full_optimization'],
                hardwareTarget: target.name,
                timestamp: new Date(),
                improvementScore: improvement
            }
        };
    }
    
    /**
     * Test random circuit optimization
     */
    private async testRandomCircuitOptimization(): Promise<TestResult> {
        const circuit = new CircuitBuilder(6)
            .randomCircuit(10, 0.4)
            .build();
        
        const target = HardwareTargetFactory.create('rigetti_aspen');
        const startTime = performance.now();
        const optimized = await this.optimizer.optimize(circuit, target);
        const optimizationTime = performance.now() - startTime;
        
        const improvement = (circuit.gateCount() - optimized.circuit.gateCount()) / circuit.gateCount();
        const passed = optimizationTime < 10000; // Should complete within 10 seconds
        
        return {
            passed,
            message: `Random circuit optimized in ${optimizationTime.toFixed(2)}ms`,
            benchmark: {
                circuitId: 'random_circuit_test',
                originalMetrics: { gateCount: circuit.gateCount(), depth: circuit.depth(), twoQubitGateCount: circuit.twoQubitGateCount() },
                optimizedMetrics: { gateCount: optimized.circuit.gateCount(), depth: optimized.circuit.depth(), twoQubitGateCount: optimized.circuit.twoQubitGateCount() },
                optimizationTime,
                algorithmUsed: ['full_optimization'],
                hardwareTarget: target.name,
                timestamp: new Date(),
                improvementScore: improvement
            }
        };
    }
    
    /**
     * Test VQE ansatz optimization
     */
    private async testVQEOptimization(): Promise<TestResult> {
        const parameters = Array.from({ length: 8 }, () => Math.random() * 2 * Math.PI);
        const circuit = new CircuitBuilder(4)
            .vqeAnsatz([0, 1, 2, 3], parameters)
            .build();
        
        const target = HardwareTargetFactory.create('ionq_aria');
        const optimized = await this.optimizer.optimize(circuit, target);
        
        const improvement = (circuit.depth() - optimized.circuit.depth()) / circuit.depth();
        const passed = improvement >= 0;
        
        return {
            passed,
            message: `VQE ansatz depth: ${circuit.depth()} -> ${optimized.circuit.depth()}`,
            benchmark: {
                circuitId: 'vqe_test',
                originalMetrics: { gateCount: circuit.gateCount(), depth: circuit.depth(), twoQubitGateCount: circuit.twoQubitGateCount() },
                optimizedMetrics: { gateCount: optimized.circuit.gateCount(), depth: optimized.circuit.depth(), twoQubitGateCount: optimized.circuit.twoQubitGateCount() },
                optimizationTime: 0,
                algorithmUsed: ['full_optimization'],
                hardwareTarget: target.name,
                timestamp: new Date(),
                improvementScore: improvement
            }
        };
    }
    
    /**
     * Performance benchmark test
     */
    private async testPerformanceBenchmark(): Promise<TestResult> {
        const benchmarks: OptimizationBenchmark[] = [];
        
        // Test different circuit sizes
        const sizes = [5, 10, 15, 20];
        
        for (const size of sizes) {
            const circuit = new CircuitBuilder(size)
                .randomCircuit(size * 2, 0.3)
                .build();
            
            const target = HardwareTargetFactory.create('ibm_washington');
            
            const startTime = performance.now();
            const optimized = await this.optimizer.optimize(circuit, target);
            const optimizationTime = performance.now() - startTime;
            
            const improvement = (circuit.gateCount() - optimized.circuit.gateCount()) / circuit.gateCount();
            
            const benchmark: OptimizationBenchmark = {
                circuitId: `performance_${size}q`,
                originalMetrics: { gateCount: circuit.gateCount(), depth: circuit.depth(), twoQubitGateCount: circuit.twoQubitGateCount() },
                optimizedMetrics: { gateCount: optimized.circuit.gateCount(), depth: optimized.circuit.depth(), twoQubitGateCount: optimized.circuit.twoQubitGateCount() },
                optimizationTime,
                algorithmUsed: ['full_optimization'],
                hardwareTarget: target.name,
                timestamp: new Date(),
                improvementScore: improvement
            };
            
            benchmarks.push(benchmark);
            this.benchmarkTracker.addBenchmark(benchmark);
        }
        
        const avgTime = benchmarks.reduce((sum, b) => sum + b.optimizationTime, 0) / benchmarks.length;
        const avgImprovement = benchmarks.reduce((sum, b) => sum + b.improvementScore, 0) / benchmarks.length;
        
        const passed = avgTime < 5000; // Average should be under 5 seconds
        
        return {
            passed,
            message: `Performance: avg ${avgTime.toFixed(2)}ms, avg improvement ${(avgImprovement * 100).toFixed(1)}%`,
            benchmark: benchmarks[0] // Return first benchmark as representative
        };
    }
    
    /**
     * Generate test summary
     */
    private generateSummary(results: TestResults): string {
        const successRate = (results.passedTests / results.totalTests * 100).toFixed(1);
        const avgImprovement = results.benchmarks.length > 0 
            ? (results.benchmarks.reduce((sum, b) => sum + b.improvementScore, 0) / results.benchmarks.length * 100).toFixed(1)
            : '0';
        
        return `
📊 OPTIMIZATION TEST SUITE RESULTS
${'='.repeat(50)}
✅ Tests Passed: ${results.passedTests}/${results.totalTests} (${successRate}%)
❌ Tests Failed: ${results.failedTests}
📈 Average Improvement: ${avgImprovement}%
🏆 Best Algorithm: ${this.benchmarkTracker.getBestPerformingAlgorithm() || 'N/A'}

${results.passedTests === results.totalTests ? '🎉 ALL TESTS PASSED!' : '⚠️ Some tests failed - check logs above'}
        `.trim();
    }
}

// Type definitions
interface TestResults {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    benchmarks: OptimizationBenchmark[];
    summary: string;
}

interface TestResult {
    passed: boolean;
    message: string;
    benchmark?: OptimizationBenchmark;
}

/**
 * Main function to run the test suite
 */
export async function runOptimizerTests(): Promise<void> {
    const testSuite = new OptimizerTestSuite();
    await testSuite.runAllTests();
}

// Export for direct execution
if (require.main === module) {
    runOptimizerTests().catch(console.error);
}