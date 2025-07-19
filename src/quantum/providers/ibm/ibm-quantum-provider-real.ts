import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { QuantumProvider, QuantumJob } from '../quantum-provider.interface';
import { 
  QuantumDevice, 
  AuthenticationResult, 
  JobSubmissionResult, 
  JobStatus, 
  QuantumResults,
  DeviceStatus,
  QuantumTopology
} from '../../core/interfaces/quantum-device.interface';
import { QuantumCircuit } from '../../core/circuit/quantum-circuit';

interface IBMAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

interface IBMDevice {
  backend_name: string;
  backend_version: string;
  n_qubits: number;
  basis_gates: string[];
  coupling_map: [number, number][];
  max_shots: number;
  max_experiments: number;
  operational: boolean;
  pending_jobs: number;
  status_msg: string;
  simulator: boolean;
  local: boolean;
  open_pulse: boolean;
  memory: boolean;
  max_memory_slots: number;
  conditional: boolean;
  credits_required: boolean;
  online_date: string;
  description: string;
  chip_name?: string;
  url: string;
}

interface IBMJobData {
  id: string;
  backend: string;
  status: string;
  creation_date: string;
  completion_date?: string;
  qobj_id: string;
  user_uuid: string;
  position_in_queue?: number;
  estimated_completion_time?: string;
  error?: {
    message: string;
    code: number;
  };
}

interface IBMJobResult {
  backend_name: string;
  backend_version: string;
  job_id: string;
  qobj_id: string;
  success: boolean;
  results: Array<{
    shots: number;
    data: {
      counts?: Record<string, number>;
      memory?: string[];
      probabilities?: Record<string, number>;
    };
    success: boolean;
    meas_level: number;
    meas_return: string;
    header: {
      backend_name: string;
      backend_version: string;
    };
  }>;
  date: string;
  status: string;
  execution_time?: number;
}

export class IBMQuantumProviderReal extends QuantumProvider {
  private readonly httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private hubGroupProject: string;

  constructor(
    private readonly config: {
      apiToken: string;
      hub?: string;
      group?: string;
      project?: string;
      baseUrl?: string;
    },
    private readonly logger: any
  ) {
    super();
    
    this.hubGroupProject = `${config.hub || 'ibm-q'}/${config.group || 'open'}/${config.project || 'main'}`;
    
    this.httpClient = axios.create({
      baseURL: config.baseUrl || 'https://api.quantum-computing.ibm.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QuantumOS/1.0.0'
      }
    });

    this.httpClient.interceptors.request.use(async (config) => {
      await this.ensureAuthenticated();
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          this.accessToken = null;
          this.tokenExpiry = null;
          await this.ensureAuthenticated();
          if (this.accessToken) {
            error.config.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.httpClient.request(error.config);
          }
        }
        throw error;
      }
    );
  }

  get name(): string { return 'IBM Quantum'; }
  get version(): string { return '1.0.0'; }
  get capabilities() {
    return {
      supportsSimulation: true,
      supportsHardware: true,
      maxQubits: 127,
      supportedGates: ['id', 'x', 'y', 'z', 'h', 's', 't', 'sdg', 'tdg', 'rx', 'ry', 'rz', 'cx', 'cz', 'cy', 'ch', 'crx', 'cry', 'crz', 'ccx', 'cswap', 'mcx', 'mcy', 'mcz'],
      supportsParameterizedCircuits: true,
      supportsConditionalOperations: true
    };
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return;
    }

    try {
      const response: AxiosResponse<IBMAuthResponse> = await axios.post(
        'https://auth.quantum-computing.ibm.com/api/users/loginWithToken',
        { apiToken: this.config.apiToken },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000) - 60000);
      
      this.logger.info('IBM Quantum authentication successful');
    } catch (error: any) {
      this.logger.error('IBM Quantum authentication failed', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async authenticate(credentials: any): Promise<AuthenticationResult> {
    try {
      await this.ensureAuthenticated();
      
      const userResponse = await this.httpClient.get('/api/users/me');
      
      return {
        success: true,
        userInfo: {
          id: userResponse.data.id,
          username: userResponse.data.username,
          email: userResponse.data.email,
          institution: userResponse.data.institution
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getDevices(): Promise<QuantumDevice[]> {
    try {
      const response: AxiosResponse<IBMDevice[]> = await this.httpClient.get(
        `/api/Network/${this.hubGroupProject}/devices`
      );

      return response.data.map(device => this.mapIBMDeviceToQuantumDevice(device));
    } catch (error: any) {
      this.logger.error('Failed to fetch IBM devices', error);
      throw new Error(`Failed to fetch devices: ${error.message}`);
    }
  }

  private mapIBMDeviceToQuantumDevice(ibmDevice: IBMDevice): QuantumDevice {
    const topology: QuantumTopology = {
      couplingMap: ibmDevice.coupling_map || [],
      qubitCount: ibmDevice.n_qubits,
      dimensions: ibmDevice.n_qubits,
      connectivity: this.determineConnectivity(ibmDevice.coupling_map || [])
    };

    let status: DeviceStatus;
    if (!ibmDevice.operational) {
      status = DeviceStatus.OFFLINE;
    } else if (ibmDevice.status_msg.toLowerCase().includes('maintenance')) {
      status = DeviceStatus.MAINTENANCE;
    } else if (ibmDevice.status_msg.toLowerCase().includes('calibrating')) {
      status = DeviceStatus.CALIBRATING;
    } else {
      status = DeviceStatus.ONLINE;
    }

    return {
      id: ibmDevice.backend_name,
      provider: 'IBM' as any,
      name: ibmDevice.backend_name,
      version: ibmDevice.backend_version,
      topology,
      basisGates: ibmDevice.basis_gates,
      maxShots: ibmDevice.max_shots,
      maxExperiments: ibmDevice.max_experiments,
      simulationCapable: ibmDevice.simulator,
      calibration: {
        timestamp: new Date(),
        gateErrors: new Map(),
        readoutErrors: [],
        coherenceTimes: { T1: [], T2: [], T2Star: [] },
        crossTalk: [],
        frequencyMap: []
      },
      status,
      queueInfo: {
        pendingJobs: ibmDevice.pending_jobs,
        averageWaitTime: this.estimateWaitTime(ibmDevice.pending_jobs),
        estimatedCompleteTime: new Date(Date.now() + this.estimateWaitTime(ibmDevice.pending_jobs)),
        priority: ibmDevice.simulator ? 1 : 5
      },
      costModel: {
        costPerShot: ibmDevice.credits_required ? 0.001 : 0,
        costPerSecond: ibmDevice.credits_required ? 0.01 : 0,
        minimumCost: 0,
        currency: 'USD'
      }
    };
  }

  private determineConnectivity(couplingMap: [number, number][]): 'linear' | 'grid' | 'star' | 'full' | 'custom' {
    if (couplingMap.length === 0) return 'custom';
    
    const uniqueNodes = new Set([...couplingMap.flat()]);
    const nodeCount = uniqueNodes.size;
    const edgeCount = couplingMap.length;
    
    if (edgeCount === nodeCount * (nodeCount - 1) / 2) return 'full';
    if (edgeCount === nodeCount - 1) return 'linear';
    
    return 'custom';
  }

  private estimateWaitTime(queueLength: number): number {
    return queueLength * 60000;
  }

  async submitJob(job: QuantumJob): Promise<JobSubmissionResult> {
    try {
      const qasm = this.circuitToQASM(job.circuit as QuantumCircuit);
      
      const experimentData = {
        type: 'qasm',
        qasm,
        backend: job.device.id,
        shots: job.shots,
        max_credits: job.maxCredits || 10,
        seed_simulator: job.seed,
        memory: job.memory || false,
        parameter_binds: [],
        header: {
          backend_name: job.device.id,
          backend_version: job.device.version
        }
      };

      const response: AxiosResponse<{ id: string }> = await this.httpClient.post(
        `/api/Network/${this.hubGroupProject}/devices/${job.device.id}/execute`,
        experimentData
      );

      this.logger.info('Job submitted to IBM Quantum', { 
        jobId: response.data.id, 
        device: job.device.id 
      });

      return {
        jobId: response.data.id,
        status: JobStatus.SUBMITTED,
        providerJobId: response.data.id,
        estimatedQueueTime: this.estimateWaitTime(job.device.queueInfo.pendingJobs)
      };

    } catch (error: any) {
      this.logger.error('Failed to submit job to IBM', error);
      throw new Error(`Job submission failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    try {
      const response: AxiosResponse<IBMJobData> = await this.httpClient.get(
        `/api/Network/jobs/${jobId}`
      );

      return this.mapIBMStatusToJobStatus(response.data.status);
    } catch (error: any) {
      this.logger.error('Failed to get IBM job status', error);
      throw new Error(`Failed to get job status: ${error.message}`);
    }
  }

  private mapIBMStatusToJobStatus(ibmStatus: string): JobStatus {
    switch (ibmStatus.toUpperCase()) {
      case 'INITIALIZING':
      case 'VALIDATING':
        return JobStatus.SUBMITTED;
      case 'QUEUED':
        return JobStatus.QUEUED;
      case 'RUNNING':
        return JobStatus.RUNNING;
      case 'COMPLETED':
        return JobStatus.COMPLETED;
      case 'CANCELLED':
        return JobStatus.CANCELLED;
      case 'ERROR':
      default:
        return JobStatus.FAILED;
    }
  }

  async getJobResults(jobId: string): Promise<QuantumResults> {
    try {
      const statusResponse: AxiosResponse<IBMJobData> = await this.httpClient.get(
        `/api/Network/jobs/${jobId}`
      );

      if (statusResponse.data.status !== 'COMPLETED') {
        throw new Error(`Job not completed. Current status: ${statusResponse.data.status}`);
      }

      const resultsResponse: AxiosResponse<IBMJobResult> = await this.httpClient.get(
        `/api/Network/jobs/${jobId}/results`
      );

      const result = resultsResponse.data.results[0];
      
      return {
        jobId,
        shots: result.shots,
        counts: result.data.counts || {},
        memory: result.data.memory,
        executionTime: resultsResponse.data.execution_time || 0,
        queueTime: this.calculateQueueTime(statusResponse.data),
        metadata: {
          backend: resultsResponse.data.backend_name,
          timestamp: new Date(resultsResponse.data.date),
          shots: result.shots,
          success: resultsResponse.data.success,
          circuitDepth: 0,
          gateCount: 0
        }
      };

    } catch (error: any) {
      this.logger.error('Failed to get IBM job results', error);
      throw new Error(`Failed to get job results: ${error.message}`);
    }
  }

  private calculateQueueTime(jobData: IBMJobData): number {
    if (!jobData.creation_date || !jobData.completion_date) return 0;
    
    const created = new Date(jobData.creation_date);
    const completed = new Date(jobData.completion_date);
    return completed.getTime() - created.getTime();
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      await this.httpClient.delete(`/api/Network/jobs/${jobId}`);
      this.logger.info('Job cancelled', { jobId });
      return true;
    } catch (error: any) {
      this.logger.error('Failed to cancel IBM job', error);
      return false;
    }
  }

  async getCreditsRemaining(): Promise<number> {
    try {
      const response = await this.httpClient.get('/api/users/me');
      return response.data.credits_remaining || 0;
    } catch (error: any) {
      this.logger.error('Failed to get credits', error);
      return 0;
    }
  }

  private circuitToQASM(circuit: QuantumCircuit): string {
    return circuit.toQASM();
  }

  async getDeviceCalibration(deviceId: string): Promise<any> {
    try {
      const response = await this.httpClient.get(
        `/api/Network/${this.hubGroupProject}/devices/${deviceId}/properties`
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get device calibration', error);
      return null;
    }
  }

  async getDeviceConfiguration(deviceId: string): Promise<any> {
    try {
      const response = await this.httpClient.get(
        `/api/Network/${this.hubGroupProject}/devices/${deviceId}/configuration`
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get device configuration', error);
      return null;
    }
  }

  async getJobQueue(deviceId: string): Promise<any[]> {
    try {
      const response = await this.httpClient.get(
        `/api/Network/${this.hubGroupProject}/devices/${deviceId}/queue/status`
      );
      return response.data.queue || [];
    } catch (error: any) {
      this.logger.error('Failed to get job queue', error);
      return [];
    }
  }
}