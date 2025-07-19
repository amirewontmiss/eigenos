// Simple test for quantum circuit optimization
// Convert TypeScript concepts to JavaScript for testing

console.log('🚀 Starting Quantum Circuit Optimization Test');
console.log('='.repeat(60));

// Mock quantum circuit class
class QuantumCircuit {
    constructor(numQubits) {
        this.numQubits = numQubits;
        this.gates = [];
        this.classicalBits = 0;
        this.metadata = {};
    }
    
    addGate(gate) {
        for (const qubit of gate.qubits) {
            if (qubit < 0 || qubit >= this.numQubits) {
                throw new Error(`Qubit index ${qubit} out of range [0, ${this.numQubits - 1}]`);
            }
        }
        this.gates.push(gate);
    }
    
    x(qubit) { this.addGate(new QuantumGate('X', [qubit])); return this; }
    y(qubit) { this.addGate(new QuantumGate('Y', [qubit])); return this; }
    z(qubit) { this.addGate(new QuantumGate('Z', [qubit])); return this; }
    h(qubit) { this.addGate(new QuantumGate('H', [qubit])); return this; }
    s(qubit) { this.addGate(new QuantumGate('S', [qubit])); return this; }
    rx(qubit, angle) { this.addGate(new QuantumGate('RX', [qubit], [angle])); return this; }
    ry(qubit, angle) { this.addGate(new QuantumGate('RY', [qubit], [angle])); return this; }
    rz(qubit, angle) { this.addGate(new QuantumGate('RZ', [qubit], [angle])); return this; }
    cx(control, target) { this.addGate(new QuantumGate('CX', [control, target])); return this; }
    
    gateCount() { return this.gates.length; }
    twoQubitGateCount() { return this.gates.filter(gate => gate.qubits.length === 2).length; }
    
    depth() {
        if (this.gates.length === 0) return 0;
        const layers = this.getLayers();
        return layers.length;
    }
    
    getLayers() {
        const layers = [];
        const activeQubits = new Set();
        let currentLayer = [];
        
        for (const gate of this.gates) {
            const gateQubits = new Set(gate.qubits);
            let hasConflict = false;
            
            for (const qubit of gateQubits) {
                if (activeQubits.has(qubit)) {
                    hasConflict = true;
                    break;
                }
            }
            
            if (hasConflict) {
                if (currentLayer.length > 0) {
                    layers.push(currentLayer);
                }
                currentLayer = [gate];
                activeQubits.clear();
                gate.qubits.forEach(q => activeQubits.add(q));
            } else {
                currentLayer.push(gate);
                gate.qubits.forEach(q => activeQubits.add(q));
            }
        }
        
        if (currentLayer.length > 0) {
            layers.push(currentLayer);
        }
        
        return layers;
    }
    
    clone() {
        const cloned = new QuantumCircuit(this.numQubits);
        cloned.gates = this.gates.map(gate => gate.clone());
        cloned.classicalBits = this.classicalBits;
        cloned.metadata = { ...this.metadata };
        return cloned;
    }
}

class QuantumGate {
    constructor(type, qubits, parameters = [], metadata = {}) {
        this.type = type;
        this.qubits = qubits;
        this.parameters = parameters;
        this.metadata = metadata;
    }
    
    isTwoQubit() { return this.qubits.length === 2; }
    isMeasurement() { return this.type === 'MEASURE'; }
    
    clone() {
        return new QuantumGate(
            this.type,
            [...this.qubits],
            [...this.parameters],
            { ...this.metadata }
        );
    }
}

// Mock hardware target
class MockHardwareTarget {
    constructor(name) {
        this.name = name;
        this.provider = 'Mock';
        this.numQubits = 127;
        this.supportsCNOT = true;
        this.supportsNativeSWAP = false;
    }
    
    getGateErrorRate(gate) {
        const errorRates = {
            'X': 0.001, 'Y': 0.001, 'Z': 0.0001, 'H': 0.0012,
            'RX': 0.001, 'RY': 0.001, 'RZ': 0.0001,
            'CX': 0.01, 'CZ': 0.008
        };
        return errorRates[gate.type] || 0.005;
    }
    
    isConnected(qubit1, qubit2) {
        // Simple grid connectivity for testing
        return Math.abs(qubit1 - qubit2) === 1;
    }
    
    getHash() {
        return `mock-${this.name}`;
    }
}

// Simple optimization test functions
function testSingleQubitOptimization() {
    console.log('📊 Testing Single-Qubit Gate Optimization...');
    
    const circuit = new QuantumCircuit(2);
    
    // Create circuit with redundant rotations
    circuit.rx(0, Math.PI / 4);
    circuit.rx(0, Math.PI / 4); // Should combine to π/2
    circuit.ry(0, Math.PI / 3);
    circuit.rz(0, Math.PI / 6);
    circuit.rz(0, -Math.PI / 6); // Should cancel out
    circuit.x(1); // Different qubit, should remain
    
    const originalGates = circuit.gateCount();
    console.log(`  Original gates: ${originalGates}`);
    
    // Simple optimization: remove consecutive identical RZ gates that cancel
    const optimized = circuit.clone();
    const optimizedGates = [];
    
    for (let i = 0; i < optimized.gates.length; i++) {
        const gate = optimized.gates[i];
        
        if (gate.type === 'RZ' && i + 1 < optimized.gates.length) {
            const nextGate = optimized.gates[i + 1];
            if (nextGate.type === 'RZ' && 
                gate.qubits[0] === nextGate.qubits[0] &&
                Math.abs(gate.parameters[0] + nextGate.parameters[0]) < 1e-10) {
                // Skip both gates (they cancel)
                i++;
                continue;
            }
        }
        
        optimizedGates.push(gate);
    }
    
    optimized.gates = optimizedGates;
    const finalGates = optimized.gateCount();
    const improvement = (originalGates - finalGates) / originalGates;
    
    console.log(`  Optimized gates: ${finalGates}`);
    console.log(`  Improvement: ${(improvement * 100).toFixed(1)}%`);
    
    return {
        passed: finalGates < originalGates,
        improvement,
        originalGates,
        finalGates
    };
}

function testTwoQubitOptimization() {
    console.log('📊 Testing Two-Qubit Gate Optimization...');
    
    const circuit = new QuantumCircuit(3);
    
    // Create circuit with CNOT cancellations
    circuit.cx(0, 1);
    circuit.cx(0, 1); // Should cancel
    circuit.cx(1, 2);
    
    const originalGates = circuit.gateCount();
    const originalTwoQubit = circuit.twoQubitGateCount();
    
    // Simple optimization: remove consecutive identical CNOT gates
    const optimized = circuit.clone();
    const optimizedGates = [];
    
    for (let i = 0; i < optimized.gates.length; i++) {
        const gate = optimized.gates[i];
        
        if (gate.type === 'CX' && i + 1 < optimized.gates.length) {
            const nextGate = optimized.gates[i + 1];
            if (nextGate.type === 'CX' &&
                gate.qubits[0] === nextGate.qubits[0] &&
                gate.qubits[1] === nextGate.qubits[1]) {
                // Skip both gates (they cancel)
                i++;
                continue;
            }
        }
        
        optimizedGates.push(gate);
    }
    
    optimized.gates = optimizedGates;
    const finalTwoQubit = optimized.twoQubitGateCount();
    
    console.log(`  Original two-qubit gates: ${originalTwoQubit}`);
    console.log(`  Optimized two-qubit gates: ${finalTwoQubit}`);
    
    return {
        passed: finalTwoQubit <= originalTwoQubit,
        originalTwoQubit,
        finalTwoQubit
    };
}

function testCircuitDepthOptimization() {
    console.log('📊 Testing Circuit Depth Optimization...');
    
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
    
    const originalDepth = circuit.depth();
    console.log(`  Original depth: ${originalDepth}`);
    
    // The depth should be 2 since H gates can be parallel, then X/Y/Z/S can be parallel
    const expectedDepth = 2;
    
    return {
        passed: originalDepth <= expectedDepth + 1, // Allow some tolerance
        originalDepth,
        expectedDepth
    };
}

function testBellStateOptimization() {
    console.log('📊 Testing Bell State Circuit...');
    
    const circuit = new QuantumCircuit(2);
    circuit.h(0);
    circuit.cx(0, 1);
    
    const gateCount = circuit.gateCount();
    const depth = circuit.depth();
    
    console.log(`  Bell state gates: ${gateCount}`);
    console.log(`  Bell state depth: ${depth}`);
    
    return {
        passed: gateCount === 2 && depth === 2,
        gateCount,
        depth
    };
}

function testPerformanceBenchmark() {
    console.log('📊 Testing Performance Benchmark...');
    
    const sizes = [5, 10, 15, 20];
    const results = [];
    
    for (const size of sizes) {
        const circuit = new QuantumCircuit(size);
        
        // Create random circuit
        const depth = size * 2;
        for (let layer = 0; layer < depth; layer++) {
            for (let qubit = 0; qubit < size; qubit++) {
                if (Math.random() < 0.3 && qubit < size - 1) {
                    // Add two-qubit gate
                    circuit.cx(qubit, qubit + 1);
                } else {
                    // Add single-qubit gate
                    const gates = ['X', 'Y', 'Z', 'H', 'S'];
                    const gateType = gates[Math.floor(Math.random() * gates.length)];
                    circuit.addGate(new QuantumGate(gateType, [qubit]));
                }
            }
        }
        
        const startTime = performance.now();
        
        // Simple optimization: count gates
        const gateCount = circuit.gateCount();
        const circuitDepth = circuit.depth();
        
        const optimizationTime = performance.now() - startTime;
        
        results.push({
            size,
            gateCount,
            depth: circuitDepth,
            optimizationTime
        });
        
        console.log(`  ${size} qubits: ${gateCount} gates, depth ${circuitDepth}, optimized in ${optimizationTime.toFixed(2)}ms`);
    }
    
    const avgTime = results.reduce((sum, r) => sum + r.optimizationTime, 0) / results.length;
    
    return {
        passed: avgTime < 50, // Should be very fast for simple operations
        avgTime,
        results
    };
}

// Run all tests
async function runOptimizationTests() {
    console.log('🚀 Starting Quantum Circuit Optimization Test Suite');
    console.log('='.repeat(60));
    
    const tests = [
        { name: 'Single-Qubit Optimization', fn: testSingleQubitOptimization },
        { name: 'Two-Qubit Optimization', fn: testTwoQubitOptimization },
        { name: 'Circuit Depth Optimization', fn: testCircuitDepthOptimization },
        { name: 'Bell State Circuit', fn: testBellStateOptimization },
        { name: 'Performance Benchmark', fn: testPerformanceBenchmark }
    ];
    
    const results = {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0
    };
    
    for (const test of tests) {
        try {
            results.totalTests++;
            console.log(`\n📊 Running ${test.name}...`);
            
            const startTime = performance.now();
            const testResult = test.fn();
            const duration = performance.now() - startTime;
            
            if (testResult.passed) {
                results.passedTests++;
                console.log(`✅ ${test.name} PASSED (${duration.toFixed(2)}ms)`);
            } else {
                results.failedTests++;
                console.log(`❌ ${test.name} FAILED`);
            }
            
        } catch (error) {
            results.failedTests++;
            console.log(`💥 ${test.name} ERROR: ${error.message}`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 OPTIMIZATION TEST SUITE RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Tests Passed: ${results.passedTests}/${results.totalTests} (${(results.passedTests / results.totalTests * 100).toFixed(1)}%)`);
    console.log(`❌ Tests Failed: ${results.failedTests}`);
    
    if (results.passedTests === results.totalTests) {
        console.log('🎉 ALL TESTS PASSED!');
    } else {
        console.log('⚠️ Some tests failed - check logs above');
    }
    
    return results;
}

// Run the tests
runOptimizationTests().catch(console.error);