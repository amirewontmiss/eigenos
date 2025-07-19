import React, { ReactNode } from 'react';
import './QuantumSurface.css';

export interface QuantumSurfaceProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'elevated' | 'floating';
  quantumField?: 'stable' | 'superposition' | 'entangled' | 'decoherent';
  depth?: 1 | 2 | 3 | 4 | 5;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const QuantumSurface: React.FC<QuantumSurfaceProps> = ({
  children,
  variant = 'primary',
  quantumField = 'stable',
  depth = 1,
  interactive = false,
  className = '',
  style = {}
}) => {
  const surfaceClasses = [
    'quantum-surface',
    `quantum-surface--${variant}`,
    `quantum-surface--depth-${depth}`,
    `quantum-field--${quantumField}`,
    interactive ? 'quantum-surface--interactive' : '',
    className
  ].filter(Boolean).join(' ');

  const surfaceStyles: React.CSSProperties = {
    '--surface-depth': depth,
    '--surface-blur': `${depth * 8}px`,
    '--surface-opacity': 0.05 + depth * 0.02,
    '--border-opacity': 0.1 + depth * 0.05,
    '--border-radius': `${8 + depth * 2}px`,
    '--shadow-distance': `${depth * 4}px`,
    '--shadow-blur': `${depth * 16}px`,
    ...style
  } as React.CSSProperties;

  return (
    <div className={surfaceClasses} style={surfaceStyles}>
      {quantumField !== 'stable' && (
        <div className={`quantum-field-overlay quantum-field-overlay--${quantumField}`} />
      )}
      <div className="quantum-surface-content">
        {children}
      </div>
      {interactive && <div className="quantum-surface-interaction-layer" />}
    </div>
  );
};