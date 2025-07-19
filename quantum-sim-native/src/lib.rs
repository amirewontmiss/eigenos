use neon::prelude::*;
use std::collections::HashMap;
use std::sync::{Mutex, LazyLock};

mod quantum_state;
mod gates;

use quantum_state::QuantumState;
use gates::Gates;

// Global storage for simulator instances
static SIMULATORS: LazyLock<Mutex<HashMap<u32, QuantumState>>> = LazyLock::new(|| Mutex::new(HashMap::new()));
static NEXT_ID: LazyLock<Mutex<u32>> = LazyLock::new(|| Mutex::new(0));

fn create_simulator(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let num_qubits = cx.argument::<JsNumber>(0)?.value(&mut cx) as usize;
    
    let simulator = QuantumState::new(num_qubits);
    let mut simulators = SIMULATORS.lock().unwrap();
    let mut next_id = NEXT_ID.lock().unwrap();
    
    let id = *next_id;
    *next_id += 1;
    simulators.insert(id, simulator);
    
    Ok(cx.number(id as f64))
}

fn apply_gate(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let sim_id = cx.argument::<JsNumber>(0)?.value(&mut cx) as u32;
    let gate_name = cx.argument::<JsString>(1)?.value(&mut cx);
    let qubits_js = cx.argument::<JsArray>(2)?;
    let params_js = cx.argument::<JsArray>(3)?;
    
    // Extract qubit indices
    let mut qubits = Vec::new();
    let length = qubits_js.len(&mut cx);
    for i in 0..length {
        let qubit: Handle<JsNumber> = qubits_js.get(&mut cx, i)?;
        qubits.push(qubit.value(&mut cx) as usize);
    }
    
    // Extract parameters
    let mut params = Vec::new();
    let param_length = params_js.len(&mut cx);
    for i in 0..param_length {
        let param: Handle<JsNumber> = params_js.get(&mut cx, i)?;
        params.push(param.value(&mut cx));
    }
    
    let mut simulators = SIMULATORS.lock().unwrap();
    if let Some(simulator) = simulators.get_mut(&sim_id) {
        match gate_name.as_str() {
            "H" => {
                let gate = Gates::hadamard();
                simulator.apply_single_qubit_gate(&gate, qubits[0]);
            },
            "X" => {
                let gate = Gates::pauli_x();
                simulator.apply_single_qubit_gate(&gate, qubits[0]);
            },
            "Y" => {
                let gate = Gates::pauli_y();
                simulator.apply_single_qubit_gate(&gate, qubits[0]);
            },
            "Z" => {
                let gate = Gates::pauli_z();
                simulator.apply_single_qubit_gate(&gate, qubits[0]);
            },
            "S" => {
                let gate = Gates::s_gate();
                simulator.apply_single_qubit_gate(&gate, qubits[0]);
            },
            "T" => {
                let gate = Gates::t_gate();
                simulator.apply_single_qubit_gate(&gate, qubits[0]);
            },
            "RX" => {
                let gate = Gates::rotation_x(params[0]);
                simulator.apply_single_qubit_gate(&gate, qubits[0]);
            },
            "RY" => {
                let gate = Gates::rotation_y(params[0]);
                simulator.apply_single_qubit_gate(&gate, qubits[0]);
            },
            "RZ" => {
                let gate = Gates::rotation_z(params[0]);
                simulator.apply_single_qubit_gate(&gate, qubits[0]);
            },
            "CNOT" | "CX" => {
                let gate = Gates::cnot();
                simulator.apply_two_qubit_gate(&gate, qubits[0], qubits[1]);
            },
            "CZ" => {
                let gate = Gates::cz();
                simulator.apply_two_qubit_gate(&gate, qubits[0], qubits[1]);
            },
            "SWAP" => {
                let gate = Gates::swap();
                simulator.apply_two_qubit_gate(&gate, qubits[0], qubits[1]);
            },
            _ => return Ok(cx.boolean(false)),
        }
        Ok(cx.boolean(true))
    } else {
        Ok(cx.boolean(false))
    }
}

fn measure_qubits(mut cx: FunctionContext) -> JsResult<JsObject> {
    let sim_id = cx.argument::<JsNumber>(0)?.value(&mut cx) as u32;
    let shots = cx.argument::<JsNumber>(1)?.value(&mut cx) as usize;
    
    let simulators = SIMULATORS.lock().unwrap();
    if let Some(simulator) = simulators.get(&sim_id) {
        let results = simulator.measure(shots);
        
        let js_results = cx.empty_object();
        for (bitstring, count) in results {
            let js_key = cx.string(bitstring);
            let js_value = cx.number(count as f64);
            js_results.set(&mut cx, js_key, js_value)?;
        }
        
        Ok(js_results)
    } else {
        Ok(cx.empty_object())
    }
}

fn get_state_probabilities(mut cx: FunctionContext) -> JsResult<JsArray> {
    let sim_id = cx.argument::<JsNumber>(0)?.value(&mut cx) as u32;
    
    let simulators = SIMULATORS.lock().unwrap();
    if let Some(simulator) = simulators.get(&sim_id) {
        let probabilities = simulator.get_probabilities();
        
        let js_array = cx.empty_array();
        for (i, prob) in probabilities.iter().enumerate() {
            let js_value = cx.number(*prob);
            js_array.set(&mut cx, i as u32, js_value)?;
        }
        
        Ok(js_array)
    } else {
        Ok(cx.empty_array())
    }
}

fn get_fidelity(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let sim_id1 = cx.argument::<JsNumber>(0)?.value(&mut cx) as u32;
    let sim_id2 = cx.argument::<JsNumber>(1)?.value(&mut cx) as u32;
    
    let simulators = SIMULATORS.lock().unwrap();
    if let (Some(sim1), Some(sim2)) = (simulators.get(&sim_id1), simulators.get(&sim_id2)) {
        let fidelity = sim1.get_fidelity(sim2);
        Ok(cx.number(fidelity))
    } else {
        Ok(cx.number(0.0))
    }
}

fn destroy_simulator(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let sim_id = cx.argument::<JsNumber>(0)?.value(&mut cx) as u32;
    
    let mut simulators = SIMULATORS.lock().unwrap();
    let removed = simulators.remove(&sim_id).is_some();
    
    Ok(cx.boolean(removed))
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("createSimulator", create_simulator)?;
    cx.export_function("applyGate", apply_gate)?;
    cx.export_function("measureQubits", measure_qubits)?;
    cx.export_function("getStateProbabilities", get_state_probabilities)?;
    cx.export_function("getFidelity", get_fidelity)?;
    cx.export_function("destroySimulator", destroy_simulator)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_simulator_creation() {
        let sim = QuantumState::new(2);
        assert_eq!(sim.num_qubits, 2);
        assert_eq!(sim.amplitudes.len(), 4);
    }
    
    #[test]
    fn test_hadamard_gate() {
        let mut sim = QuantumState::new(1);
        let h_gate = Gates::hadamard();
        sim.apply_single_qubit_gate(&h_gate, 0);
        
        let probs = sim.get_probabilities();
        assert!((probs[0] - 0.5).abs() < 1e-10);
        assert!((probs[1] - 0.5).abs() < 1e-10);
    }
    
    #[test]
    fn test_cnot_bell_state() {
        let mut sim = QuantumState::new(2);
        let h_gate = Gates::hadamard();
        let cnot_gate = Gates::cnot();
        
        sim.apply_single_qubit_gate(&h_gate, 0);
        sim.apply_two_qubit_gate(&cnot_gate, 0, 1);
        
        let probs = sim.get_probabilities();
        // Should create bell state: |00⟩ + |11⟩
        assert!((probs[0] - 0.5).abs() < 1e-10); // |00⟩
        assert!(probs[1] < 1e-10); // |01⟩ should be ~0
        assert!(probs[2] < 1e-10); // |10⟩ should be ~0
        assert!((probs[3] - 0.5).abs() < 1e-10); // |11⟩
    }
}