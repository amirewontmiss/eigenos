import { EventEmitter } from 'events';
import { PriorityQueue } from 'typescript-collections';
import { QuantumJob, UserInfo } from '../providers/quantum-provider.interface';
import { QuantumDevice, DeviceStatus } from '../core/interfaces/quantum-device.interface';
import { QuantumCircuit } from '../core/circuit/quantum-circuit';

export interface SchedulingDecision {
  job: QuantumJob;
  device: QuantumDevice;
  estimatedStartTime: Date;
  estimatedCompletionTime: Date;
  priority: number;
  cost: number;
  confidence: number;
}

export interface DeviceRegistry {
  getAllDevices(): Promise<QuantumDevice[]>;
  getDevice(id: string): Promise<QuantumDevice | null>;
  updateDeviceStatus(id: string, status: any): Promise<void>;
}

export interface UserService {
  getUser(id: string): Promise<UserInfo | null>;
  getUserPreferences(id: string): Promise<any>;
}

export interface MetricsCollector {
  recordSchedulingDecision(job: QuantumJob, decision: SchedulingDecision, schedulingTime: number): void;
  recordJobExecution(job: QuantumJob, executionTime: number, success: boolean): void;
  getHistoricalPerformance(deviceId: string, circuitType: string): Promise<any>;
}

export interface Logger {
  error(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  debug(message: string, context?: any): void;
}

export class DeviceMonitor {
  constructor(private readonly deviceRegistry: DeviceRegistry) {}

  async getDeviceHealth(deviceId: string): Promise<number> {
    const device = await this.deviceRegistry.getDevice(deviceId);
    if (!device) return 0;

    // Calculate health score based on various factors
    let healthScore = 1.0;

    // Factor in device status
    switch (device.status) {
      case DeviceStatus.ONLINE:
        healthScore *= 1.0;
        break;
      case DeviceStatus.MAINTENANCE:
        healthScore *= 0.3;
        break;
      case DeviceStatus.CALIBRATING:
        healthScore *= 0.7;
        break;
      case DeviceStatus.OFFLINE:
      case DeviceStatus.ERROR:
        healthScore *= 0.0;
        break;
    }

    // Factor in queue length
    const queuePenalty = Math.min(device.queueInfo.pendingJobs / 100, 0.5);
    healthScore *= (1.0 - queuePenalty);

    // Factor in calibration freshness
    const calibrationAge = Date.now() - device.calibration.timestamp.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const agePenalty = Math.min(calibrationAge / maxAge, 0.3);
    healthScore *= (1.0 - agePenalty);

    return Math.max(0, Math.min(1, healthScore));
  }
}

export class CostOptimizer {
  calculateCostScore(job: QuantumJob, device: QuantumDevice): number {
    const totalCost = this.calculateTotalCost(job, device);
    const userMaxCost = job.user.preferences.maxCostPerJob || 10.0;
    
    // Normalize cost score (lower cost = higher score)
    return Math.max(0, 1.0 - (totalCost / userMaxCost));
  }

  async calculateTotalCost(job: QuantumJob, device: QuantumDevice): Promise<number> {
    const shotCost = job.shots * device.costModel.costPerShot;
    const executionTime = await this.estimateExecutionTime(job.circuit as QuantumCircuit, device);
    const timeCost = (executionTime / 1000) * device.costModel.costPerSecond;
    
    return Math.max(shotCost + timeCost, device.costModel.minimumCost);
  }

  private async estimateExecutionTime(circuit: QuantumCircuit, device: QuantumDevice): Promise<number> {
    // Simplified execution time estimation
    const baseTime = 1000; // 1 second base time
    const gateTime = circuit.totalGateCount() * 10; // 10ms per gate
    const depthTime = circuit.depth * 50; // 50ms per depth level
    
    return baseTime + gateTime + depthTime;
  }
}

export class PerformancePredictor {
  constructor(private readonly metricsCollector: MetricsCollector) {}

  async predictExecutionTime(circuit: QuantumCircuit, device: QuantumDevice): Promise<number> {
    // Get historical performance data
    const circuitType = this.classifyCircuit(circuit);
    const historicalData = await this.metricsCollector.getHistoricalPerformance(device.id, circuitType);
    
    if (historicalData && historicalData.averageExecutionTime) {
      // Scale based on circuit complexity
      const complexityFactor = this.calculateComplexityFactor(circuit);
      return historicalData.averageExecutionTime * complexityFactor;
    }
    
    // Fallback to heuristic estimation
    return this.heuristicExecutionTime(circuit, device);
  }

  private classifyCircuit(circuit: QuantumCircuit): string {
    const gateCounts = circuit.gateCount();
    const totalGates = circuit.totalGateCount();
    const twoQubitGateRatio = (gateCounts['CNOT'] || 0) / totalGates;
    
    if (twoQubitGateRatio > 0.3) return 'entangling_heavy';
    if (circuit.depth > 50) return 'deep_circuit';
    if (totalGates > 100) return 'large_circuit';
    return 'standard';
  }

  private calculateComplexityFactor(circuit: QuantumCircuit): number {
    const baseComplexity = 1.0;
    const gateComplexity = Math.log(circuit.totalGateCount() + 1) / 10;
    const depthComplexity = Math.log(circuit.depth + 1) / 10;
    
    return baseComplexity + gateComplexity + depthComplexity;
  }

  private heuristicExecutionTime(circuit: QuantumCircuit, device: QuantumDevice): number {
    const baseTime = 1000; // 1 second
    const gateTime = circuit.totalGateCount() * 10; // 10ms per gate
    const depthTime = circuit.depth * 50; // 50ms per depth level
    const qubitPenalty = Math.pow(circuit.qubits / device.topology.qubitCount, 2) * 500;
    
    return baseTime + gateTime + depthTime + qubitPenalty;
  }
}

export class QuantumScheduler extends EventEmitter {
  private readonly jobQueues = new Map<string, PriorityQueue<QuantumJob>>();
  private readonly runningJobs = new Map<string, QuantumJob>();
  private readonly deviceMonitor: DeviceMonitor;
  private readonly costOptimizer: CostOptimizer;
  private readonly performancePredictor: PerformancePredictor;
  private initialized = false;
  
  constructor(
    private readonly deviceRegistry?: DeviceRegistry,
    private readonly userService?: UserService,
    private readonly metricsCollector?: MetricsCollector,
    private readonly logger?: Logger
  ) {
    super();
    if (deviceRegistry && userService && metricsCollector && logger) {
      this.deviceMonitor = new DeviceMonitor(deviceRegistry);
      this.costOptimizer = new CostOptimizer();
      this.performancePredictor = new PerformancePredictor(metricsCollector);
      this.initializeScheduler();
    }
  }

  async initialize(databaseService?: any): Promise<void> {
    this.initialized = true;
    this.emit('initialized');
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async destroy(): Promise<void> {
    this.removeAllListeners();
    this.initialized = false;
  }

  private initializeScheduler(): void {
    // Initialize job queues for each device
    // Set up periodic scheduling tasks
    setInterval(() => this.processQueues(), 5000); // Process every 5 seconds
    setInterval(() => this.updateDeviceStatus(), 30000); // Update every 30 seconds
    
    this.logger.info('Quantum scheduler initialized');
  }

  async scheduleJob(job: QuantumJob): Promise<SchedulingDecision> {
    const startTime = Date.now();
    
    try {
      // Validate job requirements
      await this.validateJob(job);
      
      // Get available devices
      const availableDevices = await this.getEligibleDevices(job);
      
      if (availableDevices.length === 0) {
        throw new Error('No suitable quantum devices available for this job');
      }
      
      // Multi-criteria decision making
      const decisions = await Promise.all(
        availableDevices.map(device => this.evaluateDeviceForJob(job, device))
      );
      
      // Select best option using weighted scoring
      const bestDecision = this.selectBestDecision(decisions, job.user.preferences);
      
      // Update job with scheduling decision
      job.scheduledDevice = bestDecision.device;
      job.estimatedStartTime = bestDecision.estimatedStartTime;
      job.estimatedCompletionTime = bestDecision.estimatedCompletionTime;
      job.schedulingPriority = bestDecision.priority;
      
      // Add to appropriate queue
      await this.enqueueJob(job);
      
      // Record metrics
      this.metricsCollector.recordSchedulingDecision(job, bestDecision, Date.now() - startTime);
      
      this.logger.info('Job scheduled successfully', { 
        jobId: job.id, 
        deviceId: bestDecision.device.id,
        priority: bestDecision.priority 
      });
      
      return bestDecision;
      
    } catch (error: any) {
      this.logger.error('Job scheduling failed', { jobId: job.id, error: error.message });
      throw error;
    }
  }

  private async validateJob(job: QuantumJob): Promise<void> {
    if (!job.circuit) {
      throw new Error('Job must have a quantum circuit');
    }
    
    if (job.shots <= 0 || job.shots > 1000000) {
      throw new Error('Invalid number of shots: must be between 1 and 1,000,000');
    }
    
    const circuit = job.circuit as QuantumCircuit;
    if (circuit.qubits > 100) {
      throw new Error('Circuit has too many qubits (maximum 100)');
    }
    
    if (circuit.totalGateCount() > 10000) {
      throw new Error('Circuit has too many gates (maximum 10,000)');
    }
  }

  private async getEligibleDevices(job: QuantumJob): Promise<QuantumDevice[]> {
    const allDevices = await this.deviceRegistry.getAllDevices();
    const circuit = job.circuit as QuantumCircuit;
    
    return allDevices.filter(device => {
      // Check if device has enough qubits
      if (device.topology.qubitCount < circuit.qubits) return false;
      
      // Check if device supports required gates
      const requiredGates = Object.keys(circuit.gateCount());
      if (!requiredGates.every(gate => device.basisGates.includes(gate.toLowerCase()))) {
        return false;
      }
      
      // Check if device is operational
      if (device.status === DeviceStatus.OFFLINE || device.status === DeviceStatus.ERROR) return false;
      
      // Check user preferences
      const preferredProviders = job.user.preferences.preferredProviders;
      if (preferredProviders && !preferredProviders.includes(device.provider)) {
        return false;
      }
      
      return true;
    });
  }

  private async evaluateDeviceForJob(job: QuantumJob, device: QuantumDevice): Promise<SchedulingDecision> {
    const currentTime = new Date();
    
    // Calculate queue wait time
    const queueWaitTime = await this.calculateQueueWaitTime(device, job);
    const estimatedStartTime = new Date(currentTime.getTime() + queueWaitTime);
    
    // Predict execution time
    const executionTime = await this.performancePredictor.predictExecutionTime(job.circuit as QuantumCircuit, device);
    const estimatedCompletionTime = new Date(estimatedStartTime.getTime() + executionTime);
    
    // Calculate various scores
    const performanceScore = await this.calculatePerformanceScore(job.circuit as QuantumCircuit, device);
    const costScore = this.costOptimizer.calculateCostScore(job, device);
    const reliabilityScore = await this.calculateReliabilityScore(device);
    const availabilityScore = this.calculateAvailabilityScore(device, queueWaitTime);
    
    // User preference weights
    const weights = job.user.preferences.schedulingWeights || {
      performance: 0.3,
      cost: 0.2,
      reliability: 0.2,
      availability: 0.3
    };
    
    // Weighted score calculation
    const priority = (
      performanceScore * weights.performance +
      costScore * weights.cost +
      reliabilityScore * weights.reliability +
      availabilityScore * weights.availability
    );
    
    // Confidence based on historical accuracy
    const confidence = await this.calculatePredictionConfidence(device, job.circuit as QuantumCircuit);
    
    return {
      job,
      device,
      estimatedStartTime,
      estimatedCompletionTime,
      priority,
      cost: await this.costOptimizer.calculateTotalCost(job, device),
      confidence
    };
  }

  private selectBestDecision(decisions: SchedulingDecision[], userPreferences: any): SchedulingDecision {
    // Sort by priority (higher is better)
    decisions.sort((a, b) => b.priority - a.priority);
    
    // Apply user-specific preferences
    const maxCost = userPreferences.maxCostPerJob;
    const maxWaitTime = userPreferences.maxWaitTime;
    
    for (const decision of decisions) {
      if (maxCost && decision.cost > maxCost) continue;
      
      const waitTime = decision.estimatedStartTime.getTime() - Date.now();
      if (maxWaitTime && waitTime > maxWaitTime) continue;
      
      return decision;
    }
    
    // If no decision meets user preferences, return the best available
    return decisions[0];
  }

  private async calculateQueueWaitTime(device: QuantumDevice, job: QuantumJob): Promise<number> {
    const queue = this.jobQueues.get(device.id);
    if (!queue || queue.isEmpty()) {
      return 0;
    }
    
    // Estimate wait time based on queue position and average job execution time
    const queueSize = queue.size();
    const averageJobTime = 60000; // 1 minute default
    
    return queueSize * averageJobTime;
  }

  private async calculatePerformanceScore(circuit: QuantumCircuit, device: QuantumDevice): Promise<number> {
    let score = 1.0;
    
    // Factor in device health
    const deviceHealth = await this.deviceMonitor.getDeviceHealth(device.id);
    score *= deviceHealth;
    
    // Factor in qubit count efficiency
    const qubitEfficiency = circuit.qubits / device.topology.qubitCount;
    score *= (0.5 + 0.5 * qubitEfficiency); // Prefer fuller utilization
    
    // Factor in gate fidelity (simplified)
    const averageGateError = this.calculateAverageGateError(device);
    score *= (1.0 - averageGateError);
    
    return Math.max(0, Math.min(1, score));
  }

  private async calculateReliabilityScore(device: QuantumDevice): Promise<number> {
    let score = 1.0;
    
    // Factor in device uptime
    const deviceHealth = await this.deviceMonitor.getDeviceHealth(device.id);
    score *= deviceHealth;
    
    // Factor in error rates
    const averageReadoutError = device.calibration.readoutErrors.reduce((a, b) => a + b, 0) / 
                               device.calibration.readoutErrors.length || 0;
    score *= (1.0 - averageReadoutError);
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateAvailabilityScore(device: QuantumDevice, queueWaitTime: number): number {
    const maxAcceptableWait = 3600000; // 1 hour
    return Math.max(0, 1.0 - (queueWaitTime / maxAcceptableWait));
  }

  private async calculatePredictionConfidence(device: QuantumDevice, circuit: QuantumCircuit): Promise<number> {
    // Simplified confidence calculation
    // In practice, this would use historical prediction accuracy
    return 0.8; // 80% confidence default
  }

  private calculateAverageGateError(device: QuantumDevice): number {
    const gateErrors = device.calibration.gateErrors;
    let totalError = 0;
    let count = 0;
    
    for (const [gateName, qubitErrors] of gateErrors) {
      for (const [qubits, error] of qubitErrors) {
        totalError += error;
        count++;
      }
    }
    
    return count > 0 ? totalError / count : 0.01; // 1% default error
  }

  private async enqueueJob(job: QuantumJob): Promise<void> {
    const deviceId = job.scheduledDevice!.id;
    
    if (!this.jobQueues.has(deviceId)) {
      this.jobQueues.set(deviceId, new PriorityQueue<QuantumJob>((a, b) => {
        return (b.schedulingPriority || 0) - (a.schedulingPriority || 0);
      }));
    }
    
    const queue = this.jobQueues.get(deviceId)!;
    queue.enqueue(job);
    
    this.logger.info('Job enqueued', { 
      jobId: job.id, 
      deviceId: deviceId, 
      queueSize: queue.size() 
    });
  }

  private async processQueues(): Promise<void> {
    for (const [deviceId, queue] of this.jobQueues) {
      if (queue.isEmpty()) continue;
      
      // Check if device is available for new jobs
      if (this.runningJobs.has(deviceId)) continue;
      
      const device = await this.deviceRegistry.getDevice(deviceId);
      if (!device || device.status !== DeviceStatus.ONLINE) continue;
      
      // Get next job from queue
      const job = queue.dequeue();
      if (!job) continue;
      
      // Start job execution
      this.runningJobs.set(deviceId, job);
      this.executeJob(job, device);
    }
  }

  private async executeJob(job: QuantumJob, device: QuantumDevice): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting job execution', { jobId: job.id, deviceId: device.id });
      
      // Job execution would be handled by the provider
      // This is just scheduling logic
      
      // Simulate job completion after some time
      setTimeout(() => {
        const executionTime = Date.now() - startTime;
        this.runningJobs.delete(device.id);
        this.metricsCollector.recordJobExecution(job, executionTime, true);
        
        this.logger.info('Job completed', { 
          jobId: job.id, 
          deviceId: device.id, 
          executionTime 
        });
      }, 5000); // 5 second simulation
      
    } catch (error: any) {
      this.runningJobs.delete(device.id);
      this.logger.error('Job execution failed', { 
        jobId: job.id, 
        deviceId: device.id, 
        error: error.message 
      });
    }
  }

  private async updateDeviceStatus(): Promise<void> {
    // Periodically update device status from providers
    try {
      const devices = await this.deviceRegistry.getAllDevices();
      for (const device of devices) {
        // Update device status, queue information, etc.
        // This would integrate with provider APIs
      }
    } catch (error: any) {
      this.logger.error('Failed to update device status', error);
    }
  }

  // Public API methods
  async getQueueStatus(deviceId: string): Promise<any> {
    const queue = this.jobQueues.get(deviceId);
    const runningJob = this.runningJobs.get(deviceId);
    
    return {
      deviceId,
      queueSize: queue?.size() || 0,
      runningJob: runningJob?.id || null,
      estimatedWaitTime: await this.calculateQueueWaitTime(
        await this.deviceRegistry.getDevice(deviceId)!, 
        {} as QuantumJob
      )
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    // Find and remove job from queues
    for (const [deviceId, queue] of this.jobQueues) {
      // This would require a more sophisticated queue implementation
      // to efficiently find and remove specific jobs
    }
    
    // Cancel running job if applicable
    for (const [deviceId, runningJob] of this.runningJobs) {
      if (runningJob.id === jobId) {
        this.runningJobs.delete(deviceId);
        return true;
      }
    }
    
    return false;
  }

  getSchedulerStats(): any {
    const totalQueued = Array.from(this.jobQueues.values())
      .reduce((total, queue) => total + queue.size(), 0);
    
    return {
      totalQueuedJobs: totalQueued,
      runningJobs: this.runningJobs.size,
      activeDevices: this.jobQueues.size
    };
  }
}