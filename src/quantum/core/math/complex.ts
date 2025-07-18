export class Complex {
  constructor(
    public readonly real: number,
    public readonly imaginary: number = 0
  ) {}

  static fromReal(real: number): Complex {
    return new Complex(real, 0);
  }

  static fromImaginary(imaginary: number): Complex {
    return new Complex(0, imaginary);
  }

  static zero(): Complex {
    return new Complex(0, 0);
  }

  static one(): Complex {
    return new Complex(1, 0);
  }

  static i(): Complex {
    return new Complex(0, 1);
  }

  add(other: Complex): Complex {
    return new Complex(
      this.real + other.real,
      this.imaginary + other.imaginary
    );
  }

  subtract(other: Complex): Complex {
    return new Complex(
      this.real - other.real,
      this.imaginary - other.imaginary
    );
  }

  multiply(other: Complex): Complex {
    return new Complex(
      this.real * other.real - this.imaginary * other.imaginary,
      this.real * other.imaginary + this.imaginary * other.real
    );
  }

  divide(other: Complex): Complex {
    const denominator = other.real * other.real + other.imaginary * other.imaginary;
    if (denominator === 0) {
      throw new Error('Division by zero');
    }
    
    return new Complex(
      (this.real * other.real + this.imaginary * other.imaginary) / denominator,
      (this.imaginary * other.real - this.real * other.imaginary) / denominator
    );
  }

  conjugate(): Complex {
    return new Complex(this.real, -this.imaginary);
  }

  magnitude(): number {
    return Math.sqrt(this.real * this.real + this.imaginary * this.imaginary);
  }

  phase(): number {
    return Math.atan2(this.imaginary, this.real);
  }

  equals(other: Complex, tolerance: number = 1e-10): boolean {
    return Math.abs(this.real - other.real) < tolerance &&
           Math.abs(this.imaginary - other.imaginary) < tolerance;
  }

  toString(): string {
    if (this.imaginary === 0) return this.real.toString();
    if (this.real === 0) return `${this.imaginary}i`;
    const sign = this.imaginary >= 0 ? '+' : '-';
    return `${this.real}${sign}${Math.abs(this.imaginary)}i`;
  }

  static exp(z: Complex): Complex {
    const expReal = Math.exp(z.real);
    return new Complex(
      expReal * Math.cos(z.imaginary),
      expReal * Math.sin(z.imaginary)
    );
  }

  static sqrt(z: Complex): Complex {
    const magnitude = z.magnitude();
    const phase = z.phase();
    const newMagnitude = Math.sqrt(magnitude);
    const newPhase = phase / 2;
    
    return new Complex(
      newMagnitude * Math.cos(newPhase),
      newMagnitude * Math.sin(newPhase)
    );
  }
}