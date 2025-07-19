import React from 'react';
import { QuantumSurface } from '../../design-system/primitives/QuantumSurface';
import { QuantumButton } from '../../design-system/primitives/QuantumButton';

export interface QuantumJob {
  id: string;
  name: string;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  device: string;
  provider: 'IBM' | 'Google' | 'Rigetti' | 'IonQ';
  circuit: {
    qubits: number;
    gates: number;
    depth: number;
  };
  shots: number;
  estimatedCost: number;
  actualCost?: number;
  progress: number; // 0-100
  queuePosition?: number;
  estimatedWaitTime?: number; // minutes
  startTime?: Date;
  endTime?: Date;
  submitTime: Date;
  results?: {
    counts: Record<string, number>;
    fidelity?: number;
    executionTime?: number;
  };
  error?: string;
}

export interface JobCardProps {
  job: QuantumJob;
  onSelect?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  onRerun?: (jobId: string) => void;
  onViewResults?: (jobId: string) => void;
  selected?: boolean;
  compact?: boolean;
}

const getStatusColor = (status: QuantumJob['status']) => {
  switch (status) {
    case 'pending': return 'var(--status-warning)';
    case 'queued': return 'var(--quantum-secondary)';
    case 'running': return 'var(--quantum-primary)';
    case 'completed': return 'var(--status-success)';
    case 'failed': return 'var(--status-error)';
    case 'cancelled': return 'var(--text-secondary)';
    default: return 'var(--text-secondary)';
  }
};

const getProviderColor = (provider: QuantumJob['provider']) => {
  switch (provider) {
    case 'IBM': return '#0f62fe';
    case 'Google': return '#4285f4';
    case 'Rigetti': return '#00c851';
    case 'IonQ': return '#6c5ce7';
    default: return 'var(--quantum-primary)';
  }
};

const formatDuration = (start?: Date, end?: Date) => {
  if (!start) return '';
  const endTime = end || new Date();
  const diff = endTime.getTime() - start.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

const formatTimeAgo = (date: Date) => {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onSelect,
  onCancel,
  onRerun,
  onViewResults,
  selected = false,
  compact = false
}) => {
  const statusColor = getStatusColor(job.status);
  const providerColor = getProviderColor(job.provider);
  
  const canCancel = ['pending', 'queued'].includes(job.status);
  const canRerun = ['completed', 'failed', 'cancelled'].includes(job.status);
  const hasResults = job.status === 'completed' && job.results;

  return (
    <QuantumSurface
      variant={selected ? "elevated" : "glass"}
      className={`job-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect?.(job.id)}
      style={{
        padding: compact ? '12px' : '16px',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        border: selected ? `2px solid var(--quantum-primary)` : '1px solid var(--border-primary)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Status indicator bar */}
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: compact ? '8px' : '12px' 
      }}>
        <div>
          <h3 style={{ 
            margin: '0 0 4px 0', 
            color: 'var(--text-primary)',
            fontSize: compact ? '14px' : '16px',
            fontWeight: 600
          }}>
            {job.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: providerColor
              }}
            />
            <span style={{ fontSize: compact ? '11px' : '12px', color: 'var(--text-secondary)' }}>
              {job.provider} • {job.device}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
            ID: {job.id.slice(0, 8)}...
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
              color: statusColor,
              marginBottom: '4px'
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: statusColor,
                animation: job.status === 'running' ? 'pulse 2s infinite' : 'none'
              }}
            />
            {job.status}
          </div>
          {job.queuePosition && (
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Queue: #{job.queuePosition}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar for running jobs */}
      {job.status === 'running' && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '4px'
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Progress</span>
            <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
              {job.progress}%
            </span>
          </div>
          <div style={{ 
            height: '6px', 
            background: 'var(--surface-secondary)', 
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div
              style={{
                height: '100%',
                width: `${job.progress}%`,
                background: `linear-gradient(90deg, ${statusColor}, var(--quantum-primary))`,
                borderRadius: '3px',
                transition: 'width 0.3s ease',
                animation: 'progress-shimmer 2s infinite'
              }}
            />
          </div>
        </div>
      )}

      {/* Circuit info */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: compact ? '1fr 1fr' : '1fr 1fr 1fr', 
        gap: compact ? '8px' : '12px', 
        marginBottom: compact ? '8px' : '12px' 
      }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Qubits</div>
          <div style={{ fontSize: compact ? '13px' : '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {job.circuit.qubits}
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Gates</div>
          <div style={{ fontSize: compact ? '13px' : '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {job.circuit.gates}
          </div>
        </div>
        
        {!compact && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Depth</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {job.circuit.depth}
            </div>
          </div>
        )}
      </div>

      {/* Timing and cost info */}
      {!compact && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '12px', 
          marginBottom: '12px',
          fontSize: '11px',
          color: 'var(--text-secondary)'
        }}>
          <div>
            <div>Submitted: {formatTimeAgo(job.submitTime)}</div>
            {job.startTime && (
              <div>Runtime: {formatDuration(job.startTime, job.endTime)}</div>
            )}
            {job.estimatedWaitTime && job.status === 'queued' && (
              <div>Est. wait: {job.estimatedWaitTime}m</div>
            )}
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div>Shots: {job.shots.toLocaleString()}</div>
            <div>
              Cost: ${job.actualCost?.toFixed(4) || job.estimatedCost.toFixed(4)}
              {!job.actualCost && ' (est.)'}
            </div>
          </div>
        </div>
      )}

      {/* Results summary */}
      {hasResults && (
        <div style={{ 
          background: 'var(--surface-secondary)', 
          borderRadius: '6px', 
          padding: '8px',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Results Summary
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>States: </span>
              <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {Object.keys(job.results?.counts || {}).length}
              </span>
            </div>
            {job.results?.fidelity && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Fidelity: </span>
                <span style={{ color: 'var(--status-success)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {(job.results.fidelity * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {job.error && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--status-error)',
          borderRadius: '6px', 
          padding: '8px',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '10px', color: 'var(--status-error)', marginBottom: '2px' }}>
            Error
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
            {job.error}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {hasResults && (
          <QuantumButton
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewResults?.(job.id);
            }}
          >
            View Results
          </QuantumButton>
        )}
        
        {canRerun && (
          <QuantumButton
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRerun?.(job.id);
            }}
          >
            Rerun
          </QuantumButton>
        )}
        
        {canCancel && (
          <QuantumButton
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onCancel?.(job.id);
            }}
          >
            Cancel
          </QuantumButton>
        )}
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
          
          @keyframes progress-shimmer {
            0% {
              background-position: -200px 0;
            }
            100% {
              background-position: calc(200px + 100%) 0;
            }
          }
        `}
      </style>
    </QuantumSurface>
  );
};