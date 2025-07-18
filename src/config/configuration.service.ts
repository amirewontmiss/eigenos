import { EventEmitter } from 'events';
import { config, validateConfig, QuantumOSConfig } from './environment.config';
import * as fs from 'fs';
import * as path from 'path';

export class ConfigurationService extends EventEmitter {
  private static instance: ConfigurationService;
  private isInitialized = false;
  private watchedFiles: string[] = [];
  private watchers: fs.FSWatcher[] = [];

  private constructor() {
    super();
  }

  static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Validate configuration
      validateConfig();
      
      // Set up file watching for configuration changes
      await this.setupConfigurationWatching();
      
      this.isInitialized = true;
      this.emit('initialized', config);
      
      console.log('Configuration service initialized successfully');
    } catch (error: any) {
      console.error('Failed to initialize configuration service:', error);
      this.emit('error', error);
      throw error;
    }
  }

  getConfig(): QuantumOSConfig {
    if (!this.isInitialized) {
      throw new Error('Configuration service not initialized. Call initialize() first.');
    }
    return config;
  }

  async reload(): Promise<void> {
    try {
      // Clear require cache for config modules
      const configModulePath = require.resolve('./environment.config');
      delete require.cache[configModulePath];
      
      // Re-import and validate
      const { config: newConfig, validateConfig: newValidateConfig } = require('./environment.config');
      newValidateConfig();
      
      this.emit('reloaded', newConfig);
      console.log('Configuration reloaded successfully');
    } catch (error: any) {
      console.error('Failed to reload configuration:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // Environment-specific configuration getters
  getDatabaseConfig() {
    return this.getConfig().database;
  }

  getServerConfig() {
    return this.getConfig().server;
  }

  getSecurityConfig() {
    return this.getConfig().security;
  }

  getQuantumProviderConfig(provider: string) {
    const providers = this.getConfig().quantumProviders;
    return (providers as any)[provider];
  }

  getPythonConfig() {
    return this.getConfig().python;
  }

  getLoggingConfig() {
    return this.getConfig().logging;
  }

  getPerformanceConfig() {
    return this.getConfig().performance;
  }

  getMonitoringConfig() {
    return this.getConfig().monitoring;
  }

  getBackupConfig() {
    return this.getConfig().backup;
  }

  getEmailConfig() {
    return this.getConfig().email;
  }

  getNotificationConfig() {
    return this.getConfig().notifications;
  }

  // Provider availability checks
  isProviderAvailable(provider: string): boolean {
    const providerConfig = this.getQuantumProviderConfig(provider);
    if (!providerConfig) return false;

    switch (provider) {
      case 'ibm':
        return !!(providerConfig.token);
      case 'google':
        return !!(providerConfig.projectId && providerConfig.credentialsPath);
      case 'aws':
        return !!(providerConfig.accessKeyId && providerConfig.secretAccessKey);
      case 'rigetti':
        return !!(providerConfig.apiKey);
      case 'ionq':
        return !!(providerConfig.apiKey);
      default:
        return false;
    }
  }

  getAvailableProviders(): string[] {
    const providers = ['ibm', 'google', 'aws', 'rigetti', 'ionq'];
    return providers.filter(provider => this.isProviderAvailable(provider));
  }

  // Environment checks
  isProduction(): boolean {
    return this.getConfig().development.nodeEnv === 'production';
  }

  isDevelopment(): boolean {
    return this.getConfig().development.nodeEnv === 'development';
  }

  isTest(): boolean {
    return this.getConfig().development.nodeEnv === 'test';
  }

  // Feature flags
  isTelemetryEnabled(): boolean {
    return this.getConfig().monitoring.telemetryEnabled;
  }

  isBackupEnabled(): boolean {
    return this.getConfig().backup.enabled;
  }

  areNotificationsEnabled(): boolean {
    return this.getConfig().notifications.enabled;
  }

  // Configuration validation and health checks
  async validateProviderConfigurations(): Promise<{
    provider: string;
    available: boolean;
    error?: string;
  }[]> {
    const providers = ['ibm', 'google', 'aws', 'rigetti', 'ionq'];
    const results: any[] = [];

    for (const provider of providers) {
      try {
        const isAvailable = this.isProviderAvailable(provider);
        results.push({
          provider,
          available: isAvailable,
          error: isAvailable ? undefined : 'Missing required configuration'
        });
      } catch (error: any) {
        results.push({
          provider,
          available: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      configurationValid: boolean;
      providersAvailable: number;
      criticalServicesConfigured: boolean;
    };
  }> {
    try {
      validateConfig();
      const configurationValid = true;
      const providersAvailable = this.getAvailableProviders().length;
      const criticalServicesConfigured = !!(
        this.getConfig().database.path &&
        this.getConfig().python.pythonPath
      );

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (!criticalServicesConfigured) {
        status = 'unhealthy';
      } else if (providersAvailable === 0) {
        status = 'degraded';
      }

      return {
        status,
        details: {
          configurationValid,
          providersAvailable,
          criticalServicesConfigured
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          configurationValid: false,
          providersAvailable: 0,
          criticalServicesConfigured: false
        }
      };
    }
  }

  // Configuration file watching
  private async setupConfigurationWatching(): Promise<void> {
    if (!this.isDevelopment()) {
      return; // Only watch in development
    }

    const configFiles = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), '.env.local'),
      path.join(process.cwd(), '.env.development'),
      path.join(process.cwd(), '.env.development.local')
    ];

    for (const filePath of configFiles) {
      if (fs.existsSync(filePath)) {
        this.watchedFiles.push(filePath);
        
        const watcher = fs.watch(filePath, { persistent: false }, (eventType) => {
          if (eventType === 'change') {
            console.log(`Configuration file changed: ${filePath}`);
            this.emit('configurationChanged', filePath);
            
            // Debounce reload calls
            setTimeout(() => {
              this.reload().catch(error => {
                console.error('Failed to reload configuration after file change:', error);
              });
            }, 1000);
          }
        });
        
        this.watchers.push(watcher);
      }
    }

    if (this.watchedFiles.length > 0) {
      console.log(`Watching ${this.watchedFiles.length} configuration files for changes`);
    }
  }

  // Export configuration for backup/debugging
  exportConfiguration(): any {
    const exportedConfig = { ...this.getConfig() };
    
    // Mask sensitive values
    exportedConfig.security = {
      ...exportedConfig.security,
      jwtSecret: '***REDACTED***',
      encryptionKey: '***REDACTED***',
      sessionSecret: '***REDACTED***'
    };

    // Mask provider credentials
    Object.keys(exportedConfig.quantumProviders).forEach(provider => {
      const providerConfig = (exportedConfig.quantumProviders as any)[provider];
      Object.keys(providerConfig).forEach(key => {
        if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
          providerConfig[key] = '***REDACTED***';
        }
      });
    });

    exportedConfig.email = {
      ...exportedConfig.email,
      smtpPass: '***REDACTED***'
    };

    return exportedConfig;
  }

  // Cleanup
  destroy(): void {
    // Close file watchers
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    this.watchedFiles = [];
    
    this.removeAllListeners();
    this.isInitialized = false;
    
    console.log('Configuration service destroyed');
  }
}

// Export singleton instance
export const configurationService = ConfigurationService.getInstance();