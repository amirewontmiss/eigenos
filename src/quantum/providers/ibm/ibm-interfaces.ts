import { ProviderCredentials } from '../quantum-provider.interface';

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

export interface IBMDeviceData {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly qubits: number;
  readonly simulator: boolean;
  readonly coupling_map: [number, number][];
  readonly basis_gates: string[];
  readonly max_shots: number;
  readonly max_experiments: number;
  readonly operational: boolean;
  readonly pending_jobs: number;
  readonly status_msg: string;
  readonly gate_errors?: Record<string, Record<string, number>>;
  readonly readout_errors?: number[];
  readonly t1_times?: number[];
  readonly t2_times?: number[];
}

export interface IBMJobSubmissionResult {
  readonly job_id: string;
  readonly status: string;
  readonly backend: string;
  readonly shots: number;
  readonly transpiled_gates?: Record<string, number>;
  readonly transpiled_depth?: number;
}

export interface IBMJobStatusResult {
  readonly status: string;
  readonly queue_position?: number;
}

export interface IBMJobResultsData {
  readonly job_id: string;
  readonly shots: number;
  readonly counts: Record<string, number>;
  readonly execution_time?: number;
  readonly backend: string;
  readonly success: boolean;
  readonly timestamp?: string;
  readonly memory?: string[];
}