import React, { useMemo } from 'react';

export interface ComplexAmplitude {
  real: number;
  imaginary: number;
  magnitude: number;
  phase: number;
}

export interface StateVectorVisualizerProps {
  stateVector: ComplexAmplitude[];
  qubits: number;
  height?: number;
  showPhases?: boolean;
  showAmplitudes?: boolean;
  showProbabilities?: boolean;
  representation?: 'bar' | 'circle' | 'complex-plane';
  className?: string;
}

export const StateVectorVisualizer: React.FC<StateVectorVisualizerProps> = ({
  stateVector,
  qubits,
  height = 300,
  showPhases = true,
  showAmplitudes = true,
  showProbabilities = true,
  representation = 'bar',
  className = ''
}) => {
  const visualizationData = useMemo(() => {
    const maxMagnitude = Math.max(...stateVector.map(amp => amp.magnitude));
    
    return stateVector.map((amplitude, index) => {
      const state = index.toString(2).padStart(qubits, '0');
      const normalizedMagnitude = maxMagnitude > 0 ? amplitude.magnitude / maxMagnitude : 0;
      const probability = amplitude.magnitude * amplitude.magnitude;
      
      return {
        index,
        state,
        amplitude,
        normalizedMagnitude,
        probability,
        color: `hsl(${(amplitude.phase / (2 * Math.PI)) * 360}, 70%, 60%)`
      };
    });
  }, [stateVector, qubits]);

  const chartWidth = Math.max(400, stateVector.length * 40);
  const barWidth = Math.max(15, (chartWidth - 80) / stateVector.length - 5);

  if (representation === 'complex-plane') {
    return renderComplexPlane();
  }

  if (representation === 'circle') {
    return renderCircleRepresentation();
  }

  return renderBarChart();

  function renderBarChart() {
    return (
      <div className={`state-vector-visualizer ${className}`} style={{ width: '100%', height }}>
        <svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
          <defs>
            <linearGradient id="amplitudeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--quantum-primary)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--quantum-primary)" stopOpacity="0.3" />
            </linearGradient>
            
            <filter id="amplitudeGlow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background grid */}
          <g opacity="0.1">
            {[0.2, 0.4, 0.6, 0.8, 1].map(ratio => {
              const y = height - 60 - (height - 100) * ratio;
              return (
                <line
                  key={ratio}
                  x1="40"
                  y1={y}
                  x2={chartWidth - 20}
                  y2={y}
                  stroke="var(--text-secondary)"
                  strokeWidth="1"
                  strokeDasharray="1,1"
                />
              );
            })}
          </g>

          {/* Axes */}
          <line x1="40" y1="40" x2="40" y2={height - 60} stroke="var(--text-secondary)" strokeWidth="2" />
          <line x1="40" y1={height - 60} x2={chartWidth - 20} y2={height - 60} stroke="var(--text-secondary)" strokeWidth="2" />

          {/* Y-axis labels */}
          <g fontSize="9" fontFamily="'JetBrains Mono', monospace" fill="var(--text-secondary)">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map(ratio => {
              const y = height - 60 - (height - 100) * ratio;
              return (
                <text key={ratio} x="35" y={y + 3} textAnchor="end">
                  {ratio.toFixed(1)}
                </text>
              );
            })}
          </g>

          {/* State vector bars */}
          {visualizationData.map((data, index) => {
            const x = 50 + index * (barWidth + 5);
            const amplitudeHeight = data.normalizedMagnitude * (height - 100);
            const probabilityHeight = data.probability * (height - 100);
            const amplitudeY = height - 60 - amplitudeHeight;
            const probabilityY = height - 60 - probabilityHeight;

            return (
              <g key={data.index}>
                {/* Probability bar (background) */}
                {showProbabilities && (
                  <rect
                    x={x}
                    y={probabilityY}
                    width={barWidth}
                    height={probabilityHeight}
                    fill="rgba(96, 239, 255, 0.3)"
                    stroke="rgba(96, 239, 255, 0.5)"
                    strokeWidth="1"
                    rx="1"
                  />
                )}

                {/* Amplitude bar */}
                {showAmplitudes && (
                  <rect
                    x={x + 2}
                    y={amplitudeY}
                    width={barWidth - 4}
                    height={amplitudeHeight}
                    fill={data.color}
                    stroke={data.color}
                    strokeWidth="1"
                    rx="1"
                    filter="url(#amplitudeGlow)"
                    opacity="0.8"
                  >
                    <animate
                      attributeName="height"
                      from="0"
                      to={amplitudeHeight}
                      dur="1s"
                      begin="0s"
                      fill="freeze"
                    />
                  </rect>
                )}

                {/* Phase indicator */}
                {showPhases && data.amplitude.phase !== 0 && (
                  <g>
                    <circle
                      cx={x + barWidth / 2}
                      cy={amplitudeY - 8}
                      r="3"
                      fill={data.color}
                      stroke="white"
                      strokeWidth="1"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={amplitudeY - 15}
                      textAnchor="middle"
                      fontSize="7"
                      fontFamily="'JetBrains Mono', monospace"
                      fill="var(--text-primary)"
                    >
                      {(data.amplitude.phase / Math.PI).toFixed(1)}π
                    </text>
                  </g>
                )}

                {/* State label */}
                <text
                  x={x + barWidth / 2}
                  y={height - 45}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="'JetBrains Mono', monospace"
                  fill="var(--text-primary)"
                  fontWeight="bold"
                >
                  |{data.state}⟩
                </text>

                {/* Decimal index */}
                <text
                  x={x + barWidth / 2}
                  y={height - 30}
                  textAnchor="middle"
                  fontSize="8"
                  fontFamily="'JetBrains Mono', monospace"
                  fill="var(--text-secondary)"
                >
                  {data.index}
                </text>

                {/* Amplitude value */}
                {showAmplitudes && amplitudeHeight > 20 && (
                  <text
                    x={x + barWidth / 2}
                    y={amplitudeY + amplitudeHeight / 2}
                    textAnchor="middle"
                    fontSize="7"
                    fontFamily="'JetBrains Mono', monospace"
                    fill="white"
                    fontWeight="bold"
                    transform={`rotate(-90, ${x + barWidth / 2}, ${amplitudeY + amplitudeHeight / 2})`}
                  >
                    {data.amplitude.magnitude.toFixed(3)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Legend */}
          <g>
            <rect
              x={chartWidth - 160}
              y="10"
              width="150"
              height="80"
              fill="rgba(0, 0, 0, 0.7)"
              stroke="var(--border-primary)"
              strokeWidth="1"
              rx="4"
            />
            
            <text x={chartWidth - 155} y="25" fontSize="10" fontFamily="'JetBrains Mono', monospace" fill="white" fontWeight="bold">
              Legend
            </text>
            
            {showAmplitudes && (
              <g>
                <rect x={chartWidth - 150} y="35" width="10" height="8" fill="var(--quantum-primary)" opacity="0.8" />
                <text x={chartWidth - 135} y="42" fontSize="8" fontFamily="'JetBrains Mono', monospace" fill="white">
                  Amplitude
                </text>
              </g>
            )}
            
            {showProbabilities && (
              <g>
                <rect x={chartWidth - 150} y="50" width="10" height="8" fill="rgba(96, 239, 255, 0.3)" stroke="rgba(96, 239, 255, 0.5)" />
                <text x={chartWidth - 135} y="57" fontSize="8" fontFamily="'JetBrains Mono', monospace" fill="white">
                  Probability
                </text>
              </g>
            )}
            
            {showPhases && (
              <g>
                <circle cx={chartWidth - 145} cy="70" r="3" fill="var(--quantum-primary)" />
                <text x={chartWidth - 135} y="73" fontSize="8" fontFamily="'JetBrains Mono', monospace" fill="white">
                  Phase
                </text>
              </g>
            )}
          </g>

          {/* Axis labels */}
          <text
            x={chartWidth / 2}
            y={height - 10}
            textAnchor="middle"
            fontSize="12"
            fontFamily="'JetBrains Mono', monospace"
            fill="var(--text-secondary)"
            fontWeight="bold"
          >
            Basis States
          </text>

          <text
            x="15"
            y={height / 2}
            textAnchor="middle"
            fontSize="12"
            fontFamily="'JetBrains Mono', monospace"
            fill="var(--text-secondary)"
            fontWeight="bold"
            transform={`rotate(-90, 15, ${height / 2})`}
          >
            Amplitude
          </text>
        </svg>
      </div>
    );
  }

  function renderComplexPlane() {
    const size = Math.min(height, 400);
    const center = size / 2;
    const scale = (size - 80) / 2;

    return (
      <div className={`state-vector-visualizer complex-plane ${className}`} style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--quantum-primary)" />
            </marker>
          </defs>

          {/* Complex plane axes */}
          <line x1="40" y1={center} x2={size - 40} y2={center} stroke="var(--text-secondary)" strokeWidth="1" />
          <line x1={center} y1="40" x2={center} y2={size - 40} stroke="var(--text-secondary)" strokeWidth="1" />

          {/* Unit circle */}
          <circle
            cx={center}
            cy={center}
            r={scale}
            fill="none"
            stroke="rgba(96, 239, 255, 0.3)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />

          {/* Amplitude vectors */}
          {visualizationData.map((data, index) => {
            const x = center + data.amplitude.real * scale;
            const y = center - data.amplitude.imaginary * scale;

            return (
              <g key={data.index}>
                {/* Vector line */}
                <line
                  x1={center}
                  y1={center}
                  x2={x}
                  y2={y}
                  stroke={data.color}
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                  opacity="0.8"
                />

                {/* Amplitude point */}
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={data.color}
                  stroke="white"
                  strokeWidth="1"
                >
                  <title>
                    |{data.state}⟩: {data.amplitude.real.toFixed(3)} + {data.amplitude.imaginary.toFixed(3)}i
                  </title>
                </circle>

                {/* State label */}
                <text
                  x={x + 8}
                  y={y - 8}
                  fontSize="10"
                  fontFamily="'JetBrains Mono', monospace"
                  fill="var(--text-primary)"
                  fontWeight="bold"
                >
                  |{data.state}⟩
                </text>
              </g>
            );
          })}

          {/* Axis labels */}
          <text x={size - 30} y={center + 15} fontSize="12" fontFamily="'JetBrains Mono', monospace" fill="var(--text-secondary)">
            Re
          </text>
          <text x={center + 5} y="30" fontSize="12" fontFamily="'JetBrains Mono', monospace" fill="var(--text-secondary)">
            Im
          </text>
        </svg>
      </div>
    );
  }

  function renderCircleRepresentation() {
    const size = Math.min(height, 400);
    const center = size / 2;
    const radius = (size - 100) / 2;

    return (
      <div className={`state-vector-visualizer circle ${className}`} style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="rgba(96, 239, 255, 0.1)"
            stroke="rgba(96, 239, 255, 0.3)"
            strokeWidth="2"
          />

          {/* State segments */}
          {visualizationData.map((data, index) => {
            const angle = (index / stateVector.length) * 2 * Math.PI - Math.PI / 2;
            const segmentRadius = data.probability * radius;
            
            const x1 = center + Math.cos(angle) * radius;
            const y1 = center + Math.sin(angle) * radius;
            const x2 = center + Math.cos(angle) * segmentRadius;
            const y2 = center + Math.sin(angle) * segmentRadius;

            return (
              <g key={data.index}>
                {/* Probability arc */}
                <path
                  d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${center + Math.cos(angle + 2 * Math.PI / stateVector.length) * radius} ${center + Math.sin(angle + 2 * Math.PI / stateVector.length) * radius} Z`}
                  fill={data.color}
                  fillOpacity={data.probability}
                  stroke={data.color}
                  strokeWidth="1"
                />

                {/* State label */}
                <text
                  x={center + Math.cos(angle) * (radius + 15)}
                  y={center + Math.sin(angle) * (radius + 15)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="10"
                  fontFamily="'JetBrains Mono', monospace"
                  fill="var(--text-primary)"
                  fontWeight="bold"
                >
                  |{data.state}⟩
                </text>
              </g>
            );
          })}

          {/* Center point */}
          <circle cx={center} cy={center} r="3" fill="var(--quantum-primary)" />
        </svg>
      </div>
    );
  }
};