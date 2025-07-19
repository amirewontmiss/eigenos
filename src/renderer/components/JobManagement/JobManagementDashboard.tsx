import React, { useState, useEffect, useMemo } from 'react';
import { JobCard, QuantumJob } from './JobCard';
import { QuantumSurface } from '../../design-system/primitives/QuantumSurface';
import { QuantumButton } from '../../design-system/primitives/QuantumButton';

export interface JobManagementDashboardProps {
  jobs?: QuantumJob[];
  onJobSelect?: (jobId: string) => void;
  onJobCancel?: (jobId: string) => void;
  onJobRerun?: (jobId: string) => void;
  onViewResults?: (jobId: string) => void;
  autoRefresh?: boolean;
}

type SortField = 'submitTime' | 'status' | 'device' | 'progress' | 'cost';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | QuantumJob['status'];
type FilterProvider = 'all' | QuantumJob['provider'];

// Generate mock job data for demonstration
const generateMockJobs = (): QuantumJob[] => [
  {
    id: 'job-001',
    name: 'Bell State Circuit',
    status: 'completed',
    device: 'IBM Sydney',
    provider: 'IBM',
    circuit: { qubits: 2, gates: 3, depth: 2 },
    shots: 1024,
    estimatedCost: 0.15,
    actualCost: 0.12,
    progress: 100,
    submitTime: new Date(Date.now() - 3600000),
    startTime: new Date(Date.now() - 3500000),
    endTime: new Date(Date.now() - 3400000),
    results: {
      counts: { '00': 512, '11': 512 },
      fidelity: 0.987,
      executionTime: 0.025
    }
  },
  {
    id: 'job-002',
    name: 'Quantum Teleportation',
    status: 'running',
    device: 'Google Sycamore',
    provider: 'Google',
    circuit: { qubits: 3, gates: 12, depth: 8 },
    shots: 4096,
    estimatedCost: 0.85,
    progress: 67,
    submitTime: new Date(Date.now() - 1800000),
    startTime: new Date(Date.now() - 900000)
  },
  {
    id: 'job-003',
    name: 'QAOA MaxCut',
    status: 'queued',
    device: 'IonQ Aria',
    provider: 'IonQ',
    circuit: { qubits: 8, gates: 45, depth: 12 },
    shots: 8192,
    estimatedCost: 2.34,
    progress: 0,
    queuePosition: 3,
    estimatedWaitTime: 45,
    submitTime: new Date(Date.now() - 600000)
  },
  {
    id: 'job-004',
    name: 'VQE H2 Molecule',
    status: 'failed',
    device: 'Rigetti Aspen-M-3',
    provider: 'Rigetti',
    circuit: { qubits: 4, gates: 28, depth: 15 },
    shots: 2048,
    estimatedCost: 1.25,
    progress: 0,
    submitTime: new Date(Date.now() - 7200000),
    error: 'Device calibration failed during execution'
  },
  {
    id: 'job-005',
    name: 'Grover Search',
    status: 'pending',
    device: 'IBM Sydney',
    provider: 'IBM',
    circuit: { qubits: 5, gates: 32, depth: 18 },
    shots: 1024,
    estimatedCost: 0.95,
    progress: 0,
    submitTime: new Date(Date.now() - 300000)
  }
];

export const JobManagementDashboard: React.FC<JobManagementDashboardProps> = ({
  jobs: propJobs,
  onJobSelect,
  onJobCancel,
  onJobRerun,
  onViewResults,
  autoRefresh = true
}) => {
  const [jobs, setJobs] = useState<QuantumJob[]>(propJobs || generateMockJobs());
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('submitTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterProvider, setFilterProvider] = useState<FilterProvider>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Auto-refresh job status
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setJobs(prev => prev.map(job => {
        // Simulate job progress for running jobs
        if (job.status === 'running' && job.progress < 100) {
          const newProgress = Math.min(100, job.progress + Math.random() * 15);
          
          // Complete job when progress reaches 100%
          if (newProgress >= 100) {
            return {
              ...job,
              status: 'completed' as const,
              progress: 100,
              endTime: new Date(),
              actualCost: job.estimatedCost * (0.8 + Math.random() * 0.4),
              results: {
                counts: generateMockResults(job.circuit.qubits, job.shots),
                fidelity: 0.9 + Math.random() * 0.1,
                executionTime: Math.random() * 2
              }
            };
          }
          
          return { ...job, progress: newProgress };
        }
        
        // Simulate queue progression
        if (job.status === 'queued' && job.queuePosition && job.queuePosition > 1) {
          const shouldProgress = Math.random() > 0.7;
          if (shouldProgress) {
            const newPosition = job.queuePosition - 1;
            if (newPosition === 0) {
              return {
                ...job,
                status: 'running' as const,
                queuePosition: undefined,
                estimatedWaitTime: undefined,
                startTime: new Date(),
                progress: 0
              };
            }
            return {
              ...job,
              queuePosition: newPosition,
              estimatedWaitTime: newPosition * 15
            };
          }
        }
        
        // Convert pending to queued
        if (job.status === 'pending' && Math.random() > 0.8) {
          return {
            ...job,
            status: 'queued' as const,
            queuePosition: Math.floor(Math.random() * 5) + 1,
            estimatedWaitTime: Math.floor(Math.random() * 60) + 10
          };
        }
        
        return job;
      }));
      
      setLastUpdate(new Date());
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs;

    // Apply filters
    if (filterStatus !== 'all') {
      filtered = filtered.filter(job => job.status === filterStatus);
    }
    
    if (filterProvider !== 'all') {
      filtered = filtered.filter(job => job.provider === filterProvider);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job =>
        job.name.toLowerCase().includes(query) ||
        job.device.toLowerCase().includes(query) ||
        job.id.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'submitTime':
          aVal = a.submitTime.getTime();
          bVal = b.submitTime.getTime();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'device':
          aVal = a.device;
          bVal = b.device;
          break;
        case 'progress':
          aVal = a.progress;
          bVal = b.progress;
          break;
        case 'cost':
          aVal = a.actualCost || a.estimatedCost;
          bVal = b.actualCost || b.estimatedCost;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [jobs, filterStatus, filterProvider, searchQuery, sortField, sortDirection]);

  // Generate mock results
  const generateMockResults = (qubits: number, shots: number) => {
    const results: Record<string, number> = {};
    const numStates = Math.min(2 ** qubits, 8);
    
    for (let i = 0; i < numStates; i++) {
      const state = i.toString(2).padStart(qubits, '0');
      results[state] = Math.floor(Math.random() * shots / 2);
    }
    
    // Normalize to shots
    const total = Object.values(results).reduce((sum, count) => sum + count, 0);
    if (total > 0) {
      Object.keys(results).forEach(state => {
        results[state] = Math.round((results[state] / total) * shots);
      });
    }
    
    return results;
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJob(jobId);
    onJobSelect?.(jobId);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getJobStats = () => {
    const total = jobs.length;
    const running = jobs.filter(j => j.status === 'running').length;
    const queued = jobs.filter(j => j.status === 'queued').length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const failed = jobs.filter(j => j.status === 'failed').length;
    
    return { total, running, queued, completed, failed };
  };

  const stats = getJobStats();

  return (
    <div className="job-management-dashboard" style={{ padding: '16px', maxHeight: '100vh', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '24px' }}>
            Job Management
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Track and manage your quantum computing jobs across all providers
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
          
          <QuantumButton
            variant="secondary"
            size="sm"
            onClick={() => setLastUpdate(new Date())}
          >
            Refresh
          </QuantumButton>
        </div>
      </div>

      {/* Stats Overview */}
      <QuantumSurface variant="glass" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--quantum-primary)' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Jobs</div>
          </div>
          
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--quantum-primary)' }}>
              {stats.running}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Running</div>
          </div>
          
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--status-warning)' }}>
              {stats.queued}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Queued</div>
          </div>
          
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--status-success)' }}>
              {stats.completed}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Completed</div>
          </div>
          
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--status-error)' }}>
              {stats.failed}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Failed</div>
          </div>
        </div>
      </QuantumSurface>

      {/* Filters and Search */}
      <QuantumSurface variant="elevated" style={{ padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '16px', alignItems: 'center' }}>
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                background: 'var(--surface-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-primary)',
              borderRadius: '6px',
              background: 'var(--surface-primary)',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          {/* Provider Filter */}
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value as FilterProvider)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-primary)',
              borderRadius: '6px',
              background: 'var(--surface-primary)',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          >
            <option value="all">All Providers</option>
            <option value="IBM">IBM</option>
            <option value="Google">Google</option>
            <option value="Rigetti">Rigetti</option>
            <option value="IonQ">IonQ</option>
          </select>
          
          {/* Sort Controls */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                background: 'var(--surface-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            >
              <option value="submitTime">Submit Time</option>
              <option value="status">Status</option>
              <option value="device">Device</option>
              <option value="progress">Progress</option>
              <option value="cost">Cost</option>
            </select>
            
            <QuantumButton
              variant="secondary"
              size="sm"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </QuantumButton>
          </div>
        </div>
      </QuantumSurface>

      {/* Job List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredAndSortedJobs.length === 0 ? (
          <QuantumSurface variant="glass" style={{ 
            padding: '48px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ fontSize: '48px', opacity: 0.3 }}>📋</div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>No Jobs Found</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {searchQuery || filterStatus !== 'all' || filterProvider !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'No quantum jobs have been submitted yet'
              }
            </p>
          </QuantumSurface>
        ) : (
          filteredAndSortedJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              selected={selectedJob === job.id}
              onSelect={handleJobSelect}
              onCancel={onJobCancel}
              onRerun={onJobRerun}
              onViewResults={onViewResults}
            />
          ))
        )}
      </div>
    </div>
  );
};