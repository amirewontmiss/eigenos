import React, { useState, useRef, useCallback, useMemo } from 'react';
import { QuantumCanvas } from './core/QuantumCanvas';
import { QuantumGateVisual, GateGradientDefs } from './rendering/QuantumGateVisual';
import { QuantumWire } from './rendering/QuantumWire';
import { GridSystem } from './rendering/GridSystem';
import { DragDropEngine } from './interactions/DragDropEngine';
import { CircuitValidator, ValidationResult } from './validation/CircuitValidator';
import { QuantumCircuit } from '../../../quantum/core/circuit/quantum-circuit';
import { QuantumGate } from '../../../quantum/core/gates/quantum-gate';
import { QuantumSurface } from '../../design-system/primitives/QuantumSurface';
import { QuantumButton } from '../../design-system/primitives/QuantumButton';

export interface QuantumCircuitDesignerProps {
  circuit: QuantumCircuit;
  onCircuitChange: (circuit: QuantumCircuit) => void;
  readonly?: boolean;
  className?: string;
}

export interface DesignerState {
  selectedGates: Set<string>;
  viewMode: 'design' | 'simulation' | 'analysis';
  viewport: {
    x: number;
    y: number;
    zoom: number;
    width: number;
    height: number;
  };
  showGrid: boolean;
  showValidation: boolean;
  animationState: {
    waveAmplitudes: Map<string, number>;
    particlePositions: Map<string, { x: number; y: number }>;
    isSimulating: boolean;
  };
  validation: ValidationResult | null;
}

const GRID_CONFIG = {
  size: 60,
  subdivisions: 4,
  opacity: 0.6,
  majorLineWidth: 1,
  minorLineWidth: 0.5
};

const GATE_PALETTE = [
  { type: 'X', name: 'Pauli X', category: 'Single Qubit' },
  { type: 'Y', name: 'Pauli Y', category: 'Single Qubit' },
  { type: 'Z', name: 'Pauli Z', category: 'Single Qubit' },
  { type: 'H', name: 'Hadamard', category: 'Single Qubit' },
  { type: 'S', name: 'S Gate', category: 'Single Qubit' },
  { type: 'T', name: 'T Gate', category: 'Single Qubit' },
  { type: 'RX', name: 'Rotation X', category: 'Parameterized' },
  { type: 'RY', name: 'Rotation Y', category: 'Parameterized' },
  { type: 'RZ', name: 'Rotation Z', category: 'Parameterized' },
  { type: 'CNOT', name: 'CNOT', category: 'Two Qubit' }
];

export const QuantumCircuitDesigner: React.FC<QuantumCircuitDesignerProps> = ({
  circuit,
  onCircuitChange,
  readonly = false,
  className = ''
}) => {
  const canvasRef = useRef<SVGSVGElement>(null);
  const validator = useMemo(() => new CircuitValidator(), []);
  
  const [state, setState] = useState<DesignerState>({
    selectedGates: new Set(),
    viewMode: 'design',
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
      width: 800,
      height: 600
    },
    showGrid: true,
    showValidation: true,
    animationState: {
      waveAmplitudes: new Map(),
      particlePositions: new Map(),
      isSimulating: false
    },
    validation: null
  });

  // Generate quantum wires based on circuit qubits
  const quantumWires = useMemo(() => {
    const wires = [];
    for (let i = 0; i < circuit.qubits; i++) {
      wires.push({
        id: `wire-${i}`,
        qubitIndex: i,
        startX: 50,
        endX: state.viewport.width - 100,
        y: 100 + i * GRID_CONFIG.size
      });
    }
    return wires;
  }, [circuit.qubits, state.viewport.width]);

  // Validate circuit whenever it changes
  React.useEffect(() => {
    if (state.showValidation) {
      const validation = validator.validateCircuit(circuit);
      setState(prev => ({ ...prev, validation }));
    }
  }, [circuit, state.showValidation, validator]);

  // Handle gate selection
  const handleGateSelect = useCallback((gateId: string, multiSelect: boolean) => {
    setState(prev => {
      const newSelection = new Set(multiSelect ? prev.selectedGates : []);
      if (newSelection.has(gateId)) {
        newSelection.delete(gateId);
      } else {
        newSelection.add(gateId);
      }
      return { ...prev, selectedGates: newSelection };
    });
  }, []);

  // Handle gate movement
  const handleGateMove = useCallback((gateId: string, position: { x: number; y: number }) => {
    const updatedCircuit = { ...circuit };
    const gateIndex = updatedCircuit.gates.findIndex(g => g.id === gateId);
    if (gateIndex !== -1) {
      updatedCircuit.gates[gateIndex] = {
        ...updatedCircuit.gates[gateIndex],
        position
      };
      onCircuitChange(updatedCircuit);
    }
  }, [circuit, onCircuitChange]);

  // Handle new gate drop
  const handleGateDrop = useCallback((gateType: string, position: { x: number; y: number }) => {
    // Determine which qubit wire this gate should be placed on
    const qubitIndex = Math.floor((position.y - 100 + GRID_CONFIG.size / 2) / GRID_CONFIG.size);
    
    if (qubitIndex < 0 || qubitIndex >= circuit.qubits) return;

    // Snap to grid
    const snappedPosition = {
      x: Math.round(position.x / GRID_CONFIG.size) * GRID_CONFIG.size,
      y: 100 + qubitIndex * GRID_CONFIG.size
    };

    // Validate placement
    const validation = validator.validateGatePlacement(circuit, gateType, snappedPosition, qubitIndex);
    if (!validation.isValid) {
      console.warn('Invalid gate placement:', validation.errors);
      return;
    }

    // Create new gate
    const newGate: QuantumGate = {
      id: `${gateType}-${Date.now()}`,
      name: gateType,
      qubits: [qubitIndex],
      parameters: gateType.startsWith('R') ? [Math.PI / 2] : [],
      position: snappedPosition
    };

    const updatedCircuit = {
      ...circuit,
      gates: [...circuit.gates, newGate]
    };

    onCircuitChange(updatedCircuit);
  }, [circuit, onCircuitChange, validator]);

  // Handle viewport changes
  const handleViewportChange = useCallback((viewport: typeof state.viewport) => {
    setState(prev => ({ ...prev, viewport }));
  }, []);

  // Toggle view modes
  const toggleViewMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      viewMode: prev.viewMode === 'design' ? 'simulation' : prev.viewMode === 'simulation' ? 'analysis' : 'design'
    }));
  }, []);

  // Start/stop simulation
  const toggleSimulation = useCallback(() => {
    setState(prev => ({
      ...prev,
      animationState: {
        ...prev.animationState,
        isSimulating: !prev.animationState.isSimulating
      }
    }));
  }, []);

  // Delete selected gates
  const deleteSelectedGates = useCallback(() => {
    if (state.selectedGates.size === 0) return;
    
    const updatedCircuit = {
      ...circuit,
      gates: circuit.gates.filter(gate => !state.selectedGates.has(gate.id))
    };
    
    setState(prev => ({ ...prev, selectedGates: new Set() }));
    onCircuitChange(updatedCircuit);
  }, [circuit, state.selectedGates, onCircuitChange]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteSelectedGates();
      } else if (event.key === 'Escape') {
        setState(prev => ({ ...prev, selectedGates: new Set() }));
      } else if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        setState(prev => ({
          ...prev,
          selectedGates: new Set(circuit.gates.map(g => g.id))
        }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedGates, circuit.gates]);

  return (
    <div className={`quantum-circuit-designer ${className}`}>
      {/* Toolbar */}
      <QuantumSurface className="designer-toolbar" variant="glass" style={{ marginBottom: '16px' }}>
        <div className="toolbar-content" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px' }}>
          <QuantumButton
            variant={state.viewMode === 'design' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setState(prev => ({ ...prev, viewMode: 'design' }))}
          >
            Design
          </QuantumButton>
          
          <QuantumButton
            variant={state.viewMode === 'simulation' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setState(prev => ({ ...prev, viewMode: 'simulation' }))}
          >
            Simulate
          </QuantumButton>
          
          <QuantumButton
            variant={state.viewMode === 'analysis' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setState(prev => ({ ...prev, viewMode: 'analysis' }))}
          >
            Analyze
          </QuantumButton>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--border-primary)', margin: '0 8px' }} />
          
          <QuantumButton
            variant="secondary"
            size="sm"
            onClick={() => setState(prev => ({ ...prev, showGrid: !prev.showGrid }))}
            className={state.showGrid ? 'active' : ''}
          >
            Grid
          </QuantumButton>
          
          <QuantumButton
            variant="secondary"
            size="sm"
            onClick={() => setState(prev => ({ ...prev, showValidation: !prev.showValidation }))}
            className={state.showValidation ? 'active' : ''}
          >
            Validate
          </QuantumButton>
          
          {state.viewMode === 'simulation' && (
            <QuantumButton
              variant={state.animationState.isSimulating ? 'destructive' : 'primary'}
              size="sm"
              onClick={toggleSimulation}
            >
              {state.animationState.isSimulating ? 'Stop' : 'Start'} Simulation
            </QuantumButton>
          )}
          
          {state.selectedGates.size > 0 && (
            <QuantumButton
              variant="destructive"
              size="sm"
              onClick={deleteSelectedGates}
            >
              Delete ({state.selectedGates.size})
            </QuantumButton>
          )}
        </div>
      </QuantumSurface>

      <div className="designer-main" style={{ display: 'flex', gap: '16px' }}>
        {/* Gate Palette */}
        {!readonly && (
          <QuantumSurface className="gate-palette" variant="elevated" style={{ width: '200px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Gates</h3>
            {Object.entries(
              GATE_PALETTE.reduce((acc, gate) => {
                if (!acc[gate.category]) acc[gate.category] = [];
                acc[gate.category].push(gate);
                return acc;
              }, {} as Record<string, typeof GATE_PALETTE>)
            ).map(([category, gates]) => (
              <div key={category} style={{ marginBottom: '16px' }}>
                <h4 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '12px', 
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {category}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {gates.map(gate => (
                    <div
                      key={gate.type}
                      draggable
                      data-gate-type={gate.type}
                      className="gate-palette-item"
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        background: 'var(--surface-secondary)',
                        border: '1px solid var(--border-primary)',
                        cursor: 'grab',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono, monospace'
                      }}
                      title={gate.name}
                    >
                      {gate.type}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </QuantumSurface>
        )}

        {/* Main Canvas */}
        <QuantumSurface className="circuit-canvas-container" variant="inset" style={{ flex: 1, position: 'relative' }}>
          <QuantumCanvas
            ref={canvasRef}
            viewport={state.viewport}
            onViewportChange={handleViewportChange}
            className="quantum-circuit-canvas"
          >
            <GateGradientDefs />
            
            {/* Grid System */}
            <GridSystem
              config={GRID_CONFIG}
              viewport={state.viewport}
              visible={state.showGrid}
            />
            
            {/* Quantum Wires */}
            {quantumWires.map(wire => (
              <QuantumWire
                key={wire.id}
                wire={wire}
                particles={state.animationState.particlePositions}
                amplitude={state.animationState.waveAmplitudes.get(wire.id) || 0}
                interactive={!readonly}
              />
            ))}
            
            {/* Quantum Gates */}
            {circuit.gates.map(gate => (
              <QuantumGateVisual
                key={gate.id}
                gate={gate}
                selected={state.selectedGates.has(gate.id)}
                hovered={false}
                onSelect={(multiSelect) => handleGateSelect(gate.id, multiSelect)}
                onMove={(position) => handleGateMove(gate.id, position)}
                onHover={() => {}}
                onHoverEnd={() => {}}
                animationState={state.animationState}
                viewMode={state.viewMode}
                editable={!readonly}
              />
            ))}
          </QuantumCanvas>
          
          {/* Drag and Drop Engine */}
          {!readonly && (
            <DragDropEngine
              onGateDrop={handleGateDrop}
              canvas={canvasRef.current}
              viewport={state.viewport}
              gridSize={GRID_CONFIG.size}
            />
          )}
        </QuantumSurface>
      </div>

      {/* Validation Panel */}
      {state.showValidation && state.validation && (
        <QuantumSurface 
          className="validation-panel" 
          variant="glass" 
          style={{ marginTop: '16px', padding: '16px' }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
            Circuit Validation
          </h3>
          
          {state.validation.errors.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ color: 'var(--status-error)', fontSize: '14px', margin: '0 0 8px 0' }}>
                Errors ({state.validation.errors.length})
              </h4>
              {state.validation.errors.map((error, index) => (
                <div key={index} style={{ 
                  padding: '8px 12px', 
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--status-error)',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  fontSize: '12px'
                }}>
                  {error.message}
                </div>
              ))}
            </div>
          )}
          
          {state.validation.warnings.length > 0 && (
            <div>
              <h4 style={{ color: 'var(--status-warning)', fontSize: '14px', margin: '0 0 8px 0' }}>
                Warnings ({state.validation.warnings.length})
              </h4>
              {state.validation.warnings.map((warning, index) => (
                <div key={index} style={{ 
                  padding: '8px 12px', 
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid var(--status-warning)',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  fontSize: '12px'
                }}>
                  <div>{warning.message}</div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                    💡 {warning.suggestion}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {state.validation.isValid && state.validation.errors.length === 0 && state.validation.warnings.length === 0 && (
            <div style={{ 
              padding: '8px 12px', 
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid var(--status-success)',
              borderRadius: '4px',
              color: 'var(--status-success)',
              fontSize: '12px'
            }}>
              ✅ Circuit is valid and ready for execution
            </div>
          )}
        </QuantumSurface>
      )}
    </div>
  );
};