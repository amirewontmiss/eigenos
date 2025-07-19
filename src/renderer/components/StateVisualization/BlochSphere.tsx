import React, { useRef, useEffect, useMemo } from 'react';

export interface BlochSphereProps {
  state: {
    alpha: number; // amplitude of |0⟩
    beta: number;  // amplitude of |1⟩
    phase?: number; // global phase
  };
  size?: number;
  showAxes?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
  animate?: boolean;
  className?: string;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface CartesianCoordinates {
  x: number;
  y: number;
  z: number;
}

export const BlochSphere: React.FC<BlochSphereProps> = ({
  state,
  size = 200,
  showAxes = true,
  showLabels = true,
  interactive = false,
  animate = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Convert quantum state to Bloch sphere coordinates
  const blochCoordinates = useMemo((): CartesianCoordinates => {
    const { alpha, beta } = state;
    
    // Normalize the state
    const norm = Math.sqrt(alpha * alpha + beta * beta);
    if (norm === 0) return { x: 0, y: 0, z: 1 };
    
    const normalizedAlpha = alpha / norm;
    const normalizedBeta = beta / norm;
    
    // Convert to Bloch sphere coordinates
    // |ψ⟩ = α|0⟩ + β|1⟩
    // Bloch vector: (x, y, z) where
    // x = 2 * Re(α* β)
    // y = 2 * Im(α* β)  
    // z = |α|² - |β|²
    
    const alphaConj = normalizedAlpha; // assuming real for simplicity
    const x = 2 * alphaConj * normalizedBeta;
    const y = 0; // assuming real coefficients for this example
    const z = normalizedAlpha * normalizedAlpha - normalizedBeta * normalizedBeta;
    
    return { x, y, z };
  }, [state]);

  // Convert 3D coordinates to 2D screen coordinates
  const project3DTo2D = (point: Point3D, rotation: { x: number; y: number }): { x: number; y: number } => {
    const { x, y, z } = point;
    const { x: rotX, y: rotY } = rotation;
    
    // Apply rotation
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    
    // Rotate around X axis
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    
    // Rotate around Y axis
    const x2 = x * cosY + z1 * sinY;
    const z2 = -x * sinY + z1 * cosY;
    
    // Project to 2D (simple orthographic projection)
    const scale = size * 0.4;
    const centerX = size / 2;
    const centerY = size / 2;
    
    return {
      x: centerX + x2 * scale,
      y: centerY - y1 * scale // Flip Y for screen coordinates
    };
  };

  // Generate sphere wireframe
  const generateSphereWireframe = (rotation: { x: number; y: number }) => {
    const lines: string[] = [];
    const radius = 1;
    const segments = 16;
    
    // Latitude lines
    for (let lat = -Math.PI/2; lat <= Math.PI/2; lat += Math.PI/8) {
      const points: { x: number; y: number }[] = [];
      for (let lon = 0; lon <= Math.PI * 2; lon += Math.PI * 2 / segments) {
        const x = radius * Math.cos(lat) * Math.cos(lon);
        const y = radius * Math.sin(lat);
        const z = radius * Math.cos(lat) * Math.sin(lon);
        
        const projected = project3DTo2D({ x, y, z }, rotation);
        points.push(projected);
      }
      
      const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      lines.push(pathData);
    }
    
    // Longitude lines
    for (let lon = 0; lon < Math.PI * 2; lon += Math.PI/4) {
      const points: { x: number; y: number }[] = [];
      for (let lat = -Math.PI/2; lat <= Math.PI/2; lat += Math.PI/32) {
        const x = radius * Math.cos(lat) * Math.cos(lon);
        const y = radius * Math.sin(lat);
        const z = radius * Math.cos(lat) * Math.sin(lon);
        
        const projected = project3DTo2D({ x, y, z }, rotation);
        points.push(projected);
      }
      
      const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      lines.push(pathData);
    }
    
    return lines;
  };

  // Generate axes
  const generateAxes = (rotation: { x: number; y: number }) => {
    const axisLength = 1.2;
    const axes = [
      { start: { x: -axisLength, y: 0, z: 0 }, end: { x: axisLength, y: 0, z: 0 }, color: '#ff4757', label: 'X' },
      { start: { x: 0, y: -axisLength, z: 0 }, end: { x: 0, y: axisLength, z: 0 }, color: '#2ed573', label: 'Y' },
      { start: { x: 0, y: 0, z: -axisLength }, end: { x: 0, y: 0, z: axisLength }, color: '#1e90ff', label: 'Z' }
    ];
    
    return axes.map(axis => ({
      ...axis,
      start2D: project3DTo2D(axis.start, rotation),
      end2D: project3DTo2D(axis.end, rotation),
      label2D: project3DTo2D({ 
        x: axis.end.x * 1.15, 
        y: axis.end.y * 1.15, 
        z: axis.end.z * 1.15 
      }, rotation)
    }));
  };

  const [rotation, setRotation] = React.useState({ x: 0.2, y: 0.3 });
  const [isRotating, setIsRotating] = React.useState(animate);

  // Auto-rotation animation
  useEffect(() => {
    if (!isRotating) return;
    
    const animate = () => {
      setRotation(prev => ({
        x: prev.x,
        y: prev.y + 0.01
      }));
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRotating]);

  // Mouse interaction
  const handleMouseDown = (event: React.MouseEvent) => {
    if (!interactive) return;
    
    setIsRotating(false);
    const startX = event.clientX;
    const startY = event.clientY;
    const startRotation = { ...rotation };
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      setRotation({
        x: startRotation.x + deltaY * 0.01,
        y: startRotation.y + deltaX * 0.01
      });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const sphereLines = generateSphereWireframe(rotation);
  const axes = generateAxes(rotation);
  const stateVector = project3DTo2D(blochCoordinates, rotation);

  return (
    <div 
      ref={containerRef}
      className={`bloch-sphere ${className}`}
      style={{ 
        width: size, 
        height: size, 
        position: 'relative',
        cursor: interactive ? 'grab' : 'default',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      <svg 
        width={size} 
        height={size} 
        style={{ 
          background: 'transparent',
          overflow: 'visible'
        }}
      >
        <defs>
          <radialGradient id="sphereGradient">
            <stop offset="0%" stopColor="rgba(96, 239, 255, 0.1)" />
            <stop offset="100%" stopColor="rgba(96, 239, 255, 0.05)" />
          </radialGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Sphere background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.4}
          fill="url(#sphereGradient)"
          stroke="rgba(96, 239, 255, 0.3)"
          strokeWidth="1"
        />
        
        {/* Sphere wireframe */}
        {sphereLines.map((line, index) => (
          <path
            key={index}
            d={line}
            fill="none"
            stroke="rgba(96, 239, 255, 0.2)"
            strokeWidth="1"
          />
        ))}
        
        {/* Coordinate axes */}
        {showAxes && axes.map((axis, index) => (
          <g key={index}>
            <line
              x1={axis.start2D.x}
              y1={axis.start2D.y}
              x2={axis.end2D.x}
              y2={axis.end2D.y}
              stroke={axis.color}
              strokeWidth="2"
              opacity="0.7"
            />
            
            {/* Axis labels */}
            {showLabels && (
              <text
                x={axis.label2D.x}
                y={axis.label2D.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="14"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="bold"
                fill={axis.color}
              >
                {axis.label}
              </text>
            )}
            
            {/* Arrow heads */}
            <polygon
              points={`${axis.end2D.x},${axis.end2D.y} ${axis.end2D.x-5},${axis.end2D.y-3} ${axis.end2D.x-5},${axis.end2D.y+3}`}
              fill={axis.color}
              opacity="0.7"
            />
          </g>
        ))}
        
        {/* State vector */}
        <g>
          {/* Vector line */}
          <line
            x1={size / 2}
            y1={size / 2}
            x2={stateVector.x}
            y2={stateVector.y}
            stroke="var(--quantum-primary)"
            strokeWidth="3"
            filter="url(#glow)"
          />
          
          {/* Vector arrow */}
          <polygon
            points={`${stateVector.x},${stateVector.y} ${stateVector.x-8},${stateVector.y-4} ${stateVector.x-8},${stateVector.y+4}`}
            fill="var(--quantum-primary)"
            filter="url(#glow)"
          />
          
          {/* State point */}
          <circle
            cx={stateVector.x}
            cy={stateVector.y}
            r="6"
            fill="var(--quantum-primary)"
            stroke="white"
            strokeWidth="2"
            filter="url(#glow)"
          >
            <animate
              attributeName="r"
              values="6;8;6"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
        
        {/* Basis state labels */}
        {showLabels && (
          <g>
            <text
              x={size / 2}
              y={size * 0.1}
              textAnchor="middle"
              fontSize="16"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="bold"
              fill="var(--text-primary)"
            >
              |0⟩
            </text>
            
            <text
              x={size / 2}
              y={size * 0.95}
              textAnchor="middle"
              fontSize="16"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="bold"
              fill="var(--text-primary)"
            >
              |1⟩
            </text>
          </g>
        )}
      </svg>
      
      {/* State information overlay */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '6px',
        padding: '8px',
        fontSize: '11px',
        fontFamily: 'JetBrains Mono, monospace',
        color: 'white',
        lineHeight: '1.4'
      }}>
        <div>α = {state.alpha.toFixed(3)}</div>
        <div>β = {state.beta.toFixed(3)}</div>
        <div>|α|² = {(state.alpha * state.alpha).toFixed(3)}</div>
        <div>|β|² = {(state.beta * state.beta).toFixed(3)}</div>
      </div>
      
      {/* Interactive controls */}
      {interactive && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <button
            onClick={() => setIsRotating(!isRotating)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-primary)',
              background: 'var(--surface-secondary)',
              color: 'var(--text-primary)',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            {isRotating ? 'Pause' : 'Rotate'}
          </button>
          
          <button
            onClick={() => setRotation({ x: 0.2, y: 0.3 })}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-primary)',
              background: 'var(--surface-secondary)',
              color: 'var(--text-primary)',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
};