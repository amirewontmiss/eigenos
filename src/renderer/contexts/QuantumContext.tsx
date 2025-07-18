import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Types for Quantum Context
export interface QuantumDevice {
  id: string;
  name: string;
  provider: string;
  status: 'online' | 'offline' | 'maintenance' | 'calibrating' | 'error';
  qubits: number;
  queueLength: number;
  avgExecutionTime: number;
  fidelity: number;
  lastCalibration: Date;
}

export interface QuantumJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  device: string;
  shots: number;
  createdAt: Date;
  completedAt?: Date;
  results?: QuantumResults;
  error?: string;
}

export interface QuantumResults {
  counts: Record<string, number>;
  executionTime: number;
  shots: number;
  success: boolean;
}

export interface CircuitState {
  id: string;
  name: string;
  qubits: number;
  gates: QuantumGateState[];
  measurements: MeasurementState[];
  isModified: boolean;
  lastSaved?: Date;
}

export interface QuantumGateState {
  id: string;
  type: string;
  qubits: number[];
  parameters?: number[];
  position: { x: number; y: number };
}

export interface MeasurementState {
  qubit: number;
  classicalBit: number;
}

export interface QuantumState {
  devices: QuantumDevice[];
  jobs: QuantumJob[];
  currentCircuit: CircuitState | null;
  circuits: CircuitState[];
  isConnected: boolean;
  isInitialized: boolean;
  selectedDevice: string | null;
  providers: string[];
  systemHealth: {
    overall: 'healthy' | 'warning' | 'error';
    metrics: {
      totalJobs: number;
      activeDevices: number;
      avgQueueTime: number;
      systemUptime: number;
    };
  };
}

// Action Types
export type QuantumAction =
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_DEVICES'; payload: QuantumDevice[] }
  | { type: 'UPDATE_DEVICE'; payload: { id: string; updates: Partial<QuantumDevice> } }
  | { type: 'SET_JOBS'; payload: QuantumJob[] }
  | { type: 'ADD_JOB'; payload: QuantumJob }
  | { type: 'UPDATE_JOB'; payload: { id: string; updates: Partial<QuantumJob> } }
  | { type: 'SET_CURRENT_CIRCUIT'; payload: CircuitState | null }
  | { type: 'UPDATE_CURRENT_CIRCUIT'; payload: Partial<CircuitState> }
  | { type: 'ADD_CIRCUIT'; payload: CircuitState }
  | { type: 'UPDATE_CIRCUIT'; payload: { id: string; updates: Partial<CircuitState> } }
  | { type: 'DELETE_CIRCUIT'; payload: string }
  | { type: 'SELECT_DEVICE'; payload: string | null }
  | { type: 'SET_PROVIDERS'; payload: string[] }
  | { type: 'UPDATE_SYSTEM_HEALTH'; payload: QuantumState['systemHealth'] };

// Initial State
const initialState: QuantumState = {
  devices: [],
  jobs: [],
  currentCircuit: null,
  circuits: [],
  isConnected: false,
  isInitialized: false,
  selectedDevice: null,
  providers: [],
  systemHealth: {
    overall: 'healthy',
    metrics: {
      totalJobs: 0,
      activeDevices: 0,
      avgQueueTime: 0,
      systemUptime: 0
    }
  }
};

// Reducer
function quantumReducer(state: QuantumState, action: QuantumAction): QuantumState {
  switch (action.type) {
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
      
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
      
    case 'SET_DEVICES':
      return { ...state, devices: action.payload };
      
    case 'UPDATE_DEVICE':
      return {
        ...state,
        devices: state.devices.map(device =>
          device.id === action.payload.id
            ? { ...device, ...action.payload.updates }
            : device
        )
      };
      
    case 'SET_JOBS':
      return { ...state, jobs: action.payload };
      
    case 'ADD_JOB':
      return { ...state, jobs: [...state.jobs, action.payload] };
      
    case 'UPDATE_JOB':
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === action.payload.id
            ? { ...job, ...action.payload.updates }
            : job
        )
      };
      
    case 'SET_CURRENT_CIRCUIT':
      return { ...state, currentCircuit: action.payload };
      
    case 'UPDATE_CURRENT_CIRCUIT':
      return {
        ...state,
        currentCircuit: state.currentCircuit
          ? { ...state.currentCircuit, ...action.payload }
          : null
      };
      
    case 'ADD_CIRCUIT':
      return { ...state, circuits: [...state.circuits, action.payload] };
      
    case 'UPDATE_CIRCUIT':
      return {
        ...state,
        circuits: state.circuits.map(circuit =>
          circuit.id === action.payload.id
            ? { ...circuit, ...action.payload.updates }
            : circuit
        )
      };
      
    case 'DELETE_CIRCUIT':
      return {
        ...state,
        circuits: state.circuits.filter(circuit => circuit.id !== action.payload)
      };
      
    case 'SELECT_DEVICE':
      return { ...state, selectedDevice: action.payload };
      
    case 'SET_PROVIDERS':
      return { ...state, providers: action.payload };
      
    case 'UPDATE_SYSTEM_HEALTH':
      return { ...state, systemHealth: action.payload };
      
    default:
      return state;
  }
}

// Context
const QuantumContext = createContext<{
  state: QuantumState;
  dispatch: React.Dispatch<QuantumAction>;
} | null>(null);

// Provider Component
interface QuantumProviderProps {
  children: ReactNode;
}

export const QuantumProvider: React.FC<QuantumProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(quantumReducer, initialState);

  // Initialize QuantumOS connection
  useEffect(() => {
    const initializeQuantumOS = async () => {
      try {
        // Wait for QuantumOS to be ready
        if (window.quantumOS) {
          // Register for QuantumOS ready event
          window.quantumOS.onQuantumOSReady((data: any) => {
            dispatch({ type: 'SET_INITIALIZED', payload: true });
            dispatch({ type: 'SET_CONNECTED', payload: true });
            dispatch({ type: 'SET_PROVIDERS', payload: data.providers || [] });
            dispatch({ type: 'SET_DEVICES', payload: data.devices || [] });
          });

          // Get initial data
          const providers = await window.quantumOS.getProviders();
          const devices = await window.quantumOS.getDevices();
          const jobs = await window.quantumOS.getJobs();

          dispatch({ type: 'SET_PROVIDERS', payload: providers });
          dispatch({ type: 'SET_DEVICES', payload: devices });
          dispatch({ type: 'SET_JOBS', payload: jobs });
          dispatch({ type: 'SET_INITIALIZED', payload: true });
          dispatch({ type: 'SET_CONNECTED', payload: true });
        }
      } catch (error) {
        console.error('Failed to initialize QuantumOS:', error);
        dispatch({ type: 'SET_CONNECTED', payload: false });
      }
    };

    initializeQuantumOS();
  }, []);

  // Periodic updates
  useEffect(() => {
    if (!state.isConnected) return;

    const updateInterval = setInterval(async () => {
      try {
        // Update devices
        const devices = await window.quantumOS?.getDevices();
        if (devices) {
          dispatch({ type: 'SET_DEVICES', payload: devices });
        }

        // Update jobs
        const jobs = await window.quantumOS?.getJobs();
        if (jobs) {
          dispatch({ type: 'SET_JOBS', payload: jobs });
        }

        // Update system health
        const activeDevices = devices?.filter((d: QuantumDevice) => d.status === 'online').length || 0;
        const totalJobs = jobs?.length || 0;
        const avgQueueTime = devices?.reduce((acc: number, d: QuantumDevice) => acc + d.queueLength, 0) / (devices?.length || 1) || 0;

        dispatch({
          type: 'UPDATE_SYSTEM_HEALTH',
          payload: {
            overall: activeDevices > 0 ? 'healthy' : 'warning',
            metrics: {
              totalJobs,
              activeDevices,
              avgQueueTime,
              systemUptime: Date.now() // Simplified uptime
            }
          }
        });
      } catch (error) {
        console.error('Failed to update quantum state:', error);
        dispatch({ type: 'SET_CONNECTED', payload: false });
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(updateInterval);
  }, [state.isConnected]);

  return (
    <QuantumContext.Provider value={{ state, dispatch }}>
      {children}
    </QuantumContext.Provider>
  );
};

// Hook to use Quantum Context
export const useQuantum = () => {
  const context = useContext(QuantumContext);
  if (!context) {
    throw new Error('useQuantum must be used within a QuantumProvider');
  }
  return context;
};

// Additional hooks for specific quantum operations
export const useQuantumDevices = () => {
  const { state, dispatch } = useQuantum();
  
  const selectDevice = (deviceId: string | null) => {
    dispatch({ type: 'SELECT_DEVICE', payload: deviceId });
  };
  
  const refreshDevices = async () => {
    try {
      const devices = await window.quantumOS?.getDevices();
      if (devices) {
        dispatch({ type: 'SET_DEVICES', payload: devices });
      }
    } catch (error) {
      console.error('Failed to refresh devices:', error);
    }
  };
  
  return {
    devices: state.devices,
    selectedDevice: state.selectedDevice,
    selectDevice,
    refreshDevices
  };
};

export const useQuantumJobs = () => {
  const { state, dispatch } = useQuantum();
  
  const submitJob = async (circuitData: any, deviceId?: string) => {
    try {
      const result = await window.quantumOS?.runCircuit(circuitData, deviceId);
      if (result) {
        const job: QuantumJob = {
          id: result.jobId,
          name: `Job ${Date.now()}`,
          status: result.status as any,
          device: deviceId || state.selectedDevice || '',
          shots: 1024,
          createdAt: new Date()
        };
        dispatch({ type: 'ADD_JOB', payload: job });
        return result;
      }
    } catch (error) {
      console.error('Failed to submit job:', error);
      throw error;
    }
  };
  
  const cancelJob = async (jobId: string) => {
    try {
      const success = await window.quantumOS?.cancelJob(jobId);
      if (success) {
        dispatch({
          type: 'UPDATE_JOB',
          payload: { id: jobId, updates: { status: 'cancelled' } }
        });
      }
      return success;
    } catch (error) {
      console.error('Failed to cancel job:', error);
      return false;
    }
  };
  
  return {
    jobs: state.jobs,
    submitJob,
    cancelJob
  };
};

export const useQuantumCircuit = () => {
  const { state, dispatch } = useQuantum();
  
  const createCircuit = (qubits: number, name?: string) => {
    const circuit: CircuitState = {
      id: `circuit_${Date.now()}`,
      name: name || `Circuit ${state.circuits.length + 1}`,
      qubits,
      gates: [],
      measurements: [],
      isModified: false
    };
    
    dispatch({ type: 'ADD_CIRCUIT', payload: circuit });
    dispatch({ type: 'SET_CURRENT_CIRCUIT', payload: circuit });
    
    return circuit;
  };
  
  const saveCircuit = async (circuitData?: any) => {
    if (!state.currentCircuit) return null;
    
    try {
      const filePath = await window.quantumOS?.saveCircuit(
        circuitData || state.currentCircuit
      );
      
      if (filePath) {
        dispatch({
          type: 'UPDATE_CURRENT_CIRCUIT',
          payload: { isModified: false, lastSaved: new Date() }
        });
      }
      
      return filePath;
    } catch (error) {
      console.error('Failed to save circuit:', error);
      throw error;
    }
  };
  
  const loadCircuit = async (filePath?: string) => {
    try {
      const circuitData = await window.quantumOS?.loadCircuit(filePath);
      if (circuitData) {
        const circuit: CircuitState = {
          id: `circuit_${Date.now()}`,
          name: circuitData.name || 'Loaded Circuit',
          qubits: circuitData.qubits || 2,
          gates: circuitData.gates || [],
          measurements: circuitData.measurements || [],
          isModified: false,
          lastSaved: new Date()
        };
        
        dispatch({ type: 'ADD_CIRCUIT', payload: circuit });
        dispatch({ type: 'SET_CURRENT_CIRCUIT', payload: circuit });
        
        return circuit;
      }
    } catch (error) {
      console.error('Failed to load circuit:', error);
      throw error;
    }
  };
  
  const optimizeCircuit = async (options?: any) => {
    if (!state.currentCircuit) return null;
    
    try {
      const optimized = await window.quantumOS?.optimizeCircuit(
        state.currentCircuit,
        options
      );
      
      if (optimized) {
        const circuit: CircuitState = {
          ...state.currentCircuit,
          id: `circuit_${Date.now()}`,
          name: `${state.currentCircuit.name} (Optimized)`,
          gates: optimized.gates || [],
          isModified: true
        };
        
        dispatch({ type: 'ADD_CIRCUIT', payload: circuit });
        dispatch({ type: 'SET_CURRENT_CIRCUIT', payload: circuit });
        
        return circuit;
      }
    } catch (error) {
      console.error('Failed to optimize circuit:', error);
      throw error;
    }
  };
  
  return {
    currentCircuit: state.currentCircuit,
    circuits: state.circuits,
    createCircuit,
    saveCircuit,
    loadCircuit,
    optimizeCircuit
  };
};