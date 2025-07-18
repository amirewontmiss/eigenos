import { Complex } from '../../../../src/quantum/core/math/complex';
import { 
  SingleQubitGate, 
  TwoQubitGate, 
  StandardGates,
  QuantumMeasurement
} from '../../../../src/quantum/core/circuit/quantum-gate';

describe('Quantum Gate Operations', () => {
  describe('SingleQubitGate', () => {
    test('should create valid single qubit gate', () => {
      const matrix = [
        [Complex.one(), Complex.zero()],
        [Complex.zero(), Complex.one()]
      ];
      const gate = new SingleQubitGate('I', 0, [], matrix);
      
      expect(gate.name).toBe('I');
      expect(gate.qubit).toBe(0);
      expect(gate.qubits).toEqual([0]);
      expect(gate.parameters).toEqual([]);
      expect(gate.matrix).toEqual(matrix);
    });

    test('should reject invalid matrix size', () => {
      const invalidMatrix = [
        [Complex.one(), Complex.zero(), Complex.zero()],
        [Complex.zero(), Complex.one(), Complex.zero()]
      ];
      
      expect(() => new SingleQubitGate('Invalid', 0, [], invalidMatrix))
        .toThrow('Single qubit gate must have a 2x2 matrix');
    });

    test('should calculate inverse correctly', () => {
      const xGate = StandardGates.X(0);
      const xInverse = xGate.inverse();
      
      // X gate is its own inverse
      expect(xInverse.matrix[0][0].equals(Complex.zero())).toBe(true);
      expect(xInverse.matrix[0][1].equals(Complex.one())).toBe(true);
      expect(xInverse.matrix[1][0].equals(Complex.one())).toBe(true);
      expect(xInverse.matrix[1][1].equals(Complex.zero())).toBe(true);
    });

    test('should check unitarity', () => {
      const xGate = StandardGates.X(0);
      const hGate = StandardGates.H(0);
      
      expect(xGate.isUnitary()).toBe(true);
      expect(hGate.isUnitary()).toBe(true);
    });

    test('should check commutativity with other gates', () => {
      const x0 = StandardGates.X(0);
      const y0 = StandardGates.Y(0);
      const x1 = StandardGates.X(1);
      
      // Gates on different qubits should commute
      expect(x0.commutes(x1)).toBe(true);
      
      // X and Y on same qubit should not commute
      expect(x0.commutes(y0)).toBe(false);
    });
  });

  describe('TwoQubitGate', () => {
    test('should create valid two qubit gate', () => {
      const cnot = StandardGates.CNOT(0, 1);
      
      expect(cnot.name).toBe('CNOT');
      expect(cnot.controlQubit).toBe(0);
      expect(cnot.targetQubit).toBe(1);
      expect(cnot.qubits).toEqual([0, 1]);
      expect(cnot.matrix.length).toBe(4);
      expect(cnot.matrix[0].length).toBe(4);
    });

    test('should check unitarity', () => {
      const cnot = StandardGates.CNOT(0, 1);
      const cz = StandardGates.CZ(0, 1);
      
      expect(cnot.isUnitary()).toBe(true);
      expect(cz.isUnitary()).toBe(true);
    });

    test('should check commutativity', () => {
      const cnot01 = StandardGates.CNOT(0, 1);
      const cnot12 = StandardGates.CNOT(1, 2);
      const cnot02 = StandardGates.CNOT(0, 2);
      
      // Non-overlapping gates should commute
      expect(cnot01.commutes(cnot02)).toBe(false); // Share qubit 0
      expect(cnot01.commutes(cnot12)).toBe(false); // Share qubit 1
    });
  });

  describe('Standard Gates', () => {
    test('should create Pauli-X gate correctly', () => {
      const x = StandardGates.X(0);
      
      expect(x.name).toBe('X');
      expect(x.qubit).toBe(0);
      
      // Check matrix elements
      expect(x.matrix[0][0].equals(Complex.zero())).toBe(true);
      expect(x.matrix[0][1].equals(Complex.one())).toBe(true);
      expect(x.matrix[1][0].equals(Complex.one())).toBe(true);
      expect(x.matrix[1][1].equals(Complex.zero())).toBe(true);
    });

    test('should create Pauli-Y gate correctly', () => {
      const y = StandardGates.Y(0);
      
      expect(y.name).toBe('Y');
      expect(y.matrix[0][0].equals(Complex.zero())).toBe(true);
      expect(y.matrix[0][1].equals(new Complex(0, -1))).toBe(true);
      expect(y.matrix[1][0].equals(new Complex(0, 1))).toBe(true);
      expect(y.matrix[1][1].equals(Complex.zero())).toBe(true);
    });

    test('should create Pauli-Z gate correctly', () => {
      const z = StandardGates.Z(0);
      
      expect(z.name).toBe('Z');
      expect(z.matrix[0][0].equals(Complex.one())).toBe(true);
      expect(z.matrix[0][1].equals(Complex.zero())).toBe(true);
      expect(z.matrix[1][0].equals(Complex.zero())).toBe(true);
      expect(z.matrix[1][1].equals(new Complex(-1, 0))).toBe(true);
    });

    test('should create Hadamard gate correctly', () => {
      const h = StandardGates.H(0);
      const sqrt2 = Math.sqrt(2);
      
      expect(h.name).toBe('H');
      expect(h.matrix[0][0].equals(new Complex(1/sqrt2, 0))).toBe(true);
      expect(h.matrix[0][1].equals(new Complex(1/sqrt2, 0))).toBe(true);
      expect(h.matrix[1][0].equals(new Complex(1/sqrt2, 0))).toBe(true);
      expect(h.matrix[1][1].equals(new Complex(-1/sqrt2, 0))).toBe(true);
    });

    test('should create S gate correctly', () => {
      const s = StandardGates.S(0);
      
      expect(s.name).toBe('S');
      expect(s.matrix[0][0].equals(Complex.one())).toBe(true);
      expect(s.matrix[0][1].equals(Complex.zero())).toBe(true);
      expect(s.matrix[1][0].equals(Complex.zero())).toBe(true);
      expect(s.matrix[1][1].equals(new Complex(0, 1))).toBe(true);
    });

    test('should create T gate correctly', () => {
      const t = StandardGates.T(0);
      const phase = Math.PI / 4;
      
      expect(t.name).toBe('T');
      expect(t.matrix[0][0].equals(Complex.one())).toBe(true);
      expect(t.matrix[0][1].equals(Complex.zero())).toBe(true);
      expect(t.matrix[1][0].equals(Complex.zero())).toBe(true);
      expect(t.matrix[1][1].equals(new Complex(Math.cos(phase), Math.sin(phase)))).toBe(true);
    });

    test('should create rotation gates with correct parameters', () => {
      const angle = Math.PI / 3;
      const rx = StandardGates.RX(0, angle);
      const ry = StandardGates.RY(0, angle);
      const rz = StandardGates.RZ(0, angle);
      
      expect(rx.name).toBe('RX');
      expect(rx.parameters).toEqual([angle]);
      expect(ry.name).toBe('RY');
      expect(ry.parameters).toEqual([angle]);
      expect(rz.name).toBe('RZ');
      expect(rz.parameters).toEqual([angle]);
    });

    test('should create CNOT gate correctly', () => {
      const cnot = StandardGates.CNOT(0, 1);
      
      expect(cnot.name).toBe('CNOT');
      expect(cnot.controlQubit).toBe(0);
      expect(cnot.targetQubit).toBe(1);
      
      // Check matrix (4x4 identity with swapped last two rows)
      const expectedMatrix = [
        [Complex.one(), Complex.zero(), Complex.zero(), Complex.zero()],
        [Complex.zero(), Complex.one(), Complex.zero(), Complex.zero()],
        [Complex.zero(), Complex.zero(), Complex.zero(), Complex.one()],
        [Complex.zero(), Complex.zero(), Complex.one(), Complex.zero()]
      ];
      
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          expect(cnot.matrix[i][j].equals(expectedMatrix[i][j])).toBe(true);
        }
      }
    });

    test('should create CZ gate correctly', () => {
      const cz = StandardGates.CZ(0, 1);
      
      expect(cz.name).toBe('CZ');
      expect(cz.controlQubit).toBe(0);
      expect(cz.targetQubit).toBe(1);
      
      // Check diagonal matrix with -1 in last position
      const expectedMatrix = [
        [Complex.one(), Complex.zero(), Complex.zero(), Complex.zero()],
        [Complex.zero(), Complex.one(), Complex.zero(), Complex.zero()],
        [Complex.zero(), Complex.zero(), Complex.one(), Complex.zero()],
        [Complex.zero(), Complex.zero(), Complex.zero(), new Complex(-1, 0)]
      ];
      
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          expect(cz.matrix[i][j].equals(expectedMatrix[i][j])).toBe(true);
        }
      }
    });
  });

  describe('Quantum Measurement', () => {
    test('should create quantum measurement correctly', () => {
      const measurement = new QuantumMeasurement(2, 1);
      
      expect(measurement.qubit).toBe(2);
      expect(measurement.classicalBit).toBe(1);
    });
  });

  describe('Gate Properties', () => {
    test('should handle rotation gate parameters correctly', () => {
      const angle = Math.PI / 2;
      const rx = StandardGates.RX(1, angle);
      
      expect(rx.parameters.length).toBe(1);
      expect(rx.parameters[0]).toBe(angle);
      expect(rx.qubits).toEqual([1]);
    });

    test('should verify unitarity of all standard gates', () => {
      const gates = [
        StandardGates.X(0),
        StandardGates.Y(0),
        StandardGates.Z(0),
        StandardGates.H(0),
        StandardGates.S(0),
        StandardGates.T(0),
        StandardGates.RX(0, Math.PI / 4),
        StandardGates.RY(0, Math.PI / 4),
        StandardGates.RZ(0, Math.PI / 4),
        StandardGates.CNOT(0, 1),
        StandardGates.CZ(0, 1)
      ];
      
      gates.forEach(gate => {
        expect(gate.isUnitary()).toBe(true);
      });
    });
  });
});