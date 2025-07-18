// Global type definitions for QuantumOS Renderer

declare global {
  interface Window {
    quantumOS: {
      // Quantum circuit operations
      createCircuit: (qubits: number, name?: string) => Promise<string>;
      runCircuit: (circuitData: any, deviceId?: string) => Promise<any>;
      optimizeCircuit: (circuitData: any, options?: any) => Promise<any>;

      // Device management
      getDevices: () => Promise<any[]>;
      getDeviceStatus: (deviceId: string) => Promise<any>;

      // Provider management
      getProviders: () => Promise<string[]>;
      authenticateProvider: (providerId: string, credentials: any) => Promise<boolean>;

      // Job management
      getJobs: () => Promise<any[]>;
      cancelJob: (jobId: string) => Promise<boolean>;

      // Configuration
      getConfig: () => Promise<any>;
      setConfig: (config: any) => Promise<void>;

      // File operations
      saveCircuit: (circuitData: any, filePath?: string) => Promise<string | null>;
      loadCircuit: (filePath?: string) => Promise<any | null>;

      // Event listeners
      onQuantumOSReady: (callback: (data: any) => void) => void;
      onMenuAction: (action: string, callback: () => void) => void;
      removeListener: (channel: string, callback: any) => void;
      removeAllListeners: (channel: string) => void;
    };

    platform: {
      node: string;
      chrome: string;
      electron: string;
      platform: string;
      arch: string;
    };

    nodeAPI: {
      path: {
        join: (...paths: string[]) => string;
        basename: (path: string) => string;
        dirname: (path: string) => string;
        extname: (path: string) => string;
      };
    };
  }

  interface ImportMeta {
    hot?: {
      accept: (dep?: string, callback?: () => void) => void;
    };
  }

  declare module '*.module.css' {
    const classes: { [key: string]: string };
    export default classes;
  }

  declare module '*.css';
  declare module '*.scss';
  declare module '*.sass';
  declare module '*.png';
  declare module '*.jpg';
  declare module '*.jpeg';
  declare module '*.gif';
  declare module '*.svg';
  declare module '*.woff';
  declare module '*.woff2';
  declare module '*.eot';
  declare module '*.ttf';
  declare module '*.otf';
}

// React-specific type extensions
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

// Quantum-specific types for the renderer
export interface QuantumCircuitData {
  id: string;
  name: string;
  qubits: number;
  gates: QuantumGateData[];
  measurements: QuantumMeasurementData[];
  metadata?: Record<string, any>;
}

export interface QuantumGateData {
  id: string;
  type: string;
  qubits: number[];
  parameters?: number[];
  label?: string;
}

export interface QuantumMeasurementData {
  qubit: number;
  classicalBit: number;
}

export interface QuantumDeviceData {
  id: string;
  name: string;
  provider: string;
  status: 'online' | 'offline' | 'maintenance' | 'calibrating' | 'error';
  qubits: number;
  connectivity: Array<[number, number]>;
  basisGates: string[];
  maxShots: number;
  queueLength: number;
  avgExecutionTime: number;
  fidelity: number;
  lastCalibration: string;
  costPerShot: number;
}

export interface QuantumJobData {
  id: string;
  name: string;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  circuit: QuantumCircuitData;
  device: string;
  shots: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  results?: QuantumResultData;
  error?: string;
  estimatedCost: number;
}

export interface QuantumResultData {
  counts: Record<string, number>;
  probabilities: Record<string, number>;
  shots: number;
  executionTime: number;
  queueTime: number;
  success: boolean;
  fidelity?: number;
  metadata?: Record<string, any>;
}

export interface QuantumProviderData {
  id: string;
  name: string;
  version: string;
  authenticated: boolean;
  capabilities: {
    maxQubits: number;
    supportedGates: string[];
    supportsSimulation: boolean;
    supportsHardware: boolean;
  };
  devices: QuantumDeviceData[];
}

export interface QuantumSystemHealth {
  overall: 'healthy' | 'warning' | 'critical' | 'unknown';
  uptime: number;
  totalDevices: number;
  onlineDevices: number;
  totalJobs: number;
  activeJobs: number;
  avgQueueTime: number;
  systemLoad: number;
  memoryUsage: number;
  lastUpdate: string;
}

export interface QuantumMetrics {
  throughput: {
    jobsPerHour: number;
    shotsPerSecond: number;
    trend: 'up' | 'down' | 'stable';
  };
  fidelity: {
    average: number;
    minimum: number;
    maximum: number;
    trend: 'up' | 'down' | 'stable';
  };
  utilization: {
    deviceUtilization: number;
    queueUtilization: number;
    trend: 'up' | 'down' | 'stable';
  };
  errors: {
    rate: number;
    types: Record<string, number>;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface QuantumAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  acknowledged: boolean;
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
}

export {};