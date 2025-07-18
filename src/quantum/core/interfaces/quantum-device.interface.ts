export interface QuantumTopology {
  readonly couplingMap: [number, number][];
  readonly qubitCount: number;
  readonly dimensions: number;
  readonly connectivity: 'linear' | 'grid' | 'star' | 'full' | 'custom';
}

export interface QuantumCalibration {
  readonly timestamp: Date;
  readonly gateErrors: Map<string, Map<number[], number>>;
  readonly readoutErrors: number[];
  readonly coherenceTimes: {
    readonly T1: number[];
    readonly T2: number[];
    readonly T2Star: number[];
  };
  readonly crossTalk: number[][];
  readonly frequencyMap: number[];
}

export interface QuantumDevice {
  readonly id: string;
  readonly provider: QuantumProvider;
  readonly name: string;
  readonly version: string;
  readonly topology: QuantumTopology;
  readonly basisGates: readonly string[];
  readonly maxShots: number;
  readonly maxExperiments: number;
  readonly simulationCapable: boolean;
  readonly calibration: QuantumCalibration;
  readonly status: DeviceStatus;
  readonly queueInfo: QueueInformation;
  readonly costModel: CostModel;
}

export enum DeviceStatus {
  ONLINE = 'online',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
  CALIBRATING = 'calibrating',
  ERROR = 'error'
}

export interface QueueInformation {
  readonly pendingJobs: number;
  readonly averageWaitTime: number;
  readonly estimatedCompleteTime: Date;
  readonly priority: number;
}

export interface CostModel {
  readonly costPerShot: number;
  readonly costPerSecond: number;
  readonly minimumCost: number;
  readonly currency: string;
}

export enum QuantumProvider {
  IBM = 'IBM',
  GOOGLE = 'Google',
  RIGETTI = 'Rigetti',
  IONQ = 'IonQ',
  HONEYWELL = 'Honeywell',
  SIMULATOR = 'Simulator'
}

export interface ProviderCapabilities {
  readonly supportsSimulation: boolean;
  readonly supportsHardware: boolean;
  readonly maxQubits: number;
  readonly supportedGates: readonly string[];
  readonly supportsParameterizedCircuits: boolean;
  readonly supportsConditionalOperations: boolean;
}

export interface ProviderCredentials {
  readonly token?: string;
  readonly apiKey?: string;
  readonly username?: string;
  readonly password?: string;
  readonly endpoint?: string;
}

export interface AuthenticationResult {
  readonly success: boolean;
  readonly userInfo?: any;
  readonly error?: string;
}

export interface JobSubmissionResult {
  readonly jobId: string;
  readonly status: JobStatus;
  readonly providerJobId: string;
  readonly estimatedQueueTime: number;
  readonly transpiledCircuit?: any;
}

export enum JobStatus {
  SUBMITTED = 'submitted',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface QuantumResults {
  readonly jobId: string;
  readonly shots: number;
  readonly counts: Record<string, number>;
  readonly memory?: string[];
  readonly executionTime: number;
  readonly queueTime: number;
  readonly metadata: ResultMetadata;
}

export interface ResultMetadata {
  readonly backend: string;
  readonly timestamp: Date;
  readonly shots: number;
  readonly success: boolean;
  readonly circuitDepth: number;
  readonly gateCount: number;
  readonly error?: string;
}