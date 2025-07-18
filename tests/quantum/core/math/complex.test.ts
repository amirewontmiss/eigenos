import { Complex } from '../../../../src/quantum/core/math/complex';

describe('Complex Number Operations', () => {
  describe('Construction', () => {
    test('should create complex number with real and imaginary parts', () => {
      const c = new Complex(3, 4);
      expect(c.real).toBe(3);
      expect(c.imaginary).toBe(4);
    });

    test('should create complex number with only real part', () => {
      const c = new Complex(5);
      expect(c.real).toBe(5);
      expect(c.imaginary).toBe(0);
    });

    test('should create complex number from static methods', () => {
      const real = Complex.fromReal(3);
      const imaginary = Complex.fromImaginary(4);
      const zero = Complex.zero();
      const one = Complex.one();
      const i = Complex.i();

      expect(real).toEqual(new Complex(3, 0));
      expect(imaginary).toEqual(new Complex(0, 4));
      expect(zero).toEqual(new Complex(0, 0));
      expect(one).toEqual(new Complex(1, 0));
      expect(i).toEqual(new Complex(0, 1));
    });
  });

  describe('Basic Operations', () => {
    test('should add complex numbers correctly', () => {
      const a = new Complex(1, 2);
      const b = new Complex(3, 4);
      const result = a.add(b);
      
      expect(result.real).toBe(4);
      expect(result.imaginary).toBe(6);
    });

    test('should subtract complex numbers correctly', () => {
      const a = new Complex(5, 7);
      const b = new Complex(2, 3);
      const result = a.subtract(b);
      
      expect(result.real).toBe(3);
      expect(result.imaginary).toBe(4);
    });

    test('should multiply complex numbers correctly', () => {
      const a = new Complex(1, 2);
      const b = new Complex(3, 4);
      const result = a.multiply(b);
      
      // (1 + 2i)(3 + 4i) = 3 + 4i + 6i + 8i² = 3 + 10i - 8 = -5 + 10i
      expect(result.real).toBe(-5);
      expect(result.imaginary).toBe(10);
    });

    test('should divide complex numbers correctly', () => {
      const a = new Complex(1, 2);
      const b = new Complex(1, 1);
      const result = a.divide(b);
      
      // (1 + 2i) / (1 + i) = (1 + 2i)(1 - i) / (1 + i)(1 - i) = (1 + 2i - i - 2i²) / (1 - i²) = (3 + i) / 2 = 1.5 + 0.5i
      expect(result.real).toBe(1.5);
      expect(result.imaginary).toBe(0.5);
    });

    test('should throw error when dividing by zero', () => {
      const a = new Complex(1, 2);
      const zero = new Complex(0, 0);
      
      expect(() => a.divide(zero)).toThrow('Division by zero');
    });
  });

  describe('Properties', () => {
    test('should calculate conjugate correctly', () => {
      const c = new Complex(3, 4);
      const conjugate = c.conjugate();
      
      expect(conjugate.real).toBe(3);
      expect(conjugate.imaginary).toBe(-4);
    });

    test('should calculate magnitude correctly', () => {
      const c = new Complex(3, 4);
      const magnitude = c.magnitude();
      
      expect(magnitude).toBe(5); // sqrt(3² + 4²) = sqrt(25) = 5
    });

    test('should calculate phase correctly', () => {
      const c = new Complex(1, 1);
      const phase = c.phase();
      
      expect(phase).toBeCloseTo(Math.PI / 4, 5); // atan2(1, 1) = π/4
    });

    test('should handle zero magnitude phase', () => {
      const zero = new Complex(0, 0);
      const phase = zero.phase();
      
      expect(phase).toBe(0);
    });
  });

  describe('Comparison', () => {
    test('should compare equal complex numbers', () => {
      const a = new Complex(1, 2);
      const b = new Complex(1, 2);
      
      expect(a.equals(b)).toBe(true);
    });

    test('should compare unequal complex numbers', () => {
      const a = new Complex(1, 2);
      const b = new Complex(2, 1);
      
      expect(a.equals(b)).toBe(false);
    });

    test('should use tolerance in comparison', () => {
      const a = new Complex(1.0000001, 2.0000001);
      const b = new Complex(1, 2);
      
      expect(a.equals(b, 1e-6)).toBe(true);
      expect(a.equals(b, 1e-8)).toBe(false);
    });
  });

  describe('String Representation', () => {
    test('should format real numbers correctly', () => {
      const c = new Complex(5, 0);
      expect(c.toString()).toBe('5');
    });

    test('should format pure imaginary numbers correctly', () => {
      const c = new Complex(0, 3);
      expect(c.toString()).toBe('3i');
    });

    test('should format complex numbers with positive imaginary part', () => {
      const c = new Complex(2, 3);
      expect(c.toString()).toBe('2+3i');
    });

    test('should format complex numbers with negative imaginary part', () => {
      const c = new Complex(2, -3);
      expect(c.toString()).toBe('2-3i');
    });
  });

  describe('Advanced Functions', () => {
    test('should calculate exponential correctly', () => {
      const c = new Complex(0, Math.PI);
      const result = Complex.exp(c);
      
      // e^(iπ) = -1 + 0i (Euler's formula)
      expect(result.real).toBeCloseTo(-1, 10);
      expect(result.imaginary).toBeCloseTo(0, 10);
    });

    test('should calculate square root correctly', () => {
      const c = new Complex(3, 4);
      const result = Complex.sqrt(c);
      const squared = result.multiply(result);
      
      // Verify that sqrt(c)² = c
      expect(squared.real).toBeCloseTo(c.real, 10);
      expect(squared.imaginary).toBeCloseTo(c.imaginary, 10);
    });

    test('should calculate square root of negative real number', () => {
      const c = new Complex(-4, 0);
      const result = Complex.sqrt(c);
      
      // sqrt(-4) = 2i
      expect(result.real).toBeCloseTo(0, 10);
      expect(result.imaginary).toBeCloseTo(2, 10);
    });
  });
});