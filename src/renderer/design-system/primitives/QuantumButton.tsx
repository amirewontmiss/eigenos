import React, { ReactNode } from 'react';
import './QuantumButton.css';

export interface QuantumButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  icon?: string | ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  quantumState?: 'stable' | 'superposition' | 'entangled';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
  tooltip?: string;
}

export const QuantumButton: React.FC<QuantumButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  quantumState = 'stable',
  onClick,
  type = 'button',
  className = '',
  style = {},
  tooltip
}) => {
  const buttonClasses = [
    'quantum-button',
    `quantum-button--${variant}`,
    `quantum-button--${size}`,
    `quantum-button--state-${quantumState}`,
    loading ? 'quantum-button--loading' : '',
    disabled ? 'quantum-button--disabled' : '',
    icon ? 'quantum-button--with-icon' : '',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;
    onClick?.(event);
  };

  const renderIcon = () => {
    if (loading) {
      return <div className="quantum-button-spinner" />;
    }
    
    if (typeof icon === 'string') {
      return <span className="quantum-button-icon">{icon}</span>;
    }
    
    return icon ? <span className="quantum-button-icon">{icon}</span> : null;
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      style={style}
      title={tooltip}
      aria-label={tooltip}
    >
      {/* Quantum field background */}
      <div className="quantum-button-field" />
      
      {/* Button content */}
      <div className="quantum-button-content">
        {icon && iconPosition === 'left' && renderIcon()}
        
        <span className="quantum-button-text">
          {children}
        </span>
        
        {icon && iconPosition === 'right' && renderIcon()}
      </div>
      
      {/* Quantum state indicator */}
      {quantumState !== 'stable' && (
        <div className={`quantum-state-indicator quantum-state-indicator--${quantumState}`} />
      )}
      
      {/* Interaction ripple effect */}
      <div className="quantum-button-ripple" />
    </button>
  );
};