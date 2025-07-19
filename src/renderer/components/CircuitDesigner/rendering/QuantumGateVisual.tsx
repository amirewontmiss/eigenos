import React, { useState, useRef, useEffect } from 'react';
import { QuantumGate } from '../../../../quantum/core/gates/quantum-gate';

export interface QuantumGateVisualProps {
  gate: QuantumGate;
  selected: boolean;
  hovered: boolean;
  onSelect: (multiSelect: boolean) => void;
  onMove: (position: { x: number; y: number }) => void;
  onHover: () => void;
  onHoverEnd: () => void;
  animationState: any;
  viewMode: 'design' | 'simulation' | 'analysis';
  editable: boolean;
}

export interface GateConfig {
  width: number;
  height: number;
  symbol: string;
  color: string;
  borderRadius: number;
  fontSize: number;
  connectionPoints: ConnectionPoint[];
}

export interface ConnectionPoint {
  x: number;
  y: number;
  type: 'input' | 'output' | 'control';
  connected: boolean;
}

// Gate configuration database
const GATE_CONFIGS: Record<string, GateConfig> = {
  X: {
    width: 40,
    height: 40,
    symbol: 'X',
    color: '#ff4757',
    borderRadius: 8,
    fontSize: 14,
    connectionPoints: [
      { x: 0, y: 20, type: 'input', connected: false },
      { x: 40, y: 20, type: 'output', connected: false }
    ]
  },
  Y: {
    width: 40,
    height: 40,
    symbol: 'Y',
    color: '#2ed573',
    borderRadius: 8,
    fontSize: 14,
    connectionPoints: [
      { x: 0, y: 20, type: 'input', connected: false },
      { x: 40, y: 20, type: 'output', connected: false }
    ]
  },
  Z: {
    width: 40,
    height: 40,
    symbol: 'Z',
    color: '#1e90ff',
    borderRadius: 8,
    fontSize: 14,
    connectionPoints: [
      { x: 0, y: 20, type: 'input', connected: false },
      { x: 40, y: 20, type: 'output', connected: false }
    ]
  },
  H: {
    width: 40,
    height: 40,
    symbol: 'H',
    color: '#ffa502',
    borderRadius: 8,
    fontSize: 14,
    connectionPoints: [
      { x: 0, y: 20, type: 'input', connected: false },
      { x: 40, y: 20, type: 'output', connected: false }
    ]
  },
  CNOT: {
    width: 60,
    height: 40,
    symbol: '⊕',
    color: '#3742fa',
    borderRadius: 8,
    fontSize: 16,
    connectionPoints: [
      { x: 0, y: 20, type: 'input', connected: false },
      { x: 60, y: 20, type: 'output', connected: false },
      { x: 30, y: 0, type: 'control', connected: false }
    ]
  },
  RX: {
    width: 50,
    height: 40,
    symbol: 'Rx',
    color: '#ff6b6b',
    borderRadius: 8,
    fontSize: 12,
    connectionPoints: [
      { x: 0, y: 20, type: 'input', connected: false },
      { x: 50, y: 20, type: 'output', connected: false }
    ]
  },
  RY: {
    width: 50,
    height: 40,
    symbol: 'Ry',
    color: '#4ecdc4',
    borderRadius: 8,
    fontSize: 12,
    connectionPoints: [
      { x: 0, y: 20, type: 'input', connected: false },
      { x: 50, y: 20, type: 'output', connected: false }
    ]
  },
  RZ: {
    width: 50,
    height: 40,
    symbol: 'Rz',
    color: '#45b7d1',
    borderRadius: 8,
    fontSize: 12,
    connectionPoints: [
      { x: 0, y: 20, type: 'input', connected: false },
      { x: 50, y: 20, type: 'output', connected: false }
    ]
  },
  S: {
    width: 40,
    height: 40,
    symbol: 'S',
    color: '#f9ca24',
    borderRadius: 8,
    fontSize: 14,
    connectionPoints: [
      { x: 0, y: 20, type: 'input', connected: false },
      { x: 40, y: 20, type: 'output', connected: false }
    ]
  },
  T: {
    width: 40,
    height: 40,
    symbol: 'T',
    color: '#6c5ce7',
    borderRadius: 8,
    fontSize: 14,
    connectionPoints: [
      { x: 0, y: 20, type: 'input', connected: false },
      { x: 40, y: 20, type: 'output', connected: false }
    ]
  }
};

export const QuantumGateVisual: React.FC<QuantumGateVisualProps> = ({
  gate,
  selected,
  hovered,
  onSelect,
  onMove,
  onHover,
  onHoverEnd,
  animationState,
  viewMode,
  editable
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const gateRef = useRef<SVGGElement>(null);
  
  const gateConfig = GATE_CONFIGS[gate.name] || GATE_CONFIGS.X;
  const position = gate.position || { x: 0, y: 0 };
  
  // Handle mouse interactions
  const handleMouseDown = (event: React.MouseEvent) => {
    if (!editable) return;
    
    event.stopPropagation();
    setIsDragging(true);
    
    const rect = (event.target as Element).closest('svg')?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: event.clientX - rect.left - position.x,
        y: event.clientY - rect.top - position.y
      });
    }
    
    onSelect(event.ctrlKey || event.metaKey);
  };
  
  const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging || !editable) return;
    
    const rect = gateRef.current?.closest('svg')?.getBoundingClientRect();
    if (rect) {
      const newPosition = {
        x: event.clientX - rect.left - dragStart.x,
        y: event.clientY - rect.top - dragStart.y
      };
      onMove(newPosition);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Global mouse event handlers for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);
  
  // Calculate quantum state visualization
  const getQuantumStateVisualization = () => {
    if (viewMode !== 'simulation') return null;
    
    const amplitude = animationState.waveAmplitudes?.get(gate.id) || 0;
    const particlePos = animationState.particlePositions?.get(gate.id) || position;
    
    return {
      amplitude,
      particlePos,
      phaseColor: `hsl(${(amplitude * 360) % 360}, 70%, 60%)`
    };
  };
  
  const quantumViz = getQuantumStateVisualization();
  
  // Calculate visual effects based on state
  const getGateEffects = () => {
    const effects = {
      scale: 1,
      glow: 0,
      rotation: 0,
      opacity: 1
    };
    
    if (selected) {
      effects.scale = 1.1;
      effects.glow = 8;
    } else if (hovered) {
      effects.scale = 1.05;
      effects.glow = 4;
    }
    
    if (viewMode === 'simulation' && quantumViz) {
      effects.rotation = quantumViz.amplitude * 10;
      effects.opacity = 0.8 + quantumViz.amplitude * 0.2;
    }
    
    if (isDragging) {
      effects.scale *= 1.1;
      effects.opacity = 0.8;
    }
    
    return effects;
  };
  
  const effects = getGateEffects();
  
  return (
    <g
      ref={gateRef}
      className={`quantum-gate ${selected ? 'selected' : ''} ${hovered ? 'hovered' : ''} ${isDragging ? 'dragging' : ''}`}
      transform={`translate(${position.x}, ${position.y}) scale(${effects.scale}) rotate(${effects.rotation})`}
      onMouseDown={handleMouseDown}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      style={{
        cursor: editable ? (isDragging ? 'grabbing' : 'grab') : 'default',
        opacity: effects.opacity
      }}
    >
      {/* Gate shadow */}
      <rect
        x="2"
        y="2"
        width={gateConfig.width}
        height={gateConfig.height}
        rx={gateConfig.borderRadius}
        fill="rgba(0, 0, 0, 0.2)"
        filter="blur(2px)"
      />
      
      {/* Quantum field distortion effect */}
      {viewMode === 'simulation' && quantumViz && (
        <ellipse
          cx={gateConfig.width / 2}
          cy={gateConfig.height / 2}
          rx={gateConfig.width / 2 + 10 + quantumViz.amplitude * 5}
          ry={gateConfig.height / 2 + 10 + quantumViz.amplitude * 5}
          fill="none"
          stroke={quantumViz.phaseColor}
          strokeWidth="1"
          opacity={quantumViz.amplitude * 0.5}
          strokeDasharray="4,4"
        />
      )}
      
      {/* Gate body */}
      <rect
        width={gateConfig.width}
        height={gateConfig.height}
        rx={gateConfig.borderRadius}
        fill={`url(#gate-gradient-${gate.name})`}
        stroke={selected ? 'var(--quantum-primary)' : gateConfig.color}
        strokeWidth={selected ? 3 : 2}
        filter={effects.glow > 0 ? `drop-shadow(0 0 ${effects.glow}px ${gateConfig.color})` : 'none'}
      />
      
      {/* Gate symbol */}
      <text
        x={gateConfig.width / 2}
        y={gateConfig.height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={gateConfig.fontSize}
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="bold"
        fill="white"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {gateConfig.symbol}
      </text>
      
      {/* Parameter display for parameterized gates */}
      {gate.parameters && gate.parameters.length > 0 && (
        <g>
          <rect
            x={gateConfig.width + 4}
            y={gateConfig.height / 2 - 8}
            width="60"
            height="16"
            rx="4"
            fill="rgba(0, 0, 0, 0.7)"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="1"
          />
          <text
            x={gateConfig.width + 34}
            y={gateConfig.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            fontFamily="'JetBrains Mono', monospace"
            fill="white"
          >
            {gate.parameters[0].toFixed(2)}
          </text>
        </g>
      )}
      
      {/* Connection points */}
      {gateConfig.connectionPoints.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="4"
          fill={point.type === 'control' ? 'black' : gateConfig.color}
          stroke="white"
          strokeWidth="2"
          opacity={hovered ? 1 : 0.7}
        />
      ))}
      
      {/* Quantum particle visualization */}
      {viewMode === 'simulation' && quantumViz && (
        <circle
          cx={quantumViz.particlePos.x - position.x + gateConfig.width / 2}
          cy={quantumViz.particlePos.y - position.y + gateConfig.height / 2}
          r="3"
          fill={quantumViz.phaseColor}
          opacity={quantumViz.amplitude}
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0;360"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      
      {/* Selection indicator */}
      {selected && (
        <rect
          x="-4"
          y="-4"
          width={gateConfig.width + 8}
          height={gateConfig.height + 8}
          rx={gateConfig.borderRadius + 2}
          fill="none"
          stroke="var(--quantum-primary)"
          strokeWidth="2"
          strokeDasharray="4,4"
          opacity="0.8"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;8"
            dur="1s"
            repeatCount="indefinite"
          />
        </rect>
      )}
    </g>
  );
};

// Gate gradient definitions (to be included in SVG defs)
export const GateGradientDefs: React.FC = () => (
  <defs>
    {Object.entries(GATE_CONFIGS).map(([gateName, config]) => (
      <linearGradient key={gateName} id={`gate-gradient-${gateName}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={config.color} stopOpacity="1" />
        <stop offset="100%" stopColor={config.color} stopOpacity="0.7" />
      </linearGradient>
    ))}
    
    {/* Special gradients for quantum effects */}
    <radialGradient id="quantum-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="var(--quantum-primary)" stopOpacity="0.3" />
      <stop offset="100%" stopColor="var(--quantum-primary)" stopOpacity="0" />
    </radialGradient>
  </defs>
);