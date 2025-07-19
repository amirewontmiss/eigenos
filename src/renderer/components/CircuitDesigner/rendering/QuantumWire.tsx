import React from 'react';

export interface QuantumWireProps {
  wire: {
    id: string;
    qubitIndex: number;
    startX: number;
    endX: number;
    y: number;
  };
  particles?: Map<string, { x: number; y: number }>;
  amplitude?: number;
  interactive: boolean;
}

export const QuantumWire: React.FC<QuantumWireProps> = ({
  wire,
  particles,
  amplitude = 0,
  interactive
}) => {
  const { id, qubitIndex, startX, endX, y } = wire;
  
  // Generate wave pattern for quantum amplitude visualization
  const generateWavePath = () => {
    if (!amplitude || amplitude === 0) {
      return `M ${startX} ${y} L ${endX} ${y}`;
    }
    
    const waveAmplitude = amplitude * 8; // Scale for visibility
    const frequency = 0.02; // Wave frequency
    const points: string[] = [`M ${startX} ${y}`];
    
    for (let x = startX; x <= endX; x += 5) {
      const waveY = y + Math.sin(x * frequency) * waveAmplitude;
      points.push(`L ${x} ${waveY}`);
    }
    
    return points.join(' ');
  };
  
  const wavePath = generateWavePath();
  
  return (
    <g className="quantum-wire" data-qubit={qubitIndex}>
      {/* Base wire line */}
      <line
        x1={startX}
        y1={y}
        x2={endX}
        y2={y}
        stroke="var(--text-secondary)"
        strokeWidth="2"
        className="wire-base"
      />
      
      {/* Quantum amplitude wave visualization */}
      {amplitude > 0 && (
        <path
          d={wavePath}
          stroke="var(--quantum-primary)"
          strokeWidth="3"
          fill="none"
          opacity={amplitude}
          className="wire-amplitude"
        >
          <animate
            attributeName="stroke-dasharray"
            values="0,1000;1000,0"
            dur="3s"
            repeatCount="indefinite"
          />
        </path>
      )}
      
      {/* Quantum particles flowing along the wire */}
      {particles && Array.from(particles.entries()).map(([particleId, position]) => (
        <circle
          key={particleId}
          cx={position.x}
          cy={y}
          r="2"
          fill="var(--quantum-primary)"
          opacity="0.8"
          className="wire-particle"
        >
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`0,0; ${endX - startX},0; 0,0`}
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>
      ))}
      
      {/* Qubit label */}
      <text
        x={startX - 20}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fontFamily="'JetBrains Mono', monospace"
        fill="var(--text-secondary)"
        className="wire-label"
      >
        |q{qubitIndex}⟩
      </text>
      
      {/* Measurement endpoint */}
      <rect
        x={endX - 15}
        y={y - 8}
        width="30"
        height="16"
        rx="8"
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth="2"
        className="measurement-box"
      />
      
      <path
        d={`M ${endX - 10} ${y - 3} A 3 3 0 0 1 ${endX - 4} ${y} A 3 3 0 0 1 ${endX - 10} ${y + 3}`}
        stroke="var(--text-secondary)"
        strokeWidth="2"
        fill="none"
        className="measurement-symbol"
      />
      
      {/* Interactive hover area */}
      {interactive && (
        <rect
          x={startX}
          y={y - 10}
          width={endX - startX}
          height="20"
          fill="transparent"
          className="wire-interaction"
          style={{ cursor: 'pointer' }}
        />
      )}
    </g>
  );
};