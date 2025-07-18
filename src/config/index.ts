// Central configuration module exports
export * from './environment.config';
export * from './configuration.service';

// Re-export commonly used items for convenience
export { 
  config as defaultConfig,
  validateConfig,
  getDatabaseConfig,
  getQuantumProviderConfig,
  isProduction,
  isDevelopment,
  isTest
} from './environment.config';

export { 
  configurationService as config
} from './configuration.service';