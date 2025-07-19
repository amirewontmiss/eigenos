use nalgebra::DVector;
use num_complex::Complex64;
use std::collections::HashMap;
use rayon::prelude::*;

pub struct QuantumState {
    pub amplitudes: DVector<Complex64>,
    pub num_qubits: usize,
}

impl QuantumState {
    pub fn new(num_qubits: usize) -> Self {
        let size = 1 << num_qubits;
        let mut amplitudes = DVector::zeros(size);
        amplitudes[0] = Complex64::new(1.0, 0.0); // |00...0⟩ state
        
        Self {
            amplitudes,
            num_qubits,
        }
    }
    
    pub fn apply_single_qubit_gate(&mut self, gate: &[Complex64; 4], qubit: usize) {
        let n = self.num_qubits;
        let size = 1 << n;
        let target_bit = 1 << qubit;
        
        let mut new_amplitudes = self.amplitudes.clone();
        
        for i in 0..size {
            if i & target_bit == 0 {
                let i0 = i;
                let i1 = i | target_bit;
                
                let amp0 = self.amplitudes[i0];
                let amp1 = self.amplitudes[i1];
                
                new_amplitudes[i0] = gate[0] * amp0 + gate[1] * amp1;
                new_amplitudes[i1] = gate[2] * amp0 + gate[3] * amp1;
            }
        }
        
        self.amplitudes = new_amplitudes;
    }
    
    pub fn apply_two_qubit_gate(&mut self, gate: &[Complex64; 16], control: usize, target: usize) {
        let n = self.num_qubits;
        let size = 1 << n;
        let control_bit = 1 << control;
        let target_bit = 1 << target;
        
        let mut new_amplitudes = self.amplitudes.clone();
        
        for i in 0..size {
            if (i & control_bit == 0) && (i & target_bit == 0) {
                let i00 = i;
                let i01 = i ^ target_bit;
                let i10 = i ^ control_bit;
                let i11 = i ^ control_bit ^ target_bit;
                
                let amp00 = self.amplitudes[i00];
                let amp01 = self.amplitudes[i01];
                let amp10 = self.amplitudes[i10];
                let amp11 = self.amplitudes[i11];
                
                new_amplitudes[i00] = gate[0] * amp00 + gate[1] * amp01 + gate[2] * amp10 + gate[3] * amp11;
                new_amplitudes[i01] = gate[4] * amp00 + gate[5] * amp01 + gate[6] * amp10 + gate[7] * amp11;
                new_amplitudes[i10] = gate[8] * amp00 + gate[9] * amp01 + gate[10] * amp10 + gate[11] * amp11;
                new_amplitudes[i11] = gate[12] * amp00 + gate[13] * amp01 + gate[14] * amp10 + gate[15] * amp11;
            }
        }
        
        self.amplitudes = new_amplitudes;
    }
    
    pub fn measure(&self, shots: usize) -> HashMap<String, usize> {
        use rand::Rng;
        
        let mut results = HashMap::new();
        let mut rng = rand::thread_rng();
        
        // Calculate probabilities
        let probabilities: Vec<f64> = self.amplitudes
            .iter()
            .map(|amp| amp.norm_sqr())
            .collect();
        
        // Cumulative distribution for sampling
        let mut cumulative = Vec::with_capacity(probabilities.len());
        let mut sum = 0.0;
        for prob in probabilities {
            sum += prob;
            cumulative.push(sum);
        }
        
        // Measurement sampling
        for _ in 0..shots {
            let random: f64 = rng.gen();
            let state = cumulative.iter().position(|&x| x > random).unwrap_or(0);
            let bitstring = format!("{:0width$b}", state, width = self.num_qubits);
            *results.entry(bitstring).or_insert(0) += 1;
        }
        
        results
    }
    
    pub fn get_probabilities(&self) -> Vec<f64> {
        self.amplitudes
            .iter()
            .map(|amp| amp.norm_sqr())
            .collect()
    }
    
    pub fn get_fidelity(&self, target_state: &QuantumState) -> f64 {
        if self.num_qubits != target_state.num_qubits {
            return 0.0;
        }
        
        let fidelity = self.amplitudes
            .iter()
            .zip(target_state.amplitudes.iter())
            .map(|(a, b)| a.conj() * b)
            .sum::<Complex64>()
            .norm_sqr();
        
        fidelity
    }
    
    pub fn normalize(&mut self) {
        let norm = self.amplitudes.norm();
        if norm > 0.0 {
            self.amplitudes /= Complex64::new(norm, 0.0);
        }
    }
}