import { EventEmitter } from 'events';
import { configurationService } from './config/configuration.service';
import { DatabaseService } from './database/database.service';
import { PythonBridge } from './quantum/bridges/python-bridge';
import { QuantumScheduler } from './quantum/scheduler/quantum-scheduler';

export class AppService extends EventEmitter {
  private static instance: AppService;
  private isInitialized = false;
  private isShuttingDown = false;

  // Core services
  private databaseService: DatabaseService;
  private pythonBridge: PythonBridge;
  private quantumScheduler: QuantumScheduler;

  private constructor() {
    super();
    this.databaseService = new DatabaseService();
    this.pythonBridge = new PythonBridge();
    this.quantumScheduler = new QuantumScheduler();
  }

  static getInstance(): AppService {
    if (!AppService.instance) {
      AppService.instance = new AppService();
    }
    return AppService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('Starting QuantumOS application initialization...');

      // Initialize configuration service first
      await configurationService.initialize();
      console.log('✓ Configuration service initialized');

      // Initialize database
      await this.databaseService.initialize();
      console.log('✓ Database service initialized');

      // Initialize Python bridge
      await this.initializePythonBridge();
      console.log('✓ Python bridge initialized');

      // Initialize quantum scheduler
      await this.initializeQuantumScheduler();
      console.log('✓ Quantum scheduler initialized');

      // Set up service monitoring
      this.setupServiceMonitoring();
      console.log('✓ Service monitoring enabled');

      // Set up graceful shutdown handlers
      this.setupGracefulShutdown();
      console.log('✓ Graceful shutdown handlers registered');

      this.isInitialized = true;
      this.emit('initialized');
      console.log('🚀 QuantumOS application initialized successfully');

      // Perform health check
      const healthStatus = await this.healthCheck();
      console.log('📊 Application health check:', healthStatus);

    } catch (error: any) {
      console.error('❌ Failed to initialize QuantumOS application:', error);
      this.emit('error', error);
      throw error;
    }
  }

  private async initializePythonBridge(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Python bridge initialization timeout'));
      }, 60000); // 60 second timeout

      const onInitialized = () => {
        clearTimeout(timeout);
        this.pythonBridge.removeListener('error', onError);
        resolve();
      };

      const onError = (error: Error) => {
        clearTimeout(timeout);
        this.pythonBridge.removeListener('initialized', onInitialized);
        reject(error);
      };

      this.pythonBridge.once('initialized', onInitialized);
      this.pythonBridge.once('error', onError);
    });
  }

  private async initializeQuantumScheduler(): Promise<void> {
    await this.quantumScheduler.initialize(this.databaseService);
  }

  private setupServiceMonitoring(): void {
    // Monitor configuration changes
    configurationService.on('configurationChanged', (filePath) => {
      console.log(`Configuration file changed: ${filePath}`);
      this.emit('configurationChanged', filePath);
    });

    configurationService.on('error', (error) => {
      console.error('Configuration service error:', error);
      this.emit('serviceError', { service: 'configuration', error });
    });

    // Monitor Python bridge
    this.pythonBridge.on('status', (status) => {
      console.log(`Python bridge status: ${status}`);
      this.emit('pythonBridgeStatus', status);
    });

    this.pythonBridge.on('error', (error) => {
      console.error('Python bridge error:', error);
      this.emit('serviceError', { service: 'pythonBridge', error });
    });

    // Monitor quantum scheduler
    this.quantumScheduler.on('jobScheduled', (job) => {
      console.log(`Job scheduled: ${job.id}`);
      this.emit('jobScheduled', job);
    });

    this.quantumScheduler.on('jobCompleted', (job) => {
      console.log(`Job completed: ${job.id}`);
      this.emit('jobCompleted', job);
    });

    this.quantumScheduler.on('error', (error) => {
      console.error('Quantum scheduler error:', error);
      this.emit('serviceError', { service: 'quantumScheduler', error });
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      
      console.log(`Received ${signal}, initiating graceful shutdown...`);
      this.isShuttingDown = true;

      try {
        await this.destroy();
        console.log('✓ QuantumOS application shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      shutdown('uncaughtException').catch(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection').catch(() => process.exit(1));
    });
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      configuration: boolean;
      database: boolean;
      pythonBridge: boolean;
      quantumScheduler: boolean;
    };
    details: any;
  }> {
    const services = {
      configuration: false,
      database: false,
      pythonBridge: false,
      quantumScheduler: false
    };

    let details: any = {};

    try {
      // Check configuration service
      const configHealth = await configurationService.healthCheck();
      services.configuration = configHealth.status === 'healthy';
      details.configuration = configHealth;
    } catch (error) {
      details.configuration = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    try {
      // Check database service
      services.database = await this.databaseService.healthCheck();
      if (services.database) {
        details.database = await this.databaseService.getStats();
      }
    } catch (error) {
      details.database = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    try {
      // Check Python bridge
      services.pythonBridge = this.pythonBridge.isReady();
      details.pythonBridge = {
        ready: services.pythonBridge,
        environmentInfo: this.pythonBridge.getEnvironmentInfo()
      };
    } catch (error) {
      details.pythonBridge = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    try {
      // Check quantum scheduler
      services.quantumScheduler = this.quantumScheduler.isInitialized();
      details.quantumScheduler = {
        initialized: services.quantumScheduler
      };
    } catch (error) {
      details.quantumScheduler = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Determine overall status
    const healthyServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      status = 'healthy';
    } else if (healthyServices >= totalServices / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services,
      details
    };
  }

  // Service getters
  getDatabaseService(): DatabaseService {
    this.ensureInitialized();
    return this.databaseService;
  }

  getPythonBridge(): PythonBridge {
    this.ensureInitialized();
    return this.pythonBridge;
  }

  getQuantumScheduler(): QuantumScheduler {
    this.ensureInitialized();
    return this.quantumScheduler;
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<{
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: any;
    services: {
      database: any;
      pythonBridge: any;
      quantumScheduler: any;
    };
  }> {
    const metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      services: {
        database: {},
        pythonBridge: {},
        quantumScheduler: {}
      }
    };

    try {
      metrics.services.database = await this.databaseService.getStats();
    } catch (error) {
      metrics.services.database = { error: 'Unable to get database stats' };
    }

    try {
      metrics.services.pythonBridge = {
        environmentInfo: this.pythonBridge.getEnvironmentInfo(),
        ready: this.pythonBridge.isReady()
      };
    } catch (error) {
      metrics.services.pythonBridge = { error: 'Unable to get Python bridge stats' };
    }

    return metrics;
  }

  // Backup and maintenance
  async performMaintenance(): Promise<void> {
    console.log('Starting application maintenance...');

    try {
      // Database cleanup
      await this.databaseService.cleanup({
        deleteOldJobs: true,
        deleteOldCircuits: true,
        jobRetentionDays: 30,
        circuitRetentionDays: 90
      });
      console.log('✓ Database cleanup completed');

      // Database backup
      if (configurationService.getBackupConfig().enabled) {
        const backupPath = `backups/quantumos-${new Date().toISOString().split('T')[0]}.db`;
        await this.databaseService.backup(backupPath);
        console.log(`✓ Database backup created: ${backupPath}`);
      }

      // Python environment validation
      const pythonValid = await this.pythonBridge.validateEnvironment();
      console.log(`✓ Python environment validation: ${pythonValid ? 'passed' : 'failed'}`);

      console.log('✓ Application maintenance completed');
    } catch (error) {
      console.error('❌ Maintenance failed:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (!this.isInitialized) return;

    console.log('Shutting down QuantumOS application...');

    try {
      // Stop quantum scheduler
      if (this.quantumScheduler) {
        await this.quantumScheduler.destroy();
        console.log('✓ Quantum scheduler stopped');
      }

      // Stop Python bridge
      if (this.pythonBridge) {
        this.pythonBridge.destroy();
        console.log('✓ Python bridge stopped');
      }

      // Close database connection
      if (this.databaseService) {
        await this.databaseService.destroy();
        console.log('✓ Database connection closed');
      }

      // Stop configuration service
      if (configurationService) {
        configurationService.destroy();
        console.log('✓ Configuration service stopped');
      }

      this.removeAllListeners();
      this.isInitialized = false;

    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Application service not initialized. Call initialize() first.');
    }
  }

  isReady(): boolean {
    return this.isInitialized && !this.isShuttingDown;
  }
}

// Export singleton instance
export const appService = AppService.getInstance();