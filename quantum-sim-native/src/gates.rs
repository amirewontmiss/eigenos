use num_complex::Complex64;
use std::f64::consts::{PI, SQRT_2};

pub struct Gates;

impl Gates {
    pub fn identity() -> [Complex64; 4] {
        [
            Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0),
            Complex64::new(0.0, 0.0), Complex64::new(1.0, 0.0),
        ]
    }
    
    pub fn pauli_x() -> [Complex64; 4] {
        [
            Complex64::new(0.0, 0.0), Complex64::new(1.0, 0.0),
            Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0),
        ]
    }
    
    pub fn pauli_y() -> [Complex64; 4] {
        [
            Complex64::new(0.0, 0.0), Complex64::new(0.0, -1.0),
            Complex64::new(0.0, 1.0), Complex64::new(0.0, 0.0),
        ]
    }
    
    pub fn pauli_z() -> [Complex64; 4] {
        [
            Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0),
            Complex64::new(0.0, 0.0), Complex64::new(-1.0, 0.0),
        ]
    }
    
    pub fn hadamard() -> [Complex64; 4] {
        let inv_sqrt2 = 1.0 / SQRT_2;
        [
            Complex64::new(inv_sqrt2, 0.0), Complex64::new(inv_sqrt2, 0.0),
            Complex64::new(inv_sqrt2, 0.0), Complex64::new(-inv_sqrt2, 0.0),
        ]
    }
    
    pub fn phase(phi: f64) -> [Complex64; 4] {
        [
            Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0),
            Complex64::new(0.0, 0.0), Complex64::new(phi.cos(), phi.sin()),
        ]
    }
    
    pub fn s_gate() -> [Complex64; 4] {
        [
            Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0),
            Complex64::new(0.0, 0.0), Complex64::new(0.0, 1.0),
        ]
    }
    
    pub fn t_gate() -> [Complex64; 4] {
        let phase = Complex64::new((PI / 4.0).cos(), (PI / 4.0).sin());
        [
            Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0),
            Complex64::new(0.0, 0.0), phase,
        ]
    }
    
    pub fn rotation_x(theta: f64) -> [Complex64; 4] {
        let c = (theta / 2.0).cos();
        let s = (theta / 2.0).sin();
        [
            Complex64::new(c, 0.0), Complex64::new(0.0, -s),
            Complex64::new(0.0, -s), Complex64::new(c, 0.0),
        ]
    }
    
    pub fn rotation_y(theta: f64) -> [Complex64; 4] {
        let c = (theta / 2.0).cos();
        let s = (theta / 2.0).sin();
        [
            Complex64::new(c, 0.0), Complex64::new(-s, 0.0),
            Complex64::new(s, 0.0), Complex64::new(c, 0.0),
        ]
    }
    
    pub fn rotation_z(phi: f64) -> [Complex64; 4] {
        let half_phi = phi / 2.0;
        [
            Complex64::new(half_phi.cos(), -half_phi.sin()), Complex64::new(0.0, 0.0),
            Complex64::new(0.0, 0.0), Complex64::new(half_phi.cos(), half_phi.sin()),
        ]
    }
    
    pub fn cnot() -> [Complex64; 16] {
        let mut gate = [Complex64::new(0.0, 0.0); 16];
        // |00⟩ → |00⟩ (index 0 -> 0)
        gate[0] = Complex64::new(1.0, 0.0);
        // |01⟩ → |01⟩ (index 1 -> 1)  
        gate[5] = Complex64::new(1.0, 0.0);
        // |10⟩ → |11⟩ (index 2 -> 3)
        gate[14] = Complex64::new(1.0, 0.0);
        // |11⟩ → |10⟩ (index 3 -> 2)
        gate[11] = Complex64::new(1.0, 0.0);
        gate
    }
    
    pub fn cz() -> [Complex64; 16] {
        let mut gate = [Complex64::new(0.0, 0.0); 16];
        gate[0] = Complex64::new(1.0, 0.0);   // |00⟩ → |00⟩
        gate[5] = Complex64::new(1.0, 0.0);   // |01⟩ → |01⟩
        gate[10] = Complex64::new(1.0, 0.0);  // |10⟩ → |10⟩
        gate[15] = Complex64::new(-1.0, 0.0); // |11⟩ → -|11⟩
        gate
    }
    
    pub fn swap() -> [Complex64; 16] {
        let mut gate = [Complex64::new(0.0, 0.0); 16];
        gate[0] = Complex64::new(1.0, 0.0);   // |00⟩ → |00⟩
        gate[6] = Complex64::new(1.0, 0.0);   // |01⟩ → |10⟩
        gate[9] = Complex64::new(1.0, 0.0);   // |10⟩ → |01⟩
        gate[15] = Complex64::new(1.0, 0.0);  // |11⟩ → |11⟩
        gate
    }
    
    pub fn toffoli() -> [Complex64; 64] {
        let mut gate = [Complex64::new(0.0, 0.0); 64];
        // Identity for all states except |110⟩ and |111⟩
        for i in 0..6 {
            gate[i * 8 + i] = Complex64::new(1.0, 0.0);
        }
        // Flip |110⟩ ↔ |111⟩
        gate[6 * 8 + 7] = Complex64::new(1.0, 0.0); // |110⟩ → |111⟩
        gate[7 * 8 + 6] = Complex64::new(1.0, 0.0); // |111⟩ → |110⟩
        gate
    }
    
    pub fn controlled_phase(phi: f64) -> [Complex64; 16] {
        let mut gate = [Complex64::new(0.0, 0.0); 16];
        gate[0] = Complex64::new(1.0, 0.0);   // |00⟩ → |00⟩
        gate[5] = Complex64::new(1.0, 0.0);   // |01⟩ → |01⟩
        gate[10] = Complex64::new(1.0, 0.0);  // |10⟩ → |10⟩
        gate[15] = Complex64::new(phi.cos(), phi.sin()); // |11⟩ → e^(iφ)|11⟩
        gate
    }
    
    // Specialized gates for quantum algorithms
    pub fn qft_rotation(k: usize) -> [Complex64; 4] {
        let angle = 2.0 * PI / (1 << k) as f64;
        Self::rotation_z(angle)
    }
    
    pub fn u3(theta: f64, phi: f64, lambda: f64) -> [Complex64; 4] {
        let cos_half_theta = (theta / 2.0).cos();
        let sin_half_theta = (theta / 2.0).sin();
        let exp_i_phi = Complex64::new(phi.cos(), phi.sin());
        let exp_i_lambda = Complex64::new(lambda.cos(), lambda.sin());
        let exp_i_phi_plus_lambda = exp_i_phi * exp_i_lambda;
        
        [
            Complex64::new(cos_half_theta, 0.0),
            -exp_i_lambda * sin_half_theta,
            exp_i_phi * sin_half_theta,
            exp_i_phi_plus_lambda * cos_half_theta,
        ]
    }
    
    // Measurement operator (for future use)
    pub fn measurement_z(outcome: bool) -> [Complex64; 4] {
        if outcome {
            // Project to |1⟩
            [
                Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0),
                Complex64::new(0.0, 0.0), Complex64::new(1.0, 0.0),
            ]
        } else {
            // Project to |0⟩
            [
                Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0),
                Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0),
            ]
        }
    }
}