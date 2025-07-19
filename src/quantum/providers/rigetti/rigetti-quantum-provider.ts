import { QuantumProvider, QuantumJob } from '../quantum-provider.interface';
import { 
  QuantumDevice, 
  AuthenticationResult, 
  JobSubmissionResult, 
  JobStatus, 
  QuantumResults 
} from '../../core/interfaces/quantum-device.interface';
import { QuantumCircuit } from '../../core/circuit/quantum-circuit';
import axios, { AxiosInstance } from 'axios';

interface RigettiCredentials {
  apiKey: string;
  userId: string;
}

interface RigettiDevice {
  name: string;
  id: string;
  topology: {
    qubits: number[];
    edges: Array<[number, number]>;
  };
  specs: {
    fidelity: Record<string, number>;
    timing: Record<string, number>;
  };
  status: string;
  queue_length: number;
}

interface RigettiJob {
  job_id: string;
  status: string;
  device: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  result?: {
    bitstring_arrays: number[][];
    execution_duration_microseconds: number;
  };
  error?: string;
}

export class RigettiQuantumProvider extends QuantumProvider {
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly credentials: RigettiCredentials,
    private readonly logger: any
  ) {
    super();

    this.httpClient = axios.create({
      baseURL: 'https://api.rigetti.com/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.apiKey}`,
        'X-User-Id': credentials.userId
      }
    });
  }

  get name(): string { return 'Rigetti Quantum Cloud Services'; }
  get version(): string { return '1.0.0'; }
  get capabilities() {
    return {
      supportsSimulation: true,
      supportsHardware: true,
      maxQubits: 80,
      supportedGates: ['i', 'x', 'y', 'z', 'h', 's', 't', 'rx', 'ry', 'rz', 'cnot', 'cz', 'iswap', 'xy', 'ccnot'],
      supportsParameterizedCircuits: true,
      supportsConditionalOperations: true
    };
  }

  async authenticate(credentials: any): Promise<AuthenticationResult> {
    try {
      const response = await this.httpClient.get('/user');
      
      return {
        success: true,
        userInfo: {
          id: response.data.user_id,
          name: response.data.name,
          organization: response.data.organization
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getDevices(): Promise<QuantumDevice[]> {
    try {
      const response = await this.httpClient.get('/devices');
      
      return response.data.devices.map((device: RigettiDevice) => 
        this.mapRigettiDeviceToQuantumDevice(device)
      );
    } catch (error: any) {
      this.logger.error('Failed to fetch Rigetti devices', error);
      throw new Error(`Failed to fetch devices: ${error.message}`);
    }
  }

  private mapRigettiDeviceToQuantumDevice(rigettiDevice: RigettiDevice): QuantumDevice {
    return {
      id: rigettiDevice.id,
      provider: 'Rigetti' as any,
      name: rigettiDevice.name,
      version: '1.0',
      topology: {
        couplingMap: rigettiDevice.topology.edges,
        qubitCount: rigettiDevice.topology.qubits.length,
        dimensions: rigettiDevice.topology.qubits.length,
        connectivity: 'custom'
      },
      basisGates: ['rx', 'ry', 'rz', 'cz'],
      maxShots: 100000,
      maxExperiments: 1,
      simulationCapable: rigettiDevice.name.includes('simulator'),
      calibration: {
        timestamp: new Date(),
        gateErrors: new Map(),
        readoutErrors: [],
        coherenceTimes: { T1: [], T2: [], T2Star: [] },
        crossTalk: [],
        frequencyMap: []
      },
      status: this.mapRigettiStatus(rigettiDevice.status),
      queueInfo: {
        pendingJobs: rigettiDevice.queue_length,
        averageWaitTime: rigettiDevice.queue_length * 30000,
        estimatedCompleteTime: new Date(Date.now() + rigettiDevice.queue_length * 30000),
        priority: 1
      },
      costModel: {
        costPerShot: 0.00001,
        costPerSecond: 0.001,
        minimumCost: 0.01,
        currency: 'USD'
      }
    };
  }

  private mapRigettiStatus(status: string): any {
    switch (status.toLowerCase()) {
      case 'online':
        return 'ONLINE';
      case 'offline':
        return 'OFFLINE';
      case 'maintenance':
        return 'MAINTENANCE';
      default:
        return 'UNKNOWN';
    }
  }

  async submitJob(job: QuantumJob): Promise<JobSubmissionResult> {
    try {
      const quilProgram = this.circuitToQuil(job.circuit as QuantumCircuit);
      
      const jobData = {
        device_id: job.device.id,
        program: quilProgram,
        shots: job.shots,
        priority: job.priority || 1,
        parameters: job.parameters || {}
      };

      const response = await this.httpClient.post('/jobs', jobData);

      this.logger.info('Job submitted to Rigetti', { 
        jobId: response.data.job_id, 
        device: job.device.id 
      });

      return {
        jobId: response.data.job_id,
        status: JobStatus.SUBMITTED,
        providerJobId: response.data.job_id,
        estimatedQueueTime: job.device.queueInfo.averageWaitTime
      };

    } catch (error: any) {
      this.logger.error('Failed to submit job to Rigetti', error);
      throw new Error(`Job submission failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    try {
      const response = await this.httpClient.get(`/jobs/${jobId}`);
      const job: RigettiJob = response.data;
      
      return this.mapRigettiJobStatus(job.status);
    } catch (error: any) {
      this.logger.error('Failed to get Rigetti job status', error);
      throw new Error(`Failed to get job status: ${error.message}`);
    }
  }

  private mapRigettiJobStatus(rigettiStatus: string): JobStatus {
    switch (rigettiStatus.toLowerCase()) {
      case 'queued':
      case 'submitted':
        return JobStatus.QUEUED;
      case 'running':
      case 'active':
        return JobStatus.RUNNING;
      case 'completed':
      case 'finished':
        return JobStatus.COMPLETED;
      case 'cancelled':
        return JobStatus.CANCELLED;
      case 'failed':
      case 'error':
      default:
        return JobStatus.FAILED;
    }
  }

  async getJobResults(jobId: string): Promise<QuantumResults> {
    try {
      const response = await this.httpClient.get(`/jobs/${jobId}`);
      const job: RigettiJob = response.data;
      
      if (job.status !== 'completed') {
        throw new Error(`Job not completed. Status: ${job.status}`);
      }

      if (!job.result) {
        throw new Error('Job completed but no results available');
      }

      const counts = this.convertBitstringsToCounts(job.result.bitstring_arrays);
      
      return {
        jobId,
        shots: job.result.bitstring_arrays.length,
        counts,
        executionTime: job.result.execution_duration_microseconds / 1000,
        queueTime: this.calculateQueueTime(job),
        metadata: {
          backend: job.device,
          timestamp: new Date(job.completed_at || job.updated_at),
          shots: job.result.bitstring_arrays.length,
          success: true,
          circuitDepth: 0,
          gateCount: 0
        }
      };

    } catch (error: any) {
      this.logger.error('Failed to get Rigetti job results', error);
      throw new Error(`Failed to get job results: ${error.message}`);
    }
  }

  private convertBitstringsToCounts(bitstrings: number[][]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    bitstrings.forEach(bitstring => {
      const key = bitstring.join('');
      counts[key] = (counts[key] || 0) + 1;
    });
    
    return counts;
  }

  private calculateQueueTime(job: RigettiJob): number {
    const created = new Date(job.created_at);
    const updated = new Date(job.updated_at);
    return updated.getTime() - created.getTime();
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      await this.httpClient.delete(`/jobs/${jobId}`);
      this.logger.info('Rigetti job cancelled', { jobId });
      return true;
    } catch (error: any) {
      this.logger.error('Failed to cancel Rigetti job', error);
      return false;
    }
  }

  async getCreditsRemaining(): Promise<number> {
    try {
      const response = await this.httpClient.get('/account/balance');
      return response.data.credits || 0;
    } catch (error: any) {
      this.logger.error('Failed to get Rigetti credits', error);
      return 0;
    }
  }

  private circuitToQuil(circuit: QuantumCircuit): string {
    let quil = `DECLARE ro BIT[${circuit.classicalBits}]\n\n`;
    
    circuit.gates.forEach(gate => {
      quil += this.convertGateToQuil(gate) + '\n';
    });
    
    circuit.measurements.forEach(measurement => {
      quil += `MEASURE ${measurement.qubit} ro[${measurement.classicalBit}]\n`;
    });
    
    return quil;
  }

  private convertGateToQuil(gate: any): string {
    switch (gate.name.toUpperCase()) {
      case 'X':
        return `X ${gate.qubits[0]}`;
      case 'Y':
        return `Y ${gate.qubits[0]}`;
      case 'Z':
        return `Z ${gate.qubits[0]}`;
      case 'H':
        return `H ${gate.qubits[0]}`;
      case 'S':
        return `S ${gate.qubits[0]}`;
      case 'T':
        return `T ${gate.qubits[0]}`;
      case 'RX':
        return `RX(${gate.parameters[0]}) ${gate.qubits[0]}`;
      case 'RY':
        return `RY(${gate.parameters[0]}) ${gate.qubits[0]}`;
      case 'RZ':
        return `RZ(${gate.parameters[0]}) ${gate.qubits[0]}`;
      case 'CNOT':
        return `CNOT ${gate.qubits[0]} ${gate.qubits[1]}`;
      case 'CZ':
        return `CZ ${gate.qubits[0]} ${gate.qubits[1]}`;
      default:
        throw new Error(`Unsupported gate for Quil conversion: ${gate.name}`);
    }
  }

  async getDeviceCalibration(deviceId: string): Promise<any> {
    try {
      const response = await this.httpClient.get(`/devices/${deviceId}/calibration`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get Rigetti device calibration', error);
      return null;
    }
  }

  async getDeviceTopology(deviceId: string): Promise<any> {
    try {
      const response = await this.httpClient.get(`/devices/${deviceId}/topology`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get Rigetti device topology', error);
      return null;
    }
  }

  async reserveDevice(deviceId: string, duration: number): Promise<any> {
    try {
      const response = await this.httpClient.post(`/devices/${deviceId}/reserve`, {
        duration_minutes: duration
      });
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to reserve Rigetti device', error);
      throw error;
    }
  }
}