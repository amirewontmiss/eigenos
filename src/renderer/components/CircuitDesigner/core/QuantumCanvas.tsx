import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { QuantumCircuit } from '../../../../quantum/core/circuit/quantum-circuit';
import { QuantumGate } from '../../../../quantum/core/gates/quantum-gate';
import { DragDropEngine } from '../interactions/DragDropEngine';
import { QuantumGateVisual } from '../rendering/QuantumGateVisual';
import { QuantumWire } from '../rendering/QuantumWire';
import { GridSystem } from '../rendering/GridSystem';
import { CircuitValidator } from '../validation/CircuitValidator';
import './QuantumCanvas.css';

export interface QuantumCanvasProps {
  width: number;
  height: number;
  circuit: QuantumCircuit;
  onCircuitChange: (circuit: QuantumCircuit) => void;
  viewMode: 'design' | 'simulation' | 'analysis';
  editable?: boolean;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface DragState {
  type: 'gate' | 'selection' | 'pan';
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  draggedElement?: any;
  points?: { x: number; y: number }[];
}

export interface AnimationState {
  particlePositions: Map<string, { x: number; y: number }>;
  waveAmplitudes: Map<string, number>;
  quantumField: any;
  fps: number;
  lastRenderTime: number;
}

export const QuantumCanvas: React.FC<QuantumCanvasProps> = ({
  width,
  height,
  circuit,
  onCircuitChange,
  viewMode,
  editable = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Viewport state management
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    zoom: 1,
    width: width,
    height: height
  });
  
  // Selection and interaction state
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  
  // Animation state for quantum effects
  const [animationState, setAnimationState] = useState<AnimationState>({
    particlePositions: new Map(),
    waveAmplitudes: new Map(),
    quantumField: null,
    fps: 60,
    lastRenderTime: 0
  });
  
  // Performance optimization - virtualize large circuits
  const visibleElements = useMemo(() => {
    const gateMargin = 100; // Extra margin for smooth scrolling
    const visibleGates = circuit.gates.filter(gate => {
      const gateX = gate.position?.x || 0;
      const gateY = gate.position?.y || 0;
      
      return (
        gateX >= viewport.x - gateMargin &&
        gateX <= viewport.x + viewport.width + gateMargin &&
        gateY >= viewport.y - gateMargin &&
        gateY <= viewport.y + viewport.height + gateMargin
      );
    });
    
    return { gates: visibleGates };
  }, [circuit.gates, viewport]);
  
  // Grid configuration
  const gridConfig = useMemo(() => ({
    size: 40 * viewport.zoom,
    subdivisions: 4,
    opacity: Math.max(0.1, Math.min(0.4, viewport.zoom)),
    majorLineWidth: Math.max(0.5, viewport.zoom),
    minorLineWidth: Math.max(0.25, viewport.zoom * 0.5)
  }), [viewport.zoom]);
  
  // Handle gate placement from drag and drop
  const handleGateDrop = useCallback((gateType: string, position: { x: number; y: number }) => {
    if (!editable) return;
    
    // Snap to grid
    const snappedPosition = {
      x: Math.round(position.x / gridConfig.size) * gridConfig.size,
      y: Math.round(position.y / gridConfig.size) * gridConfig.size
    };
    
    // Determine which qubit wire this position corresponds to
    const qubitIndex = Math.floor(snappedPosition.y / gridConfig.size);
    if (qubitIndex < 0 || qubitIndex >= circuit.qubits) return;
    
    // Create new gate
    const newGate = new QuantumGate(gateType, [qubitIndex]);
    newGate.position = snappedPosition;
    newGate.id = `gate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add gate to circuit
    const newCircuit = circuit.clone();
    newCircuit.addGate(newGate);
    
    // Validate circuit
    const validator = new CircuitValidator();
    const validation = validator.validateCircuit(newCircuit);
    
    if (validation.isValid) {
      onCircuitChange(newCircuit);
    } else {
      console.warn('Invalid circuit after gate placement:', validation.errors);
    }
  }, [circuit, onCircuitChange, gridConfig.size, editable]);
  
  // Handle gate selection
  const handleGateSelection = useCallback((gateId: string, multiSelect: boolean = false) => {
    setSelectedElements(prev => {
      const newSelection = new Set(multiSelect ? prev : []);
      if (newSelection.has(gateId)) {
        newSelection.delete(gateId);
      } else {
        newSelection.add(gateId);
      }
      return newSelection;
    });
  }, []);
  
  // Handle gate movement
  const handleGateMove = useCallback((gateId: string, newPosition: { x: number; y: number }) => {
    if (!editable) return;
    
    const newCircuit = circuit.clone();
    const gate = newCircuit.gates.find(g => g.id === gateId);
    
    if (gate) {
      // Snap to grid
      gate.position = {
        x: Math.round(newPosition.x / gridConfig.size) * gridConfig.size,
        y: Math.round(newPosition.y / gridConfig.size) * gridConfig.size
      };
      
      // Update qubit assignment based on new position
      const qubitIndex = Math.floor(gate.position.y / gridConfig.size);
      if (qubitIndex >= 0 && qubitIndex < circuit.qubits) {
        gate.qubits = [qubitIndex];
        onCircuitChange(newCircuit);
      }
    }
  }, [circuit, onCircuitChange, gridConfig.size, editable]);
  
  // Handle viewport panning
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    setViewport(prev => ({
      ...prev,
      x: prev.x - deltaX / prev.zoom,
      y: prev.y - deltaY / prev.zoom
    }));
  }, []);
  
  // Handle zoom
  const handleZoom = useCallback((delta: number, centerX: number, centerY: number) => {
    setViewport(prev => {
      const newZoom = Math.max(0.1, Math.min(5, prev.zoom * (1 + delta * 0.1)));
      const zoomRatio = newZoom / prev.zoom;
      
      // Zoom towards the cursor position
      const newX = centerX - (centerX - prev.x) * zoomRatio;
      const newY = centerY - (centerY - prev.y) * zoomRatio;
      
      return {
        ...prev,
        zoom: newZoom,
        x: newX,
        y: newY
      };
    });
  }, []);
  
  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (event.clientX - rect.left) / viewport.zoom + viewport.x;
    const y = (event.clientY - rect.top) / viewport.zoom + viewport.y;
    
    if (event.button === 1 || (event.button === 0 && event.altKey)) {
      // Middle mouse or Alt+Left mouse - start panning
      setDragState({
        type: 'pan',
        startPosition: { x: event.clientX, y: event.clientY },
        currentPosition: { x: event.clientX, y: event.clientY }
      });
    } else if (event.button === 0) {
      // Left mouse - potential selection
      setDragState({
        type: 'selection',
        startPosition: { x, y },
        currentPosition: { x, y },
        points: [{ x, y }]
      });
    }
  }, [viewport]);
  
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!dragState) return;
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    if (dragState.type === 'pan') {
      const deltaX = event.clientX - dragState.currentPosition.x;
      const deltaY = event.clientY - dragState.currentPosition.y;
      handlePan(deltaX, deltaY);
      
      setDragState(prev => prev ? {
        ...prev,
        currentPosition: { x: event.clientX, y: event.clientY }
      } : null);
    } else if (dragState.type === 'selection') {
      const x = (event.clientX - rect.left) / viewport.zoom + viewport.x;
      const y = (event.clientY - rect.top) / viewport.zoom + viewport.y;
      
      setDragState(prev => prev ? {
        ...prev,
        currentPosition: { x, y }
      } : null);
    }
  }, [dragState, viewport, handlePan]);
  
  const handleMouseUp = useCallback(() => {
    if (dragState?.type === 'selection') {
      // Handle selection rectangle
      const startX = Math.min(dragState.startPosition.x, dragState.currentPosition.x);
      const endX = Math.max(dragState.startPosition.x, dragState.currentPosition.x);
      const startY = Math.min(dragState.startPosition.y, dragState.currentPosition.y);
      const endY = Math.max(dragState.startPosition.y, dragState.currentPosition.y);
      
      const selectedGates = circuit.gates.filter(gate => {
        const gateX = gate.position?.x || 0;
        const gateY = gate.position?.y || 0;
        return gateX >= startX && gateX <= endX && gateY >= startY && gateY <= endY;
      });
      
      setSelectedElements(new Set(selectedGates.map(g => g.id)));
    }
    
    setDragState(null);
  }, [dragState, circuit.gates]);
  
  // Wheel event for zooming
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = (event.clientX - rect.left) / viewport.zoom + viewport.x;
    const centerY = (event.clientY - rect.top) / viewport.zoom + viewport.y;
    
    handleZoom(-event.deltaY / 1000, centerX, centerY);
  }, [viewport, handleZoom]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!editable) return;
      
      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedElements.size > 0) {
            const newCircuit = circuit.clone();
            selectedElements.forEach(gateId => {
              const gateIndex = newCircuit.gates.findIndex(g => g.id === gateId);
              if (gateIndex !== -1) {
                newCircuit.gates.splice(gateIndex, 1);
              }
            });
            onCircuitChange(newCircuit);
            setSelectedElements(new Set());
          }
          break;
        case 'Escape':
          setSelectedElements(new Set());
          setDragState(null);
          break;
        case 'a':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setSelectedElements(new Set(circuit.gates.map(g => g.id)));
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElements, circuit, onCircuitChange, editable]);
  
  // Animation loop for quantum effects
  useEffect(() => {
    if (viewMode !== 'simulation') return;
    
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      const deltaTime = timestamp - animationState.lastRenderTime;
      const fps = 1000 / deltaTime;
      
      // Update particle positions and wave amplitudes
      const newParticlePositions = new Map();
      const newWaveAmplitudes = new Map();
      
      circuit.gates.forEach(gate => {
        // Simulate quantum particles flowing through the circuit
        const time = timestamp * 0.001;
        const particleX = (gate.position?.x || 0) + Math.sin(time + gate.id.charCodeAt(0)) * 10;
        const particleY = (gate.position?.y || 0) + Math.cos(time + gate.id.charCodeAt(0)) * 5;
        
        newParticlePositions.set(gate.id, { x: particleX, y: particleY });
        newWaveAmplitudes.set(gate.id, Math.abs(Math.sin(time * 2 + gate.id.charCodeAt(0))));
      });
      
      setAnimationState(prev => ({
        ...prev,
        particlePositions: newParticlePositions,
        waveAmplitudes: newWaveAmplitudes,
        fps,
        lastRenderTime: timestamp
      }));
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [viewMode, circuit.gates, animationState.lastRenderTime]);
  
  // Calculate wire positions for qubits
  const wirePositions = useMemo(() => {
    const wires = [];
    for (let i = 0; i < circuit.qubits; i++) {
      const y = i * gridConfig.size + gridConfig.size / 2;
      wires.push({
        id: `wire_${i}`,
        qubitIndex: i,
        startX: 0,
        endX: width,
        y: y
      });
    }
    return wires;
  }, [circuit.qubits, gridConfig.size, width]);
  
  return (
    <div
      ref={containerRef}
      className="quantum-canvas-container"
      style={{ width, height }}
    >
      <svg
        ref={svgRef}
        className="quantum-canvas"
        width={width}
        height={height}
        viewBox={`${viewport.x} ${viewport.y} ${viewport.width / viewport.zoom} ${viewport.height / viewport.zoom}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Background grid */}
        <GridSystem
          config={gridConfig}
          viewport={viewport}
          visible={viewMode === 'design'}
        />
        
        {/* Quantum field background */}
        {viewMode === 'simulation' && (
          <defs>
            <pattern
              id="quantum-field"
              patternUnits="userSpaceOnUse"
              width="40"
              height="40"
            >
              <rect width="40" height="40" fill="url(#quantum-field-gradient)" />
            </pattern>
            <radialGradient id="quantum-field-gradient">
              <stop offset="0%" stopColor="rgba(96, 239, 255, 0.05)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
        )}
        
        {viewMode === 'simulation' && (
          <rect
            x={viewport.x}
            y={viewport.y}
            width={viewport.width / viewport.zoom}
            height={viewport.height / viewport.zoom}
            fill="url(#quantum-field)"
          />
        )}
        
        {/* Quantum wires */}
        {wirePositions.map(wire => (
          <QuantumWire
            key={wire.id}
            wire={wire}
            particles={viewMode === 'simulation' ? animationState.particlePositions : undefined}
            amplitude={viewMode === 'simulation' ? animationState.waveAmplitudes.get(wire.id) : undefined}
            interactive={editable}
          />
        ))}
        
        {/* Quantum gates */}
        {visibleElements.gates.map(gate => (
          <QuantumGateVisual
            key={gate.id}
            gate={gate}
            selected={selectedElements.has(gate.id)}
            hovered={hoveredElement === gate.id}
            onSelect={(multiSelect) => handleGateSelection(gate.id, multiSelect)}
            onMove={(position) => handleGateMove(gate.id, position)}
            onHover={() => setHoveredElement(gate.id)}
            onHoverEnd={() => setHoveredElement(null)}
            animationState={animationState}
            viewMode={viewMode}
            editable={editable}
          />
        ))}
        
        {/* Selection rectangle */}
        {dragState?.type === 'selection' && (
          <rect
            x={Math.min(dragState.startPosition.x, dragState.currentPosition.x)}
            y={Math.min(dragState.startPosition.y, dragState.currentPosition.y)}
            width={Math.abs(dragState.currentPosition.x - dragState.startPosition.x)}
            height={Math.abs(dragState.currentPosition.y - dragState.startPosition.y)}
            fill="rgba(96, 239, 255, 0.1)"
            stroke="var(--quantum-primary)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        )}
      </svg>
      
      {/* Canvas controls */}
      <div className="canvas-controls">
        <div className="zoom-controls">
          <button
            className="zoom-button"
            onClick={() => handleZoom(1, viewport.width / 2, viewport.height / 2)}
            disabled={viewport.zoom >= 5}
          >
            +
          </button>
          <span className="zoom-display">{Math.round(viewport.zoom * 100)}%</span>
          <button
            className="zoom-button"
            onClick={() => handleZoom(-1, viewport.width / 2, viewport.height / 2)}
            disabled={viewport.zoom <= 0.1}
          >
            -
          </button>
        </div>
        
        <button
          className="fit-button"
          onClick={() => {
            // Fit circuit to view
            if (circuit.gates.length === 0) return;
            
            const minX = Math.min(...circuit.gates.map(g => g.position?.x || 0));
            const maxX = Math.max(...circuit.gates.map(g => g.position?.x || 0));
            const minY = Math.min(...circuit.gates.map(g => g.position?.y || 0));
            const maxY = Math.max(...circuit.gates.map(g => g.position?.y || 0));
            
            const circuitWidth = maxX - minX + 100;
            const circuitHeight = maxY - minY + 100;
            
            const zoomX = width / circuitWidth;
            const zoomY = height / circuitHeight;
            const newZoom = Math.min(zoomX, zoomY, 2);
            
            setViewport({
              x: minX - 50,
              y: minY - 50,
              zoom: newZoom,
              width: width,
              height: height
            });
          }}
        >
          Fit to View
        </button>
      </div>
      
      {/* Performance overlay for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-overlay">
          <div>FPS: {Math.round(animationState.fps)}</div>
          <div>Gates: {visibleElements.gates.length}/{circuit.gates.length}</div>
          <div>Zoom: {Math.round(viewport.zoom * 100)}%</div>
          <div>Selected: {selectedElements.size}</div>
        </div>
      )}
      
      {/* Drag and drop engine */}
      <DragDropEngine
        onGateDrop={handleGateDrop}
        canvas={svgRef.current}
        viewport={viewport}
        gridSize={gridConfig.size}
      />
    </div>
  );
};