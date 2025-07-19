import React, { useState, useMemo } from 'react';
import { BlochSphere } from './BlochSphere';
import { StateHistogram } from './StateHistogram';
import { StateVectorVisualizer, ComplexAmplitude } from './StateVectorVisualizer';
import { QuantumSurface } from '../../design-system/primitives/QuantumSurface';
import { QuantumButton } from '../../design-system/primitives/QuantumButton';

export interface QuantumState {
  amplitudes: ComplexAmplitude[];
  qubits: number;
  measurements?: Record<string, number>;
  fidelity?: number;
  entanglement?: number;
}

export interface StateVisualizationDashboardProps {
  state: QuantumState;
  interactive?: boolean;
  showBlochSphere?: boolean;
  showHistogram?: boolean;
  showStateVector?: boolean;
  showStatistics?: boolean;
  onStateChange?: (state: QuantumState) => void;
}

// Generate example quantum states for demonstration
const generateExampleStates = (): Record<string, QuantumState> => ({
  'ground': {
    amplitudes: [
      { real: 1, imaginary: 0, magnitude: 1, phase: 0 },
      { real: 0, imaginary: 0, magnitude: 0, phase: 0 }
    ],
    qubits: 1,
    measurements: { '0': 1000, '1': 0 }
  },
  'excited': {
    amplitudes: [
      { real: 0, imaginary: 0, magnitude: 0, phase: 0 },
      { real: 1, imaginary: 0, magnitude: 1, phase: 0 }
    ],
    qubits: 1,
    measurements: { '0': 0, '1': 1000 }
  },
  'superposition': {
    amplitudes: [
      { real: 1/Math.sqrt(2), imaginary: 0, magnitude: 1/Math.sqrt(2), phase: 0 },
      { real: 1/Math.sqrt(2), imaginary: 0, magnitude: 1/Math.sqrt(2), phase: 0 }
    ],
    qubits: 1,
    measurements: { '0': 512, '1': 488 }
  },
  'bell': {
    amplitudes: [
      { real: 1/Math.sqrt(2), imaginary: 0, magnitude: 1/Math.sqrt(2), phase: 0 },
      { real: 0, imaginary: 0, magnitude: 0, phase: 0 },
      { real: 0, imaginary: 0, magnitude: 0, phase: 0 },
      { real: 1/Math.sqrt(2), imaginary: 0, magnitude: 1/Math.sqrt(2), phase: 0 }
    ],
    qubits: 2,
    measurements: { '00': 487, '01': 0, '10': 0, '11': 513 },
    entanglement: 1.0
  },
  'ghz': {
    amplitudes: [
      { real: 1/Math.sqrt(2), imaginary: 0, magnitude: 1/Math.sqrt(2), phase: 0 },
      { real: 0, imaginary: 0, magnitude: 0, phase: 0 },
      { real: 0, imaginary: 0, magnitude: 0, phase: 0 },
      { real: 0, imaginary: 0, magnitude: 0, phase: 0 },
      { real: 0, imaginary: 0, magnitude: 0, phase: 0 },
      { real: 0, imaginary: 0, magnitude: 0, phase: 0 },
      { real: 0, imaginary: 0, magnitude: 0, phase: 0 },
      { real: 1/Math.sqrt(2), imaginary: 0, magnitude: 1/Math.sqrt(2), phase: 0 }
    ],
    qubits: 3,
    measurements: { '000': 498, '001': 0, '010': 0, '011': 0, '100': 0, '101': 0, '110': 0, '111': 502 },
    entanglement: 1.5
  }
});

export const StateVisualizationDashboard: React.FC<StateVisualizationDashboardProps> = ({
  state: propState,
  interactive = true,
  showBlochSphere = true,
  showHistogram = true,
  showStateVector = true,
  showStatistics = true,
  onStateChange
}) => {
  const exampleStates = useMemo(() => generateExampleStates(), []);
  const [currentState, setCurrentState] = useState<QuantumState>(propState || exampleStates.superposition);
  const [selectedExample, setSelectedExample] = useState<string>('superposition');
  const [vectorRepresentation, setVectorRepresentation] = useState<'bar' | 'circle' | 'complex-plane'>('bar');

  // Calculate quantum state statistics
  const statistics = useMemo(() => {
    const totalAmplitude = currentState.amplitudes.reduce((sum, amp) => sum + amp.magnitude * amp.magnitude, 0);
    const entropy = -currentState.amplitudes.reduce((sum, amp) => {
      const prob = amp.magnitude * amp.magnitude;
      return prob > 0 ? sum + prob * Math.log2(prob) : sum;
    }, 0);
    
    const purity = currentState.amplitudes.reduce((sum, amp) => {
      const prob = amp.magnitude * amp.magnitude;
      return sum + prob * prob;
    }, 0);

    const participation = 1 / purity;
    const mixedness = 1 - purity;

    return {
      normalization: totalAmplitude,
      entropy,
      purity,
      participation,
      mixedness,
      fidelity: currentState.fidelity || 0.95 + Math.random() * 0.05,
      entanglement: currentState.entanglement || 0
    };
  }, [currentState]);

  // Convert to single qubit state for Bloch sphere (only if single qubit)
  const blochState = useMemo(() => {
    if (currentState.qubits !== 1) return null;
    
    return {
      alpha: currentState.amplitudes[0]?.magnitude || 0,
      beta: currentState.amplitudes[1]?.magnitude || 0,
      phase: currentState.amplitudes[1]?.phase || 0
    };
  }, [currentState]);

  const handleExampleSelect = (exampleKey: string) => {
    const newState = exampleStates[exampleKey];
    setCurrentState(newState);
    setSelectedExample(exampleKey);
    onStateChange?.(newState);
  };

  const handleRandomState = () => {
    const numStates = 2 ** currentState.qubits;
    const newAmplitudes: ComplexAmplitude[] = [];
    
    // Generate random amplitudes
    let normalization = 0;
    for (let i = 0; i < numStates; i++) {
      const real = (Math.random() - 0.5) * 2;
      const imaginary = (Math.random() - 0.5) * 2;
      const magnitude = Math.sqrt(real * real + imaginary * imaginary);
      const phase = Math.atan2(imaginary, real);
      
      newAmplitudes.push({ real, imaginary, magnitude, phase });
      normalization += magnitude * magnitude;
    }
    
    // Normalize
    const norm = Math.sqrt(normalization);
    newAmplitudes.forEach(amp => {
      amp.real /= norm;
      amp.imaginary /= norm;
      amp.magnitude /= norm;
    });

    const newState: QuantumState = {
      amplitudes: newAmplitudes,
      qubits: currentState.qubits,
      measurements: generateRandomMeasurements(newAmplitudes, currentState.qubits)
    };

    setCurrentState(newState);
    setSelectedExample('');
    onStateChange?.(newState);
  };

  return (
    <div className="state-visualization-dashboard" style={{ padding: '16px', maxHeight: '100vh', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '24px' }}>
            Quantum State Visualization
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Interactive visualization of quantum states and measurement outcomes
          </p>
        </div>
      </div>

      {/* Controls */}
      <QuantumSurface variant="elevated" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '16px', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Example States
            </label>
            <select
              value={selectedExample}
              onChange={(e) => handleExampleSelect(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                background: 'var(--surface-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            >
              <option value="">Custom State</option>
              <option value="ground">Ground State |0⟩</option>
              <option value="excited">Excited State |1⟩</option>
              <option value="superposition">Superposition (|0⟩ + |1⟩)/√2</option>
              <option value="bell">Bell State (|00⟩ + |11⟩)/√2</option>
              <option value="ghz">GHZ State (|000⟩ + |111⟩)/√2</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Vector Representation
            </label>
            <select
              value={vectorRepresentation}
              onChange={(e) => setVectorRepresentation(e.target.value as any)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                background: 'var(--surface-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            >
              <option value="bar">Bar Chart</option>
              <option value="complex-plane">Complex Plane</option>
              <option value="circle">Circle Plot</option>
            </select>
          </div>

          <QuantumButton variant="secondary" onClick={handleRandomState}>
            Random State
          </QuantumButton>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {currentState.qubits} qubit{currentState.qubits > 1 ? 's' : ''} • {2 ** currentState.qubits} states
          </div>
        </div>
      </QuantumSurface>

      {/* Statistics Panel */}
      {showStatistics && (
        <QuantumSurface variant="glass" style={{ padding: '16px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Quantum State Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--quantum-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {statistics.purity.toFixed(4)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Purity</div>
            </div>
            
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--quantum-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {statistics.entropy.toFixed(3)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Entropy (bits)</div>
            </div>
            
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--quantum-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {(statistics.fidelity * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Fidelity</div>
            </div>
            
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--quantum-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {statistics.entanglement.toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Entanglement</div>
            </div>
          </div>
        </QuantumSurface>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: currentState.qubits === 1 ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Bloch Sphere (only for single qubits) */}
        {showBlochSphere && currentState.qubits === 1 && blochState && (
          <QuantumSurface variant="inset" style={{ padding: '24px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Bloch Sphere</h3>
            <BlochSphere
              state={blochState}
              size={250}
              showAxes={true}
              showLabels={true}
              interactive={interactive}
              animate={false}
            />
          </QuantumSurface>
        )}

        {/* State Vector Visualization */}
        {showStateVector && (
          <QuantumSurface variant="inset" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>State Vector</h3>
            <StateVectorVisualizer
              stateVector={currentState.amplitudes}
              qubits={currentState.qubits}
              height={300}
              showPhases={true}
              showAmplitudes={true}
              showProbabilities={true}
              representation={vectorRepresentation}
            />
          </QuantumSurface>
        )}
      </div>

      {/* Measurement Results */}
      {showHistogram && currentState.measurements && (
        <QuantumSurface variant="inset" style={{ padding: '24px', marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Measurement Results</h3>
          <StateHistogram
            results={currentState.measurements}
            qubits={currentState.qubits}
            maxBars={16}
            height={250}
            showProbabilities={true}
            showValues={true}
          />
        </QuantumSurface>
      )}
    </div>
  );
};

// Helper function to generate mock measurement results
function generateRandomMeasurements(amplitudes: ComplexAmplitude[], qubits: number): Record<string, number> {
  const totalShots = 1000;
  const results: Record<string, number> = {};
  
  amplitudes.forEach((amplitude, index) => {
    const state = index.toString(2).padStart(qubits, '0');
    const probability = amplitude.magnitude * amplitude.magnitude;
    const shots = Math.round(probability * totalShots + (Math.random() - 0.5) * 20);
    if (shots > 0) {
      results[state] = shots;
    }
  });
  
  return results;
}