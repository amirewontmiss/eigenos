import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { QuantumOSConfig } from './quantum-os';

export class ConfigManager {
  private readonly configPath: string;
  private config: QuantumOSConfig | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'quantumos-config.json');
  }

  async getConfig(): Promise<QuantumOSConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = { ...this.getDefaultConfig(), ...JSON.parse(configData) };
    } catch (error) {
      // Config file doesn't exist or is invalid, use defaults
      this.config = this.getDefaultConfig();
      await this.saveConfig();
    }

    return this.config;
  }

  async setConfig(newConfig: Partial<QuantumOSConfig>): Promise<void> {
    this.config = { ...await this.getConfig(), ...newConfig };
    await this.saveConfig();
  }

  private async saveConfig(): Promise<void> {
    if (!this.config) return;

    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  private getDefaultConfig(): QuantumOSConfig {
    return {
      providers: {
        ibm: {
          enabled: false,
          token: undefined,
          hub: 'ibm-q',
          group: 'open',
          project: 'main'
        },
        google: {
          enabled: false,
          credentials: undefined
        },
        rigetti: {
          enabled: false,
          apiKey: undefined
        }
      },
      python: {
        path: 'python3',
        environment: 'quantum-env'
      },
      scheduler: {
        defaultOptimizationLevel: 2,
        maxConcurrentJobs: 10,
        queueTimeout: 3600000 // 1 hour
      },
      simulation: {
        maxQubits: 30,
        maxShots: 100000,
        defaultShots: 1024
      }
    };
  }
}