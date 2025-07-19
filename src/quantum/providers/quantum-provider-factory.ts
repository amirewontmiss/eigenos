import { QuantumProvider } from './quantum-provider.interface';
import { IBMQuantumProviderReal } from './ibm/ibm-quantum-provider-real';
import { GoogleQuantumProvider } from './google/google-quantum-provider';
import { RigettiQuantumProvider } from './rigetti/rigetti-quantum-provider';
import { IonQQuantumProvider } from './ionq/ionq-quantum-provider';
import { configurationService } from '../../config/configuration.service';

export interface ProviderStatus {
  id: string;
  name: string;
  available: boolean;
  authenticated: boolean;
  deviceCount: number;
  error?: string;
  lastChecked: Date;
}

export class QuantumProviderFactory {
  private static providers = new Map<string, QuantumProvider>();
  private static providerStatus = new Map<string, ProviderStatus>();

  static async initializeAllProviders(logger: any): Promise<void> {
    logger.info('Initializing all quantum providers...');
    
    const initPromises = [
      this.initializeIBMProvider(logger),
      this.initializeGoogleProvider(logger),
      this.initializeRigettiProvider(logger),
      this.initializeIonQProvider(logger)
    ];

    await Promise.allSettled(initPromises);
    
    logger.info(`Initialized ${this.providers.size} quantum providers`);
  }

  private static async initializeIBMProvider(logger: any): Promise<void> {
    try {
      const config = configurationService.getQuantumProviderConfig('ibm');
      
      if (!config.token) {
        this.setProviderStatus('ibm', {
          id: 'ibm',
          name: 'IBM Quantum',
          available: false,
          authenticated: false,
          deviceCount: 0,
          error: 'No API token configured',
          lastChecked: new Date()
        });
        return;
      }

      const provider = new IBMQuantumProviderReal({
        apiToken: config.token,
        hub: config.hub,
        group: config.group,
        project: config.project
      }, logger);

      const authResult = await provider.authenticate({});
      if (!authResult.success) {
        throw new Error(authResult.error);
      }

      const devices = await provider.getDevices();
      
      this.providers.set('ibm', provider);
      this.setProviderStatus('ibm', {
        id: 'ibm',
        name: 'IBM Quantum',
        available: true,
        authenticated: true,
        deviceCount: devices.length,
        lastChecked: new Date()
      });

      logger.info(`IBM Quantum provider initialized with ${devices.length} devices`);

    } catch (error: any) {
      logger.error('Failed to initialize IBM provider', error);
      this.setProviderStatus('ibm', {
        id: 'ibm',
        name: 'IBM Quantum',
        available: false,
        authenticated: false,
        deviceCount: 0,
        error: error.message,
        lastChecked: new Date()
      });
    }
  }

  private static async initializeGoogleProvider(logger: any): Promise<void> {
    try {
      const config = configurationService.getQuantumProviderConfig('google');
      
      if (!config.projectId || !config.credentialsPath) {
        this.setProviderStatus('google', {
          id: 'google',
          name: 'Google Quantum AI',
          available: false,
          authenticated: false,
          deviceCount: 0,
          error: 'No project ID or credentials configured',
          lastChecked: new Date()
        });
        return;
      }

      const fs = require('fs');
      const serviceAccountKey = JSON.parse(fs.readFileSync(config.credentialsPath, 'utf8'));

      const provider = new GoogleQuantumProvider({
        projectId: config.projectId,
        serviceAccountKey
      }, logger);

      const authResult = await provider.authenticate({});
      if (!authResult.success) {
        throw new Error(authResult.error);
      }

      const devices = await provider.getDevices();
      
      this.providers.set('google', provider);
      this.setProviderStatus('google', {
        id: 'google',
        name: 'Google Quantum AI',
        available: true,
        authenticated: true,
        deviceCount: devices.length,
        lastChecked: new Date()
      });

      logger.info(`Google Quantum AI provider initialized with ${devices.length} devices`);

    } catch (error: any) {
      logger.error('Failed to initialize Google provider', error);
      this.setProviderStatus('google', {
        id: 'google',
        name: 'Google Quantum AI',
        available: false,
        authenticated: false,
        deviceCount: 0,
        error: error.message,
        lastChecked: new Date()
      });
    }
  }

  private static async initializeRigettiProvider(logger: any): Promise<void> {
    try {
      const config = configurationService.getQuantumProviderConfig('rigetti');
      
      if (!config.apiKey || !config.userId) {
        this.setProviderStatus('rigetti', {
          id: 'rigetti',
          name: 'Rigetti QCS',
          available: false,
          authenticated: false,
          deviceCount: 0,
          error: 'No API key or user ID configured',
          lastChecked: new Date()
        });
        return;
      }

      const provider = new RigettiQuantumProvider({
        apiKey: config.apiKey,
        userId: config.userId
      }, logger);

      const authResult = await provider.authenticate({});
      if (!authResult.success) {
        throw new Error(authResult.error);
      }

      const devices = await provider.getDevices();
      
      this.providers.set('rigetti', provider);
      this.setProviderStatus('rigetti', {
        id: 'rigetti',
        name: 'Rigetti QCS',
        available: true,
        authenticated: true,
        deviceCount: devices.length,
        lastChecked: new Date()
      });

      logger.info(`Rigetti provider initialized with ${devices.length} devices`);

    } catch (error: any) {
      logger.error('Failed to initialize Rigetti provider', error);
      this.setProviderStatus('rigetti', {
        id: 'rigetti',
        name: 'Rigetti QCS',
        available: false,
        authenticated: false,
        deviceCount: 0,
        error: error.message,
        lastChecked: new Date()
      });
    }
  }

  private static async initializeIonQProvider(logger: any): Promise<void> {
    try {
      const config = configurationService.getQuantumProviderConfig('ionq');
      
      if (!config.apiKey) {
        this.setProviderStatus('ionq', {
          id: 'ionq',
          name: 'IonQ',
          available: false,
          authenticated: false,
          deviceCount: 0,
          error: 'No API key configured',
          lastChecked: new Date()
        });
        return;
      }

      const provider = new IonQQuantumProvider({
        apiKey: config.apiKey
      }, logger);

      const authResult = await provider.authenticate({});
      if (!authResult.success) {
        throw new Error(authResult.error);
      }

      const devices = await provider.getDevices();
      
      this.providers.set('ionq', provider);
      this.setProviderStatus('ionq', {
        id: 'ionq',
        name: 'IonQ',
        available: true,
        authenticated: true,
        deviceCount: devices.length,
        lastChecked: new Date()
      });

      logger.info(`IonQ provider initialized with ${devices.length} devices`);

    } catch (error: any) {
      logger.error('Failed to initialize IonQ provider', error);
      this.setProviderStatus('ionq', {
        id: 'ionq',
        name: 'IonQ',
        available: false,
        authenticated: false,
        deviceCount: 0,
        error: error.message,
        lastChecked: new Date()
      });
    }
  }

  static getProvider(providerId: string): QuantumProvider | null {
    return this.providers.get(providerId) || null;
  }

  static getAllProviders(): Map<string, QuantumProvider> {
    return new Map(this.providers);
  }

  static getProviderStatus(providerId: string): ProviderStatus | null {
    return this.providerStatus.get(providerId) || null;
  }

  static getAllProviderStatus(): ProviderStatus[] {
    return Array.from(this.providerStatus.values());
  }

  private static setProviderStatus(providerId: string, status: ProviderStatus): void {
    this.providerStatus.set(providerId, status);
  }

  static async refreshProvider(providerId: string, logger: any): Promise<void> {
    logger.info(`Refreshing provider: ${providerId}`);
    
    switch (providerId) {
      case 'ibm':
        await this.initializeIBMProvider(logger);
        break;
      case 'google':
        await this.initializeGoogleProvider(logger);
        break;
      case 'rigetti':
        await this.initializeRigettiProvider(logger);
        break;
      case 'ionq':
        await this.initializeIonQProvider(logger);
        break;
      default:
        logger.warn(`Unknown provider ID: ${providerId}`);
    }
  }

  static async refreshAllProviders(logger: any): Promise<void> {
    logger.info('Refreshing all providers...');
    await this.initializeAllProviders(logger);
  }

  static async performHealthCheck(logger: any): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    providers: Record<string, {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    }>;
  }> {
    const results: Record<string, any> = {};
    
    for (const [providerId, provider] of this.providers) {
      const startTime = Date.now();
      
      try {
        await provider.getDevices();
        results[providerId] = {
          status: 'healthy',
          responseTime: Date.now() - startTime
        };
      } catch (error: any) {
        results[providerId] = {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        };
      }
    }

    const healthyCount = Object.values(results).filter((r: any) => r.status === 'healthy').length;
    const totalCount = Object.keys(results).length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return { overall, providers: results };
  }

  static async getAllDevices(): Promise<Array<{
    device: any;
    provider: string;
    providerName: string;
  }>> {
    const allDevices: any[] = [];
    
    for (const [providerId, provider] of this.providers) {
      try {
        const devices = await provider.getDevices();
        devices.forEach(device => {
          allDevices.push({
            device,
            provider: providerId,
            providerName: provider.name
          });
        });
      } catch (error: any) {
        console.warn(`Failed to get devices from ${providerId}:`, error.message);
      }
    }
    
    return allDevices;
  }

  static async submitJobToOptimalDevice(
    job: any,
    constraints: {
      minQubits?: number;
      maxCost?: number;
      preferredProviders?: string[];
      simulator?: boolean;
    } = {}
  ): Promise<{ provider: QuantumProvider; result: any }> {
    const allDevices = await this.getAllDevices();
    
    const eligibleDevices = allDevices.filter(({ device, provider }) => {
      if (constraints.minQubits && device.topology.qubitCount < constraints.minQubits) {
        return false;
      }
      
      if (constraints.simulator !== undefined && device.simulationCapable !== constraints.simulator) {
        return false;
      }
      
      if (constraints.preferredProviders && !constraints.preferredProviders.includes(provider)) {
        return false;
      }
      
      if (constraints.maxCost && device.costModel.costPerShot * job.shots > constraints.maxCost) {
        return false;
      }
      
      return device.status === 'ONLINE';
    });

    if (eligibleDevices.length === 0) {
      throw new Error('No eligible devices found for job constraints');
    }

    const scoredDevices = eligibleDevices.map(({ device, provider, providerName }) => ({
      device,
      provider,
      providerName,
      score: 1 / (device.queueInfo.averageWaitTime + 1000)
    }));

    scoredDevices.sort((a, b) => b.score - a.score);
    
    const bestOption = scoredDevices[0];
    const providerInstance = this.getProvider(bestOption.provider);
    
    if (!providerInstance) {
      throw new Error(`Provider ${bestOption.provider} not available`);
    }

    job.device = bestOption.device;
    const result = await providerInstance.submitJob(job);
    
    return {
      provider: providerInstance,
      result
    };
  }
}