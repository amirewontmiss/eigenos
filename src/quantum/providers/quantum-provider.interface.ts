import { 
  QuantumDevice, 
  ProviderCapabilities, 
  ProviderCredentials, 
  AuthenticationResult, 
  JobSubmissionResult, 
  JobStatus, 
  QuantumResults 
} from '../core/interfaces/quantum-device.interface';
import { QuantumCircuit } from '../core/circuit/quantum-circuit';

export interface QuantumJob {
  readonly id: string;
  readonly circuit: QuantumCircuit;
  readonly device: QuantumDevice;
  readonly shots: number;
  readonly user: UserInfo;
  readonly priority: number;
  readonly memory?: boolean;
  readonly maxCredits?: number;
  readonly seed?: number;
  readonly optimization_level?: number;
  scheduledDevice?: QuantumDevice;
  estimatedStartTime?: Date;
  estimatedCompletionTime?: Date;
  schedulingPriority?: number;
}

export interface UserInfo {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly preferences: UserPreferences;
}

export interface UserPreferences {
  readonly schedulingWeights?: {
    readonly performance: number;
    readonly cost: number;
    readonly reliability: number;
    readonly availability: number;
  };
  readonly preferredProviders?: string[];
  readonly maxCostPerJob?: number;
  readonly maxWaitTime?: number;
}

export abstract class QuantumProvider {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly capabilities: ProviderCapabilities;

  abstract authenticate(credentials: ProviderCredentials): Promise<AuthenticationResult>;
  abstract getDevices(): Promise<QuantumDevice[]>;
  abstract submitJob(job: QuantumJob): Promise<JobSubmissionResult>;
  abstract getJobStatus(jobId: string): Promise<JobStatus>;
  abstract getJobResults(jobId: string): Promise<QuantumResults>;
  abstract cancelJob(jobId: string): Promise<boolean>;
  abstract getCreditsRemaining(): Promise<number>;
}

export interface IBMCredentials extends ProviderCredentials {
  readonly token: string;
  readonly hub?: string;
  readonly group?: string;
  readonly project?: string;
}

export interface IBMProviderConfig {
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly baseUrl: string;
}