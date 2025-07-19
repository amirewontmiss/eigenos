import { QuantumCircuit } from '../core/circuit';
import { HardwareTarget, CircuitExecutionResult } from '../hardware/types';

/**
 * Base abstract class for quantum hardware backend adapters
 * Provides common interface and functionality for all quantum providers
 */
export abstract class QuantumBackend {
    protected readonly provider: string;
    protected readonly config: BackendConfig;
    protected readonly connectionPool: ConnectionPool;
    protected readonly rateLimiter: RateLimiter;
    
    constructor(provider: string, config: BackendConfig) {
        this.provider = provider;
        this.config = config;
        this.connectionPool = new ConnectionPool(config.maxConnections || 5);
        this.rateLimiter = new RateLimiter(config.requestsPerSecond || 10);
    }
    
    /**
     * Execute quantum circuit on hardware/simulator
     */
    abstract executeCircuit(
        circuit: QuantumCircuit, 
        target: HardwareTarget, 
        options: ExecutionOptions
    ): Promise<CircuitExecutionResult>;
    
    /**
     * Get available devices for this provider
     */
    abstract getAvailableDevices(): Promise<DeviceInfo[]>;
    
    /**
     * Get current device status and calibration
     */
    abstract getDeviceStatus(deviceName: string): Promise<DeviceStatus>;
    
    /**
     * Get job status for submitted circuit
     */
    abstract getJobStatus(jobId: string): Promise<JobStatus>;
    
    /**
     * Cancel a submitted job
     */
    abstract cancelJob(jobId: string): Promise<boolean>;
    
    /**
     * Estimate job cost and execution time
     */
    abstract estimateJob(
        circuit: QuantumCircuit, 
        target: HardwareTarget, 
        options: ExecutionOptions
    ): Promise<JobEstimate>;
    
    /**
     * Test connection to provider
     */
    async testConnection(): Promise<ConnectionStatus> {
        try {
            const devices = await this.getAvailableDevices();
            return {
                connected: true,
                latency: await this.measureLatency(),
                deviceCount: devices.length,
                timestamp: new Date()
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                timestamp: new Date()
            };
        }
    }
    
    /**
     * Measure round-trip latency to provider
     */
    protected async measureLatency(): Promise<number> {
        const startTime = performance.now();
        try {
            await this.ping();
            return performance.now() - startTime;
        } catch {
            return -1;
        }
    }
    
    /**
     * Simple ping to provider endpoint
     */
    protected abstract ping(): Promise<void>;
    
    /**
     * Authenticate with provider
     */
    protected abstract authenticate(): Promise<AuthenticationResult>;
    
    /**
     * Prepare circuit for provider-specific format
     */
    protected abstract prepareCircuit(
        circuit: QuantumCircuit, 
        target: HardwareTarget
    ): Promise<any>;
    
    /**
     * Parse provider-specific results back to standard format
     */
    protected abstract parseResults(
        providerResults: any, 
        target: HardwareTarget
    ): Promise<CircuitExecutionResult>;
    
    /**
     * Handle provider-specific errors
     */
    protected handleProviderError(error: any): QuantumBackendError {
        return new QuantumBackendError(
            `${this.provider} Backend Error`,
            error.message || 'Unknown error',
            error.code || 'UNKNOWN',
            this.provider
        );
    }
    
    /**
     * Wait for rate limiting
     */
    protected async waitForRateLimit(): Promise<void> {
        await this.rateLimiter.wait();
    }
    
    /**
     * Get an available connection from the pool
     */
    protected async getConnection(): Promise<BackendConnection> {
        return await this.connectionPool.acquire();
    }
    
    /**
     * Release connection back to pool
     */
    protected releaseConnection(connection: BackendConnection): void {
        this.connectionPool.release(connection);
    }
}

/**
 * Connection pooling for backend connections
 */
class ConnectionPool {
    private connections: BackendConnection[] = [];
    private available: BackendConnection[] = [];
    private waiting: Array<(connection: BackendConnection) => void> = [];
    private maxConnections: number;
    
    constructor(maxConnections: number) {
        this.maxConnections = maxConnections;
    }
    
    async acquire(): Promise<BackendConnection> {
        if (this.available.length > 0) {
            return this.available.pop()!;
        }
        
        if (this.connections.length < this.maxConnections) {
            const connection = new BackendConnection();
            this.connections.push(connection);
            return connection;
        }
        
        // Wait for available connection
        return new Promise((resolve) => {
            this.waiting.push(resolve);
        });
    }
    
    release(connection: BackendConnection): void {
        if (this.waiting.length > 0) {
            const waitingCallback = this.waiting.shift()!;
            waitingCallback(connection);
        } else {
            this.available.push(connection);
        }
    }
    
    destroy(): void {
        for (const connection of this.connections) {
            connection.close();
        }
        this.connections = [];
        this.available = [];
        this.waiting = [];
    }
}

/**
 * Rate limiting for API requests
 */
class RateLimiter {
    private tokens: number;
    private maxTokens: number;
    private refillRate: number;
    private lastRefill: number;
    
    constructor(requestsPerSecond: number) {
        this.maxTokens = requestsPerSecond;
        this.tokens = requestsPerSecond;
        this.refillRate = requestsPerSecond;
        this.lastRefill = Date.now();
    }
    
    async wait(): Promise<void> {
        this.refillTokens();
        
        if (this.tokens >= 1) {
            this.tokens--;
            return;
        }
        
        // Calculate wait time
        const waitTime = (1 - this.tokens) / this.refillRate * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        this.refillTokens();
        this.tokens--;
    }
    
    private refillTokens(): void {
        const now = Date.now();
        const timePassed = (now - this.lastRefill) / 1000;
        const tokensToAdd = timePassed * this.refillRate;
        
        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }
}

/**
 * Backend connection wrapper
 */
class BackendConnection {
    private isActive: boolean = true;
    private lastUsed: Date = new Date();
    
    isReady(): boolean {
        return this.isActive;
    }
    
    markUsed(): void {
        this.lastUsed = new Date();
    }
    
    close(): void {
        this.isActive = false;
    }
    
    getLastUsed(): Date {
        return this.lastUsed;
    }
}

// Type definitions
export interface BackendConfig {
    apiKey?: string;
    endpoint?: string;
    timeout?: number;
    maxConnections?: number;
    requestsPerSecond?: number;
    retryAttempts?: number;
    retryDelay?: number;
    enableCaching?: boolean;
    cacheSize?: number;
    credentials?: Record<string, any>;
}

export interface ExecutionOptions {
    shots: number;
    timeout?: number;
    priority?: 'low' | 'normal' | 'high';
    optimization?: boolean;
    errorMitigation?: boolean;
    dynamicalDecoupling?: boolean;
    readoutMitigation?: boolean;
    memorySlots?: number;
    measurementLevel?: 'classified' | 'kerneled' | 'discriminated';
    metadata?: Record<string, any>;
}

export interface DeviceInfo {
    name: string;
    provider: string;
    status: 'online' | 'offline' | 'maintenance';
    qubits: number;
    topology: string;
    errorRate: number;
    queueLength: number;
    averageWaitTime: number;
    maxShots: number;
    maxCircuitDepth: number;
    supportedGates: string[];
    calibrationTimestamp: Date;
}

export interface DeviceStatus {
    name: string;
    status: 'online' | 'offline' | 'maintenance';
    queueLength: number;
    averageWaitTime: number;
    lastCalibration: Date;
    errorRates: Map<string, number>;
    readoutFidelity: number[];
    temperature: number;
    uptime: number;
}

export interface JobStatus {
    jobId: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    queuePosition?: number;
    estimatedStartTime?: Date;
    estimatedCompletionTime?: Date;
    actualStartTime?: Date;
    actualCompletionTime?: Date;
    results?: CircuitExecutionResult;
    error?: string;
    cost?: number;
    shots?: number;
    deviceUsed?: string;
}

export interface JobEstimate {
    estimatedCost: number;
    estimatedWaitTime: number;
    estimatedExecutionTime: number;
    recommendedDevice?: string;
    optimizations?: string[];
    warnings?: string[];
}

export interface ConnectionStatus {
    connected: boolean;
    latency?: number;
    deviceCount?: number;
    error?: string;
    timestamp: Date;
}

export interface AuthenticationResult {
    success: boolean;
    token?: string;
    expiresAt?: Date;
    permissions?: string[];
    error?: string;
}

export class QuantumBackendError extends Error {
    constructor(
        public title: string,
        message: string,
        public code: string,
        public provider: string,
        public details?: any
    ) {
        super(message);
        this.name = 'QuantumBackendError';
    }
}