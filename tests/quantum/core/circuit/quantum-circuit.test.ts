import { QuantumCircuit } from '../../../../src/quantum/core/circuit/quantum-circuit';
import { StandardGates } from '../../../../src/quantum/core/circuit/quantum-gate';

describe('Quantum Circuit Operations', () => {
  describe('Circuit Creation', () => {
    test('should create empty circuit correctly', () => {
      const circuit = new QuantumCircuit(3, 'test-circuit');
      
      expect(circuit.qubits).toBe(3);
      expect(circuit.name).toBe('test-circuit');
      expect(circuit.gates.length).toBe(0);
      expect(circuit.measurements.length).toBe(0);
      expect(circuit.classicalBits).toBe(0);
      expect(circuit.depth).toBe(0);
    });

    test('should create circuit with metadata', () => {
      const metadata = {
        author: 'Test Author',
        description: 'Test circuit',
        tags: ['test', 'quantum'],
        version: '1.0'
      };
      
      const circuit = new QuantumCircuit(2, 'meta-circuit', metadata);
      
      expect(circuit.metadata.author).toBe('Test Author');
      expect(circuit.metadata.description).toBe('Test circuit');
      expect(circuit.metadata.tags).toEqual(['test', 'quantum']);
      expect(circuit.metadata.version).toBe('1.0');
      expect(circuit.metadata.created).toBeInstanceOf(Date);
      expect(circuit.metadata.modified).toBeInstanceOf(Date);
    });
  });

  describe('Gate Operations', () => {
    test('should add gates correctly', () => {
      const circuit = new QuantumCircuit(2);
      const hGate = StandardGates.H(0);
      const cnotGate = StandardGates.CNOT(0, 1);
      
      circuit.addGate(hGate).addGate(cnotGate);
      
      expect(circuit.gates.length).toBe(2);
      expect(circuit.gates[0]).toBe(hGate);
      expect(circuit.gates[1]).toBe(cnotGate);
    });

    test('should reject gates operating on non-existent qubits', () => {
      const circuit = new QuantumCircuit(2);
      const invalidGate = StandardGates.X(2); // Qubit 2 doesn't exist
      
      expect(() => circuit.addGate(invalidGate))
        .toThrow('Gate operates on qubit 2 but circuit only has 2 qubits');
    });

    test('should update modified timestamp when adding gates', () => {
      const circuit = new QuantumCircuit(1);
      const originalModified = circuit.metadata.modified;
      
      // Wait a small amount to ensure timestamp difference
      setTimeout(() => {
        circuit.addGate(StandardGates.X(0));
        expect(circuit.metadata.modified!.getTime()).toBeGreaterThan(originalModified!.getTime());
      }, 10);
    });
  });

  describe('Measurement Operations', () => {
    test('should add measurements correctly', () => {
      const circuit = new QuantumCircuit(3);
      
      circuit.addMeasurement(0, 0);
      circuit.addMeasurement(1, 1);
      circuit.addMeasurement(2, 0); // Measure to same classical bit
      
      expect(circuit.measurements.length).toBe(3);
      expect(circuit.classicalBits).toBe(2);
      expect(circuit.measurements[0].qubit).toBe(0);
      expect(circuit.measurements[0].classicalBit).toBe(0);
      expect(circuit.measurements[1].qubit).toBe(1);
      expect(circuit.measurements[1].classicalBit).toBe(1);
    });

    test('should reject measurements on non-existent qubits', () => {
      const circuit = new QuantumCircuit(2);
      
      expect(() => circuit.addMeasurement(2, 0))
        .toThrow('Cannot measure qubit 2: circuit only has 2 qubits');
    });
  });

  describe('Circuit Properties', () => {
    test('should calculate depth correctly', () => {
      const circuit = new QuantumCircuit(3);
      
      // Layer 1: H on qubit 0, X on qubit 1
      circuit.addGate(StandardGates.H(0));
      circuit.addGate(StandardGates.X(1));
      
      // Layer 2: CNOT(0,1) - depends on both qubits
      circuit.addGate(StandardGates.CNOT(0, 1));
      
      // Layer 3: Y on qubit 2 (independent)
      circuit.addGate(StandardGates.Y(2));
      
      expect(circuit.depth).toBe(2); // CNOT and Y can be in parallel with earlier gates
    });

    test('should count gates correctly', () => {
      const circuit = new QuantumCircuit(2);
      
      circuit.addGate(StandardGates.H(0));
      circuit.addGate(StandardGates.X(1));
      circuit.addGate(StandardGates.CNOT(0, 1));
      circuit.addGate(StandardGates.H(0));
      
      const gateCounts = circuit.gateCount();
      
      expect(gateCounts['H']).toBe(2);
      expect(gateCounts['X']).toBe(1);
      expect(gateCounts['CNOT']).toBe(1);
      expect(circuit.totalGateCount()).toBe(4);
    });

    test('should get qubit connectivity', () => {
      const circuit = new QuantumCircuit(3);
      
      circuit.addGate(StandardGates.CNOT(0, 1));
      circuit.addGate(StandardGates.CNOT(1, 2));
      circuit.addGate(StandardGates.H(0)); // Single qubit gate
      
      const connectivity = circuit.getQubitConnectivity();
      
      expect(connectivity).toEqual([[0, 1], [1, 2]]);
    });
  });

  describe('Circuit Manipulation', () => {
    test('should slice circuit correctly', () => {
      const circuit = new QuantumCircuit(2);
      
      circuit.addGate(StandardGates.H(0));
      circuit.addGate(StandardGates.X(1));
      circuit.addGate(StandardGates.CNOT(0, 1));
      circuit.addGate(StandardGates.Y(0));
      
      const slice = circuit.slice(1, 3);
      
      expect(slice.gates.length).toBe(2);
      expect(slice.gates[0].name).toBe('X');
      expect(slice.gates[1].name).toBe('CNOT');
    });

    test('should reverse circuit correctly', () => {
      const circuit = new QuantumCircuit(2);
      
      circuit.addGate(StandardGates.H(0));
      circuit.addGate(StandardGates.X(1));
      circuit.addGate(StandardGates.CNOT(0, 1));
      
      const reversed = circuit.reverse();
      
      expect(reversed.gates.length).toBe(3);
      // Gates should be in reverse order and inverted
      expect(reversed.gates[0].name).toBe('CNOT_inv');
      expect(reversed.gates[1].name).toBe('X_inv');
      expect(reversed.gates[2].name).toBe('H_inv');
    });

    test('should copy circuit correctly', () => {
      const circuit = new QuantumCircuit(2, 'original');
      
      circuit.addGate(StandardGates.H(0));
      circuit.addGate(StandardGates.CNOT(0, 1));
      circuit.addMeasurement(0, 0);
      circuit.addMeasurement(1, 1);
      
      const copy = circuit.copy();
      
      expect(copy.qubits).toBe(circuit.qubits);
      expect(copy.name).toBe(circuit.name);
      expect(copy.gates.length).toBe(circuit.gates.length);
      expect(copy.measurements.length).toBe(circuit.measurements.length);
      expect(copy.classicalBits).toBe(circuit.classicalBits);
      
      // Verify it's a deep copy
      copy.addGate(StandardGates.X(0));
      expect(copy.gates.length).toBe(circuit.gates.length + 1);
    });

    test('should compose circuits correctly', () => {
      const circuit1 = new QuantumCircuit(2, 'circuit1');
      const circuit2 = new QuantumCircuit(2, 'circuit2');
      
      circuit1.addGate(StandardGates.H(0));
      circuit1.addGate(StandardGates.X(1));
      
      circuit2.addGate(StandardGates.CNOT(0, 1));
      circuit2.addGate(StandardGates.Y(0));
      circuit2.addMeasurement(0, 0);
      
      const composed = circuit1.compose(circuit2);
      
      expect(composed.gates.length).toBe(4);
      expect(composed.measurements.length).toBe(1);
      expect(composed.gates[0].name).toBe('H');
      expect(composed.gates[1].name).toBe('X');
      expect(composed.gates[2].name).toBe('CNOT');
      expect(composed.gates[3].name).toBe('Y');
    });

    test('should reject composition of circuits with different qubit counts', () => {
      const circuit1 = new QuantumCircuit(2);
      const circuit2 = new QuantumCircuit(3);
      
      expect(() => circuit1.compose(circuit2))
        .toThrow('Cannot compose circuits with different numbers of qubits');
    });

    test('should create circuit power correctly', () => {
      const circuit = new QuantumCircuit(1, 'base');
      circuit.addGate(StandardGates.X(0));
      
      const squared = circuit.power(2);
      const cubed = circuit.power(3);
      const zeroth = circuit.power(0);
      
      expect(squared.gates.length).toBe(2);
      expect(cubed.gates.length).toBe(3);
      expect(zeroth.gates.length).toBe(0);
      expect(squared.name).toBe('base_power_2');
      expect(cubed.name).toBe('base_power_3');
    });

    test('should reject negative powers', () => {
      const circuit = new QuantumCircuit(1);
      
      expect(() => circuit.power(-1))
        .toThrow('Negative exponents not supported');
    });
  });

  describe('QASM Export', () => {
    test('should export simple circuit to QASM', () => {
      const circuit = new QuantumCircuit(2, 'test');
      
      circuit.addGate(StandardGates.H(0));
      circuit.addGate(StandardGates.CNOT(0, 1));
      circuit.addMeasurement(0, 0);
      circuit.addMeasurement(1, 1);
      
      const qasm = circuit.toQASM();
      
      expect(qasm).toContain('OPENQASM 2.0');
      expect(qasm).toContain('include "qelib1.inc"');
      expect(qasm).toContain('qreg q[2]');
      expect(qasm).toContain('creg c[2]');
      expect(qasm).toContain('h q[0]');
      expect(qasm).toContain('cx q[0],q[1]');
      expect(qasm).toContain('measure q[0] -> c[0]');
      expect(qasm).toContain('measure q[1] -> c[1]');
    });

    test('should handle parameterized gates in QASM', () => {
      const circuit = new QuantumCircuit(1);
      
      circuit.addGate(StandardGates.RX(0, Math.PI / 2));
      circuit.addGate(StandardGates.RY(0, Math.PI / 3));
      circuit.addGate(StandardGates.RZ(0, Math.PI / 4));
      
      const qasm = circuit.toQASM();
      
      expect(qasm).toContain(`rx(${Math.PI / 2}) q[0]`);
      expect(qasm).toContain(`ry(${Math.PI / 3}) q[0]`);
      expect(qasm).toContain(`rz(${Math.PI / 4}) q[0]`);
    });

    test('should handle circuit without measurements', () => {
      const circuit = new QuantumCircuit(1);
      circuit.addGate(StandardGates.H(0));
      
      const qasm = circuit.toQASM();
      
      expect(qasm).toContain('OPENQASM 2.0');
      expect(qasm).toContain('qreg q[1]');
      expect(qasm).not.toContain('creg');
      expect(qasm).toContain('h q[0]');
      expect(qasm).not.toContain('measure');
    });
  });

  describe('String Representation', () => {
    test('should provide meaningful string representation', () => {
      const circuit = new QuantumCircuit(3, 'test-circuit');
      
      circuit.addGate(StandardGates.H(0));
      circuit.addGate(StandardGates.H(1));
      circuit.addGate(StandardGates.CNOT(0, 1));
      circuit.addGate(StandardGates.X(2));
      
      const str = circuit.toString();
      
      expect(str).toContain('QuantumCircuit(3 qubits, 4 gates, depth=');
      expect(str).toContain('Name: test-circuit');
      expect(str).toContain('Gate counts:');
      expect(str).toContain('H: 2');
      expect(str).toContain('CNOT: 1');
      expect(str).toContain('X: 1');
    });
  });
});