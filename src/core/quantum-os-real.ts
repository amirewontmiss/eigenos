import { QuantumCircuit } from '../quantum/core/circuit/quantum-circuit';
import { QuantumProviderFactory, ProviderStatus } from '../quantum/providers/quantum-provider-factory';
import { QuantumProvider } from '../quantum/providers/quantum-provider.interface';
import { Logger } from '../utils/logger';
import { DatabaseService } from '../database/database.service';

export interface CircuitExecutionResult {
  jobId: string;
  status: 'submitted' | 'running' | 'completed' | 'failed';
  results?: any;
  executionTime?: number;
  queueTime?: number;
  error?: string;
  provider?: string;
  device?: string;
  estimatedCost?: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  provider: string;
  qubits: number;
  status: string;
  queueLength: number;
  fidelity: number;
  costPerShot: number;
  estimatedWaitTime: number;
}

export class QuantumOSReal {
  private isInitialized = false;
  private jobPollingIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly logger: Logger,
    private readonly databaseService: DatabaseService
  ) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('QuantumOS already initialized');
      return;
    }

    try {
      this.logger.info('Initializing QuantumOS with real quantum providers...');

      await this.databaseService.initialize();

      await QuantumProviderFactory.initializeAllProviders(this.logger);

      this.setupHealthChecks();

      this.isInitialized = true;
      this.logger.info('QuantumOS initialization complete');

    } catch (error: any) {
      this.logger.error('QuantumOS initialization failed', error);
      throw error;
    }
  }

  async getAvailableProviders(): Promise<ProviderStatus[]> {
    return QuantumProviderFactory.getAllProviderStatus();
  }

  async getAvailableDevices(): Promise<DeviceInfo[]> {
    try {
      const allDevices = await QuantumProviderFactory.getAllDevices();
      
      return allDevices.map(({ device, provider, providerName }) => ({
        id: device.id,
        name: device.name,
        provider: providerName,
        qubits: device.topology.qubitCount,
        status: device.status,
        queueLength: device.queueInfo.pendingJobs,
        fidelity: device.calibration ? this.calculateAverageFidelity(device.calibration) : 0.95,
        costPerShot: device.costModel.costPerShot,
        estimatedWaitTime: device.queueInfo.averageWaitTime
      }));
    } catch (error: any) {
      this.logger.error('Failed to get available devices', error);
      return [];
    }
  }

  async submitCircuit(
    circuit: QuantumCircuit,
    options: {
      deviceId?: string;
      providerId?: string;
      shots?: number;
      optimization?: 'none' | 'basic' | 'advanced';
      maxCost?: number;
      maxWaitTime?: number;
    } = {}
  ): Promise<CircuitExecutionResult> {
    try {
      this.logger.info('Submitting quantum circuit for execution', {
        circuitName: circuit.name,
        qubits: circuit.qubits,
        gates: circuit.totalGateCount(),
        options
      });

      this.validateCircuit(circuit);

      const job = {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        circuit,
        shots: options.shots || 1024,
        priority: 1,
        user: { id: 'default', name: 'QuantumOS User', email: '', preferences: {} }
      };

      let result: any;
      let provider: QuantumProvider;

      if (options.deviceId && options.providerId) {
        const targetProvider = QuantumProviderFactory.getProvider(options.providerId);
        if (!targetProvider) {
          throw new Error(`Provider ${options.providerId} not available`);
        }

        const devices = await targetProvider.getDevices();
        const targetDevice = devices.find(d => d.id === options.deviceId);
        if (!targetDevice) {
          throw new Error(`Device ${options.deviceId} not found`);
        }

        job.device = targetDevice;
        result = await targetProvider.submitJob(job);
        provider = targetProvider;

      } else {
        const constraints = {
          minQubits: circuit.qubits,
          maxCost: options.maxCost,
          simulator: false
        };

        const optimal = await QuantumProviderFactory.submitJobToOptimalDevice(job, constraints);
        result = optimal.result;
        provider = optimal.provider;
      }

      await this.saveJobToDatabase(job, result, provider.name);

      this.startJobPolling(result.jobId, provider);

      const estimatedCost = this.calculateEstimatedCost(job.device, job.shots);

      this.logger.info('Circuit submitted successfully', {
        jobId: result.jobId,
        provider: provider.name,
        device: job.device.id,
        estimatedCost
      });

      return {
        jobId: result.jobId,
        status: result.status,
        provider: provider.name,
        device: job.device.id,
        estimatedCost
      };

    } catch (error: any) {
      this.logger.error('Failed to submit circuit', error);
      return {
        jobId: '',
        status: 'failed',
        error: error.message
      };
    }
  }

  async getJobStatus(jobId: string): Promise<CircuitExecutionResult> {
    try {
      const jobRepo = this.databaseService.getJobRepository();
      const jobEntity = await jobRepo.findOne({ where: { id: jobId } });
      
      if (!jobEntity) {
        throw new Error(`Job ${jobId} not found`);
      }

      const provider = QuantumProviderFactory.getProvider(jobEntity.providerJobId.split('_')[0]);
      if (!provider) {
        throw new Error(`Provider for job ${jobId} not available`);
      }

      const currentStatus = await provider.getJobStatus(jobEntity.providerJobId);
      
      if (currentStatus !== jobEntity.status) {
        jobEntity.updateStatus(currentStatus);
        await jobRepo.save(jobEntity);
      }

      let results;
      if (currentStatus === 'COMPLETED') {
        try {
          results = await provider.getJobResults(jobEntity.providerJobId);
        } catch (error: any) {
          this.logger.warn('Failed to fetch results for completed job', error);
        }
      }

      return {
        jobId,
        status: currentStatus.toLowerCase() as any,
        results,
        executionTime: jobEntity.executionTimeMs,
        queueTime: jobEntity.queueTimeMs,
        provider: jobEntity.device?.provider,
        device: jobEntity.device?.id
      };

    } catch (error: any) {
      this.logger.error('Failed to get job status', error);
      return {
        jobId,
        status: 'failed',
        error: error.message
      };
    }
  }

  async getJobResults(jobId: string): Promise<any> {
    try {
      const jobStatus = await this.getJobStatus(jobId);
      
      if (jobStatus.status !== 'completed') {
        throw new Error(`Job ${jobId} not completed. Current status: ${jobStatus.status}`);
      }

      return jobStatus.results;

    } catch (error: any) {
      this.logger.error('Failed to get job results', error);
      throw error;
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const jobRepo = this.databaseService.getJobRepository();
      const jobEntity = await jobRepo.findOne({ where: { id: jobId } });
      
      if (!jobEntity) {
        this.logger.warn(`Job ${jobId} not found for cancellation`);
        return false;
      }

      const provider = QuantumProviderFactory.getProvider(jobEntity.providerJobId.split('_')[0]);
      if (!provider) {
        this.logger.warn(`Provider for job ${jobId} not available`);
        return false;
      }

      const cancelled = await provider.cancelJob(jobEntity.providerJobId);
      
      if (cancelled) {
        jobEntity.updateStatus('CANCELLED');
        await jobRepo.save(jobEntity);
        
        this.stopJobPolling(jobId);
      }

      return cancelled;

    } catch (error: any) {
      this.logger.error('Failed to cancel job', error);
      return false;
    }
  }

  async getSystemHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    providers: any;
    database: boolean;
    activeJobs: number;
  }> {
    try {
      const [providerHealth, dbHealth, activeJobs] = await Promise.all([
        QuantumProviderFactory.performHealthCheck(this.logger),
        this.databaseService.healthCheck(),
        this.getActiveJobCount()
      ]);

      return {
        overall: providerHealth.overall,
        providers: providerHealth.providers,
        database: dbHealth,
        activeJobs
      };

    } catch (error: any) {
      this.logger.error('Failed to get system health', error);
      return {
        overall: 'unhealthy',
        providers: {},
        database: false,
        activeJobs: 0
      };
    }
  }

  async refreshProviders(): Promise<void> {
    this.logger.info('Refreshing all quantum providers...');
    await QuantumProviderFactory.refreshAllProviders(this.logger);
  }

  private validateCircuit(circuit: QuantumCircuit): void {
    if (circuit.qubits === 0) {
      throw new Error('Circuit must have at least one qubit');
    }

    if (circuit.qubits > 100) {
      throw new Error('Circuit has too many qubits (maximum 100)');
    }

    if (circuit.totalGateCount() === 0) {
      throw new Error('Circuit must have at least one gate');
    }

    if (circuit.totalGateCount() > 10000) {
      throw new Error('Circuit has too many gates (maximum 10,000)');
    }
  }

  private calculateAverageFidelity(calibration: any): number {
    return 0.95;
  }

  private calculateEstimatedCost(device: any, shots: number): number {
    if (!device?.costModel) return 0;
    
    const shotCost = shots * device.costModel.costPerShot;
    return Math.max(shotCost, device.costModel.minimumCost || 0);
  }

  private async saveJobToDatabase(job: any, result: any, providerName: string): Promise<void> {
    try {
      const jobRepo = this.databaseService.getJobRepository();
      const userRepo = this.databaseService.getUserRepository();
      const circuitRepo = this.databaseService.getCircuitRepository();
      const deviceRepo = this.databaseService.getDeviceRepository();

      let user = await userRepo.findOne({ where: { id: job.user.id } });
      if (!user) {
        user = userRepo.create({
          id: job.user.id,
          username: job.user.name,
          email: job.user.email,
          passwordHash: 'oauth_user',
          firstName: job.user.name.split(' ')[0] || 'Unknown',
          lastName: job.user.name.split(' ').slice(1).join(' ') || 'User',
          licenseKey: 'FREE-USER',
          licenseType: 'free' as any,
          role: 'user' as any,
          isActive: true
        });
        await userRepo.save(user);
      }

      const circuitEntity = circuitRepo.create({
        name: job.circuit.name,
        qubits: job.circuit.qubits,
        classicalBits: job.circuit.classicalBits,
        gates: job.circuit.gates.map((gate: any) => ({
          id: gate.id || `gate_${Math.random()}`,
          type: gate.name,
          qubits: gate.qubits,
          parameters: gate.parameters || [],
          position: { x: 0, y: 0 }
        })),
        measurements: job.circuit.measurements.map((m: any) => ({
          qubit: m.qubit,
          classicalBit: m.classicalBit
        })),
        depth: job.circuit.depth,
        gateCount: job.circuit.totalGateCount(),
        user: user,
        userId: user.id
      });
      await circuitRepo.save(circuitEntity);

      let device = await deviceRepo.findOne({ where: { providerId: job.device.id } });
      if (!device) {
        device = deviceRepo.create({
          providerId: job.device.id,
          name: job.device.name,
          provider: providerName,
          version: job.device.version,
          type: job.device.simulationCapable ? 'SIMULATOR' : 'SUPERCONDUCTING',
          status: job.device.status,
          topology: {
            couplingMap: job.device.topology.couplingMap,
            qubitCount: job.device.topology.qubitCount,
            dimensions: job.device.topology.dimensions,
            connectivity: job.device.topology.connectivity
          },
          capabilities: {
            maxShots: job.device.maxShots,
            maxExperiments: job.device.maxExperiments,
            supportsParametricGates: true,
            supportsConditionalOperations: false,
            supportsMultipleCircuits: false,
            supportedGates: job.device.basisGates,
            nativeGates: job.device.basisGates
          },
          costModel: job.device.costModel,
          queueLength: job.device.queueInfo.pendingJobs
        });
        await deviceRepo.save(device);
      }

      const jobEntity = jobRepo.create({
        id: job.id,
        name: `Job for ${job.circuit.name}`,
        status: result.status.toUpperCase(),
        priority: 'NORMAL',
        parameters: {
          shots: job.shots,
          memory: false,
          optimizationLevel: 1
        },
        providerJobId: result.providerJobId,
        cost: this.calculateEstimatedCost(job.device, job.shots),
        submittedAt: new Date(),
        user: user,
        userId: user.id,
        circuit: circuitEntity,
        circuitId: circuitEntity.id,
        device: device,
        deviceId: device.id
      });
      await jobRepo.save(jobEntity);

    } catch (error: any) {
      this.logger.error('Failed to save job to database', error);
    }
  }

  private startJobPolling(jobId: string, provider: QuantumProvider): void {
    const pollInterval = setInterval(async () => {
      try {
        const status = await provider.getJobStatus(jobId);
        
        if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
          this.stopJobPolling(jobId);
          
          const jobRepo = this.databaseService.getJobRepository();
          const jobEntity = await jobRepo.findOne({ where: { providerJobId: jobId } });
          
          if (jobEntity) {
            jobEntity.updateStatus(status);
            
            if (status === 'COMPLETED') {
              try {
                const results = await provider.getJobResults(jobId);
                jobEntity.setResults({
                  counts: results.counts,
                  probabilities: results.probabilities || {},
                  executionTime: results.executionTime,
                  queueTime: results.queueTime,
                  shots: results.shots,
                  success: true
                });
              } catch (error: any) {
                this.logger.error('Failed to fetch job results during polling', error);
              }
            }
            
            await jobRepo.save(jobEntity);
          }
        }
      } catch (error: any) {
        this.logger.error('Error during job polling', { jobId, error: error.message });
      }
    }, 10000);

    this.jobPollingIntervals.set(jobId, pollInterval);
    
    setTimeout(() => {
      this.stopJobPolling(jobId);
    }, 3600000);
  }

  private stopJobPolling(jobId: string): void {
    const interval = this.jobPollingIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.jobPollingIntervals.delete(jobId);
    }
  }

  private setupHealthChecks(): void {
    setInterval(async () => {
      try {
        await QuantumProviderFactory.performHealthCheck(this.logger);
      } catch (error: any) {
        this.logger.error('Provider health check failed', error);
      }
    }, 300000);
  }

  private async getActiveJobCount(): Promise<number> {
    try {
      const jobRepo = this.databaseService.getJobRepository();
      return await jobRepo.count({
        where: {
          status: ['QUEUED', 'RUNNING', 'SUBMITTED'] as any
        }
      });
    } catch (error: any) {
      this.logger.error('Failed to get active job count', error);
      return 0;
    }
  }

  async getJobHistory(limit: number = 50): Promise<any[]> {
    try {
      const jobRepo = this.databaseService.getJobRepository();
      const jobs = await jobRepo.find({
        order: { createdAt: 'DESC' },
        take: limit,
        relations: ['circuit', 'device', 'user']
      });

      return jobs.map(job => job.toJSON());
    } catch (error: any) {
      this.logger.error('Failed to get job history', error);
      return [];
    }
  }

  async getProviderCredits(): Promise<Record<string, number>> {
    const credits: Record<string, number> = {};
    
    for (const [providerId, provider] of QuantumProviderFactory.getAllProviders()) {
      try {
        credits[providerId] = await provider.getCreditsRemaining();
      } catch (error: any) {
        this.logger.warn(`Failed to get credits for ${providerId}`, error);
        credits[providerId] = 0;
      }
    }
    
    return credits;
  }

  async optimizeCircuit(circuit: QuantumCircuit, level: 1 | 2 | 3 = 2): Promise<QuantumCircuit> {
    this.logger.info('Circuit optimization requested', { 
      level, 
      originalGates: circuit.totalGateCount(),
      originalDepth: circuit.depth 
    });
    
    return circuit;
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down QuantumOS...');
    
    for (const [jobId] of this.jobPollingIntervals) {
      this.stopJobPolling(jobId);
    }
    
    await this.databaseService.destroy();
    
    this.isInitialized = false;
    this.logger.info('QuantumOS shutdown complete');
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}