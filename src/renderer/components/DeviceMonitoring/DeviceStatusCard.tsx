import React from 'react';
import { QuantumSurface } from '../../design-system/primitives/QuantumSurface';

export interface DeviceStatus {
  id: string;
  name: string;
  provider: 'IBM' | 'Google' | 'Rigetti' | 'IonQ';
  status: 'online' | 'offline' | 'maintenance' | 'busy';
  qubits: number;
  connectivity: 'full' | 'limited' | 'linear';
  availability: number; // 0-1
  waitTime: number; // minutes
  fidelity: {
    single: number; // 0-1
    two: number; // 0-1
  };
  error_rates: {
    readout: number;
    gate: number;
    coherence: number;
  };
  temperature: number; // mK
  lastUpdated: Date;
}

export interface DeviceStatusCardProps {
  device: DeviceStatus;
  onSelect?: (deviceId: string) => void;
  selected?: boolean;
  showDetails?: boolean;
}

const getStatusColor = (status: DeviceStatus['status']) => {
  switch (status) {
    case 'online': return 'var(--status-success)';
    case 'offline': return 'var(--status-error)';
    case 'maintenance': return 'var(--status-warning)';
    case 'busy': return 'var(--quantum-secondary)';
    default: return 'var(--text-secondary)';
  }
};

const getProviderColor = (provider: DeviceStatus['provider']) => {
  switch (provider) {
    case 'IBM': return '#0f62fe';
    case 'Google': return '#4285f4';
    case 'Rigetti': return '#00c851';
    case 'IonQ': return '#6c5ce7';
    default: return 'var(--quantum-primary)';
  }
};

const formatUptime = (lastUpdated: Date) => {
  const diff = Date.now() - lastUpdated.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
};

export const DeviceStatusCard: React.FC<DeviceStatusCardProps> = ({
  device,
  onSelect,
  selected = false,
  showDetails = false
}) => {
  const statusColor = getStatusColor(device.status);
  const providerColor = getProviderColor(device.provider);

  return (
    <QuantumSurface
      variant={selected ? "elevated" : "glass"}
      className={`device-status-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect?.(device.id)}
      style={{
        padding: '16px',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        border: selected ? `2px solid var(--quantum-primary)` : '1px solid var(--border-primary)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Status indicator */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: statusColor,
          opacity: 0.8
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h3 style={{ 
            margin: '0 0 4px 0', 
            color: 'var(--text-primary)',
            fontSize: '16px',
            fontWeight: 600
          }}>
            {device.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: providerColor
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {device.provider}
            </span>
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '12px',
              background: `${statusColor}20`,
              border: `1px solid ${statusColor}`,
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: statusColor
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: statusColor,
                animation: device.status === 'online' ? 'pulse 2s infinite' : 'none'
              }}
            />
            {device.status}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
            Qubits
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {device.qubits}
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
            Availability
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {Math.round(device.availability * 100)}%
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
            Wait Time
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {device.waitTime < 60 ? `${device.waitTime}m` : `${Math.round(device.waitTime / 60)}h`}
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
            Fidelity
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {Math.round(device.fidelity.single * 100)}%
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      {showDetails && (
        <div style={{ 
          borderTop: '1px solid var(--border-primary)', 
          paddingTop: '12px',
          marginTop: '12px'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '12px', 
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Error Rates
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Readout</div>
                <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                  {(device.error_rates.readout * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Gate</div>
                <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                  {(device.error_rates.gate * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Coherence</div>
                <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                  {(device.error_rates.coherence * 100).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '12px', 
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              System Status
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Temperature</div>
                <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                  {device.temperature.toFixed(1)} mK
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Connectivity</div>
                <div style={{ fontSize: '12px', textTransform: 'capitalize' }}>
                  {device.connectivity}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Last Updated: {formatUptime(device.lastUpdated)}
            </div>
          </div>
        </div>
      )}

      {/* Performance indicator */}
      <div style={{ 
        position: 'absolute',
        bottom: '4px',
        left: '16px',
        right: '16px',
        height: '2px',
        background: 'var(--surface-secondary)',
        borderRadius: '1px',
        overflow: 'hidden'
      }}>
        <div
          style={{
            height: '100%',
            width: `${device.availability * 100}%`,
            background: `linear-gradient(90deg, ${statusColor}, var(--quantum-primary))`,
            borderRadius: '1px',
            transition: 'width 0.3s ease'
          }}
        />
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
    </QuantumSurface>
  );
};