import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
config({ path: join(process.cwd(), '.env') });

export interface DatabaseConfig {
  path: string;
  type: 'sqlite' | 'postgres' | 'mysql';
  logging: boolean;
  synchronize: boolean;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
}

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigin: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  encryptionKey: string;
  sessionSecret: string;
}

export interface QuantumProviderConfigs {
  ibm: {
    token?: string;
    hub?: string;
    group?: string;
    project?: string;
  };
  google: {
    projectId?: string;
    credentialsPath?: string;
  };
  aws: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    braketS3Bucket?: string;
  };
  rigetti: {
    apiKey?: string;
    userId?: string;
  };
  ionq: {
    apiKey?: string;
  };
}

export interface PythonConfig {
  pythonPath: string;
  virtualEnv: string;
  requirementsPath: string;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  filePath: string;
  maxSize: string;
  maxFiles: number;
}

export interface PerformanceConfig {
  maxConcurrentJobs: number;
  jobTimeoutSeconds: number;
  circuitCacheSize: number;
  resultCacheTTL: number;
}

export interface DevelopmentConfig {
  nodeEnv: 'development' | 'production' | 'test';
  debug: string;
  hotReload: boolean;
  devServerPort: number;
}

export interface MonitoringConfig {
  telemetryEnabled: boolean;
  metricsPort: number;
  healthCheckPort: number;
  tracingEnabled: boolean;
}

export interface BackupConfig {
  enabled: boolean;
  intervalHours: number;
  retentionDays: number;
  path: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
}

export interface NotificationConfig {
  enabled: boolean;
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
}

export interface QuantumOSConfig {
  database: DatabaseConfig;
  server: ServerConfig;
  security: SecurityConfig;
  quantumProviders: QuantumProviderConfigs;
  python: PythonConfig;
  logging: LoggingConfig;
  performance: PerformanceConfig;
  development: DevelopmentConfig;
  monitoring: MonitoringConfig;
  backup: BackupConfig;
  email: EmailConfig;
  notifications: NotificationConfig;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value || defaultValue!;
}

function getEnvVarOptional(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

function getEnvVarNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
  }
  return parsed;
}

function getEnvVarBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

export const config: QuantumOSConfig = {
  database: {
    path: getEnvVar('DATABASE_PATH', 'quantumos.db'),
    type: (getEnvVar('DATABASE_TYPE', 'sqlite') as any),
    logging: getEnvVarBoolean('DATABASE_LOGGING', false),
    synchronize: getEnvVarBoolean('DATABASE_SYNCHRONIZE', true),
    host: getEnvVarOptional('DATABASE_HOST'),
    port: process.env.DATABASE_PORT ? getEnvVarNumber('DATABASE_PORT', 5432) : undefined,
    username: getEnvVarOptional('DATABASE_USERNAME'),
    password: getEnvVarOptional('DATABASE_PASSWORD'),
    database: getEnvVarOptional('DATABASE_NAME')
  },

  server: {
    port: getEnvVarNumber('SERVER_PORT', 3000),
    host: getEnvVar('SERVER_HOST', 'localhost'),
    corsOrigin: getEnvVar('SERVER_CORS_ORIGIN', '*')
  },

  security: {
    jwtSecret: getEnvVar('JWT_SECRET', 'dev-jwt-secret-key'),
    encryptionKey: getEnvVar('ENCRYPTION_KEY', 'dev-encryption-key'),
    sessionSecret: getEnvVar('SESSION_SECRET', 'dev-session-secret')
  },

  quantumProviders: {
    ibm: {
      token: getEnvVarOptional('IBM_QUANTUM_TOKEN'),
      hub: getEnvVarOptional('IBM_QUANTUM_HUB'),
      group: getEnvVarOptional('IBM_QUANTUM_GROUP'),
      project: getEnvVarOptional('IBM_QUANTUM_PROJECT')
    },
    google: {
      projectId: getEnvVarOptional('GOOGLE_CLOUD_PROJECT_ID'),
      credentialsPath: getEnvVarOptional('GOOGLE_CLOUD_CREDENTIALS_PATH')
    },
    aws: {
      accessKeyId: getEnvVarOptional('AWS_ACCESS_KEY_ID'),
      secretAccessKey: getEnvVarOptional('AWS_SECRET_ACCESS_KEY'),
      region: getEnvVarOptional('AWS_REGION', 'us-east-1'),
      braketS3Bucket: getEnvVarOptional('AWS_BRAKET_S3_BUCKET')
    },
    rigetti: {
      apiKey: getEnvVarOptional('RIGETTI_API_KEY'),
      userId: getEnvVarOptional('RIGETTI_USER_ID')
    },
    ionq: {
      apiKey: getEnvVarOptional('IONQ_API_KEY')
    }
  },

  python: {
    pythonPath: getEnvVar('PYTHON_PATH', 'python3'),
    virtualEnv: getEnvVar('PYTHON_VIRTUAL_ENV', 'quantum-env'),
    requirementsPath: getEnvVar('PYTHON_REQUIREMENTS_PATH', 'requirements.txt')
  },

  logging: {
    level: (getEnvVar('LOG_LEVEL', 'info') as any),
    format: (getEnvVar('LOG_FORMAT', 'json') as any),
    filePath: getEnvVar('LOG_FILE_PATH', 'logs/quantumos.log'),
    maxSize: getEnvVar('LOG_MAX_SIZE', '100MB'),
    maxFiles: getEnvVarNumber('LOG_MAX_FILES', 10)
  },

  performance: {
    maxConcurrentJobs: getEnvVarNumber('MAX_CONCURRENT_JOBS', 10),
    jobTimeoutSeconds: getEnvVarNumber('JOB_TIMEOUT_SECONDS', 3600),
    circuitCacheSize: getEnvVarNumber('CIRCUIT_CACHE_SIZE', 1000),
    resultCacheTTL: getEnvVarNumber('RESULT_CACHE_TTL', 86400)
  },

  development: {
    nodeEnv: (getEnvVar('NODE_ENV', 'development') as any),
    debug: getEnvVar('DEBUG', 'quantumos:*'),
    hotReload: getEnvVarBoolean('HOT_RELOAD', true),
    devServerPort: getEnvVarNumber('DEV_SERVER_PORT', 8080)
  },

  monitoring: {
    telemetryEnabled: getEnvVarBoolean('TELEMETRY_ENABLED', true),
    metricsPort: getEnvVarNumber('METRICS_PORT', 9090),
    healthCheckPort: getEnvVarNumber('HEALTH_CHECK_PORT', 8080),
    tracingEnabled: getEnvVarBoolean('TRACING_ENABLED', false)
  },

  backup: {
    enabled: getEnvVarBoolean('BACKUP_ENABLED', true),
    intervalHours: getEnvVarNumber('BACKUP_INTERVAL_HOURS', 24),
    retentionDays: getEnvVarNumber('BACKUP_RETENTION_DAYS', 30),
    path: getEnvVar('BACKUP_PATH', 'backups/')
  },

  email: {
    smtpHost: getEnvVar('SMTP_HOST', 'smtp.gmail.com'),
    smtpPort: getEnvVarNumber('SMTP_PORT', 587),
    smtpSecure: getEnvVarBoolean('SMTP_SECURE', false),
    smtpUser: getEnvVar('SMTP_USER', ''),
    smtpPass: getEnvVar('SMTP_PASS', '')
  },

  notifications: {
    enabled: getEnvVarBoolean('NOTIFICATIONS_ENABLED', true),
    slackWebhookUrl: getEnvVarOptional('SLACK_WEBHOOK_URL'),
    discordWebhookUrl: getEnvVarOptional('DISCORD_WEBHOOK_URL')
  }
};

// Configuration validation
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate critical security settings in production
  if (config.development.nodeEnv === 'production') {
    if (config.security.jwtSecret === 'dev-jwt-secret-key') {
      errors.push('JWT_SECRET must be set to a secure value in production');
    }
    if (config.security.encryptionKey === 'dev-encryption-key') {
      errors.push('ENCRYPTION_KEY must be set to a secure value in production');
    }
    if (config.security.sessionSecret === 'dev-session-secret') {
      errors.push('SESSION_SECRET must be set to a secure value in production');
    }
    if (config.database.synchronize) {
      errors.push('DATABASE_SYNCHRONIZE should be false in production');
    }
  }

  // Validate provider configurations
  const hasAnyProvider = Object.values(config.quantumProviders).some(provider => 
    Object.values(provider).some(value => value !== undefined && value !== '')
  );
  
  if (!hasAnyProvider) {
    console.warn('No quantum providers configured. Only simulator mode will be available.');
  }

  // Validate Python configuration
  if (!config.python.pythonPath) {
    errors.push('PYTHON_PATH must be set');
  }

  // Validate ports
  if (config.server.port === config.monitoring.metricsPort) {
    errors.push('SERVER_PORT and METRICS_PORT cannot be the same');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Helper functions for getting specific configurations
export function getDatabaseConfig(): DatabaseConfig {
  return config.database;
}

export function getQuantumProviderConfig(provider: keyof QuantumProviderConfigs): any {
  return config.quantumProviders[provider];
}

export function isProduction(): boolean {
  return config.development.nodeEnv === 'production';
}

export function isDevelopment(): boolean {
  return config.development.nodeEnv === 'development';
}

export function isTest(): boolean {
  return config.development.nodeEnv === 'test';
}

// Export the configuration object as default
export default config;