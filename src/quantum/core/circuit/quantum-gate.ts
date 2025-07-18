import { Complex } from '../math/complex';

export abstract class QuantumGate {
  abstract readonly name: string;
  abstract readonly qubits: readonly number[];
  abstract readonly parameters: readonly number[];
  abstract readonly matrix: Complex[][];
  
  abstract inverse(): QuantumGate;
  abstract decompose(): QuantumGate[];
  abstract isUnitary(): boolean;
  abstract commutes(other: QuantumGate): boolean;

  protected validateMatrix(matrix: Complex[][]): boolean {
    // Check if matrix is square
    if (matrix.length !== matrix[0].length) return false;
    
    // Check if matrix size is a power of 2
    const size = matrix.length;
    if ((size & (size - 1)) !== 0) return false;
    
    return true;
  }

  protected isMatrixUnitary(matrix: Complex[][]): boolean {
    const n = matrix.length;
    const identity = this.createIdentityMatrix(n);
    const conjugateTranspose = this.conjugateTranspose(matrix);
    const product = this.multiplyMatrices(matrix, conjugateTranspose);
    
    return this.matricesEqual(product, identity);
  }

  protected createIdentityMatrix(size: number): Complex[][] {
    const matrix: Complex[][] = [];
    for (let i = 0; i < size; i++) {
      matrix[i] = [];
      for (let j = 0; j < size; j++) {
        matrix[i][j] = i === j ? Complex.one() : Complex.zero();
      }
    }
    return matrix;
  }

  protected conjugateTranspose(matrix: Complex[][]): Complex[][] {
    return matrix[0].map((_, colIndex) => 
      matrix.map(row => row[colIndex].conjugate())
    );
  }

  protected multiplyMatrices(a: Complex[][], b: Complex[][]): Complex[][] {
    const result: Complex[][] = [];
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < b[0].length; j++) {
        let sum = Complex.zero();
        for (let k = 0; k < a[0].length; k++) {
          sum = sum.add(a[i][k].multiply(b[k][j]));
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  protected matricesEqual(a: Complex[][], b: Complex[][], tolerance: number = 1e-10): boolean {
    if (a.length !== b.length || a[0].length !== b[0].length) return false;
    
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a[0].length; j++) {
        if (!a[i][j].equals(b[i][j], tolerance)) return false;
      }
    }
    return true;
  }
}

export class SingleQubitGate extends QuantumGate {
  constructor(
    public readonly name: string,
    public readonly qubit: number,
    public readonly parameters: readonly number[] = [],
    private readonly _matrix: Complex[][]
  ) {
    super();
    if (!this.validateMatrix(_matrix) || _matrix.length !== 2) {
      throw new Error('Single qubit gate must have a 2x2 matrix');
    }
  }

  get qubits(): readonly number[] { return [this.qubit]; }
  get matrix(): Complex[][] { return this._matrix; }

  inverse(): QuantumGate {
    return new SingleQubitGate(
      `${this.name}_inv`,
      this.qubit,
      this.parameters.map(p => -p),
      this.conjugateTranspose(this._matrix)
    );
  }

  decompose(): QuantumGate[] {
    return [this];
  }

  isUnitary(): boolean {
    return this.isMatrixUnitary(this._matrix);
  }

  commutes(other: QuantumGate): boolean {
    if (other.qubits.includes(this.qubit)) {
      if (other instanceof SingleQubitGate) {
        const product1 = this.multiplyMatrices(this._matrix, other.matrix);
        const product2 = this.multiplyMatrices(other.matrix, this._matrix);
        return this.matricesEqual(product1, product2);
      }
      return false;
    }
    return true;
  }
}

export class TwoQubitGate extends QuantumGate {
  constructor(
    public readonly name: string,
    public readonly controlQubit: number,
    public readonly targetQubit: number,
    public readonly parameters: readonly number[] = [],
    private readonly _matrix: Complex[][]
  ) {
    super();
    if (!this.validateMatrix(_matrix) || _matrix.length !== 4) {
      throw new Error('Two qubit gate must have a 4x4 matrix');
    }
  }

  get qubits(): readonly number[] { return [this.controlQubit, this.targetQubit]; }
  get matrix(): Complex[][] { return this._matrix; }

  inverse(): QuantumGate {
    return new TwoQubitGate(
      `${this.name}_inv`,
      this.controlQubit,
      this.targetQubit,
      this.parameters.map(p => -p),
      this.conjugateTranspose(this._matrix)
    );
  }

  decompose(): QuantumGate[] {
    return [this];
  }

  isUnitary(): boolean {
    return this.isMatrixUnitary(this._matrix);
  }

  commutes(other: QuantumGate): boolean {
    const thisQubits = new Set(this.qubits);
    const otherQubits = new Set(other.qubits);
    const intersection = new Set([...thisQubits].filter(x => otherQubits.has(x)));
    
    if (intersection.size === 0) return true;
    if (intersection.size === 2 && other instanceof TwoQubitGate) {
      const product1 = this.multiplyMatrices(this._matrix, other.matrix);
      const product2 = this.multiplyMatrices(other.matrix, this._matrix);
      return this.matricesEqual(product1, product2);
    }
    return false;
  }
}

export class QuantumMeasurement {
  constructor(
    public readonly qubit: number,
    public readonly classicalBit: number
  ) {}
}

// Standard gate definitions
export class StandardGates {
  static X(qubit: number): SingleQubitGate {
    const matrix = [
      [Complex.zero(), Complex.one()],
      [Complex.one(), Complex.zero()]
    ];
    return new SingleQubitGate('X', qubit, [], matrix);
  }

  static Y(qubit: number): SingleQubitGate {
    const matrix = [
      [Complex.zero(), new Complex(0, -1)],
      [new Complex(0, 1), Complex.zero()]
    ];
    return new SingleQubitGate('Y', qubit, [], matrix);
  }

  static Z(qubit: number): SingleQubitGate {
    const matrix = [
      [Complex.one(), Complex.zero()],
      [Complex.zero(), new Complex(-1, 0)]
    ];
    return new SingleQubitGate('Z', qubit, [], matrix);
  }

  static H(qubit: number): SingleQubitGate {
    const sqrt2 = Math.sqrt(2);
    const matrix = [
      [new Complex(1/sqrt2, 0), new Complex(1/sqrt2, 0)],
      [new Complex(1/sqrt2, 0), new Complex(-1/sqrt2, 0)]
    ];
    return new SingleQubitGate('H', qubit, [], matrix);
  }

  static S(qubit: number): SingleQubitGate {
    const matrix = [
      [Complex.one(), Complex.zero()],
      [Complex.zero(), new Complex(0, 1)]
    ];
    return new SingleQubitGate('S', qubit, [], matrix);
  }

  static T(qubit: number): SingleQubitGate {
    const phase = Math.PI / 4;
    const matrix = [
      [Complex.one(), Complex.zero()],
      [Complex.zero(), new Complex(Math.cos(phase), Math.sin(phase))]
    ];
    return new SingleQubitGate('T', qubit, [], matrix);
  }

  static RX(qubit: number, angle: number): SingleQubitGate {
    const cos = Math.cos(angle / 2);
    const sin = Math.sin(angle / 2);
    const matrix = [
      [new Complex(cos, 0), new Complex(0, -sin)],
      [new Complex(0, -sin), new Complex(cos, 0)]
    ];
    return new SingleQubitGate('RX', qubit, [angle], matrix);
  }

  static RY(qubit: number, angle: number): SingleQubitGate {
    const cos = Math.cos(angle / 2);
    const sin = Math.sin(angle / 2);
    const matrix = [
      [new Complex(cos, 0), new Complex(-sin, 0)],
      [new Complex(sin, 0), new Complex(cos, 0)]
    ];
    return new SingleQubitGate('RY', qubit, [angle], matrix);
  }

  static RZ(qubit: number, angle: number): SingleQubitGate {
    const phase = angle / 2;
    const matrix = [
      [new Complex(Math.cos(-phase), Math.sin(-phase)), Complex.zero()],
      [Complex.zero(), new Complex(Math.cos(phase), Math.sin(phase))]
    ];
    return new SingleQubitGate('RZ', qubit, [angle], matrix);
  }

  static CNOT(controlQubit: number, targetQubit: number): TwoQubitGate {
    const matrix = [
      [Complex.one(), Complex.zero(), Complex.zero(), Complex.zero()],
      [Complex.zero(), Complex.one(), Complex.zero(), Complex.zero()],
      [Complex.zero(), Complex.zero(), Complex.zero(), Complex.one()],
      [Complex.zero(), Complex.zero(), Complex.one(), Complex.zero()]
    ];
    return new TwoQubitGate('CNOT', controlQubit, targetQubit, [], matrix);
  }

  static CZ(controlQubit: number, targetQubit: number): TwoQubitGate {
    const matrix = [
      [Complex.one(), Complex.zero(), Complex.zero(), Complex.zero()],
      [Complex.zero(), Complex.one(), Complex.zero(), Complex.zero()],
      [Complex.zero(), Complex.zero(), Complex.one(), Complex.zero()],
      [Complex.zero(), Complex.zero(), Complex.zero(), new Complex(-1, 0)]
    ];
    return new TwoQubitGate('CZ', controlQubit, targetQubit, [], matrix);
  }
}