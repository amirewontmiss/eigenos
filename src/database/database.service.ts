import { DataSource, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { QuantumCircuitEntity } from './entities/quantum-circuit.entity';
import { QuantumJobEntity } from './entities/quantum-job.entity';
import { QuantumDeviceEntity } from './entities/quantum-device.entity';
import { configurationService } from '../config/configuration.service';

export class DatabaseService {
  private dataSource: DataSource;
  private isInitialized = false;

  constructor() {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const dbConfig = configurationService.getDatabaseConfig();
    
    this.dataSource = new DataSource({
      type: dbConfig.type as any,
      database: dbConfig.path,
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      entities: [
        UserEntity,
        QuantumCircuitEntity,
        QuantumJobEntity,
        QuantumDeviceEntity
      ],
      synchronize: dbConfig.synchronize,
      logging: dbConfig.logging,
      migrations: ['migrations/*.ts'],
      subscribers: ['subscribers/*.ts']
    });

    try {
      await this.dataSource.initialize();
      this.isInitialized = true;
      console.log('Database connection initialized successfully');
      
      // Create default admin user if none exists
      await this.createDefaultUser();
    } catch (error) {
      console.error('Error during database initialization:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (this.dataSource && this.isInitialized) {
      await this.dataSource.destroy();
      this.isInitialized = false;
    }
  }

  // Repository getters
  getUserRepository(): Repository<UserEntity> {
    this.ensureInitialized();
    return this.dataSource.getRepository(UserEntity);
  }

  getCircuitRepository(): Repository<QuantumCircuitEntity> {
    this.ensureInitialized();
    return this.dataSource.getRepository(QuantumCircuitEntity);
  }

  getJobRepository(): Repository<QuantumJobEntity> {
    this.ensureInitialized();
    return this.dataSource.getRepository(QuantumJobEntity);
  }

  getDeviceRepository(): Repository<QuantumDeviceEntity> {
    this.ensureInitialized();
    return this.dataSource.getRepository(QuantumDeviceEntity);
  }

  // Transaction helper
  async transaction<T>(fn: (repositories: {
    userRepo: Repository<UserEntity>;
    circuitRepo: Repository<QuantumCircuitEntity>;
    jobRepo: Repository<QuantumJobEntity>;
    deviceRepo: Repository<QuantumDeviceEntity>;
  }) => Promise<T>): Promise<T> {
    this.ensureInitialized();
    
    return this.dataSource.transaction(async (manager) => {
      return fn({
        userRepo: manager.getRepository(UserEntity),
        circuitRepo: manager.getRepository(QuantumCircuitEntity),
        jobRepo: manager.getRepository(QuantumJobEntity),
        deviceRepo: manager.getRepository(QuantumDeviceEntity)
      });
    });
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isInitialized) return false;
      
      // Simple query to check database connectivity
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Database statistics
  async getStats(): Promise<{
    users: number;
    circuits: number;
    jobs: number;
    devices: number;
    totalSize: number;
  }> {
    this.ensureInitialized();

    const [users, circuits, jobs, devices] = await Promise.all([
      this.getUserRepository().count(),
      this.getCircuitRepository().count(),
      this.getJobRepository().count(),
      this.getDeviceRepository().count()
    ]);

    // Get database file size (SQLite specific)
    let totalSize = 0;
    try {
      const fs = require('fs');
      const dbConfig = configurationService.getDatabaseConfig();
      const stats = fs.statSync(dbConfig.path);
      totalSize = stats.size;
    } catch (error) {
      console.warn('Could not get database file size:', error);
    }

    return {
      users,
      circuits,
      jobs,
      devices,
      totalSize
    };
  }

  // Backup and restore
  async backup(backupPath: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const fs = require('fs');
      const dbConfig = configurationService.getDatabaseConfig();
      fs.copyFileSync(dbConfig.path, backupPath);
      console.log(`Database backed up to ${backupPath}`);
    } catch (error) {
      console.error('Database backup failed:', error);
      throw error;
    }
  }

  async restore(backupPath: string): Promise<void> {
    try {
      // Close current connection
      if (this.isInitialized) {
        await this.destroy();
      }

      // Copy backup file
      const fs = require('fs');
      const dbConfig = configurationService.getDatabaseConfig();
      fs.copyFileSync(backupPath, dbConfig.path);

      // Reinitialize
      await this.initialize();
      console.log(`Database restored from ${backupPath}`);
    } catch (error) {
      console.error('Database restore failed:', error);
      throw error;
    }
  }

  // Cleanup old data
  async cleanup(options: {
    deleteOldJobs?: boolean;
    deleteOldCircuits?: boolean;
    jobRetentionDays?: number;
    circuitRetentionDays?: number;
  } = {}): Promise<void> {
    this.ensureInitialized();

    const {
      deleteOldJobs = false,
      deleteOldCircuits = false,
      jobRetentionDays = 30,
      circuitRetentionDays = 90
    } = options;

    await this.transaction(async ({ jobRepo, circuitRepo }) => {
      if (deleteOldJobs) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - jobRetentionDays);
        
        const result = await jobRepo
          .createQueryBuilder()
          .delete()
          .where('createdAt < :cutoff', { cutoff: cutoffDate })
          .andWhere('status IN (:...statuses)', { 
            statuses: ['completed', 'failed', 'cancelled'] 
          })
          .execute();
          
        console.log(`Deleted ${result.affected} old jobs`);
      }

      if (deleteOldCircuits) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - circuitRetentionDays);
        
        const result = await circuitRepo
          .createQueryBuilder()
          .delete()
          .where('createdAt < :cutoff', { cutoff: cutoffDate })
          .andWhere('usage_count = 0')
          .andWhere('isTemplate = false')
          .execute();
          
        console.log(`Deleted ${result.affected} old circuits`);
      }
    });
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
  }

  private async createDefaultUser(): Promise<void> {
    const userRepo = this.getUserRepository();
    const existingUsers = await userRepo.count();
    
    if (existingUsers === 0) {
      const defaultUser = userRepo.create({
        username: 'admin',
        email: 'admin@quantumos.local',
        passwordHash: 'default_hash', // This should be properly hashed in production
        firstName: 'Admin',
        lastName: 'User',
        licenseKey: 'QUANTUMOS-ADMIN-LICENSE',
        licenseType: 'enterprise' as any,
        role: 'admin' as any,
        isActive: true,
        emailVerified: true,
        preferences: {
          theme: 'dark',
          notifications: true,
          defaultShots: 1024,
          schedulingWeights: {
            performance: 0.3,
            cost: 0.2,
            reliability: 0.2,
            availability: 0.3
          },
          preferredProviders: ['IBM'],
          maxCostPerJob: 100,
          maxWaitTime: 3600000
        },
        quotas: {
          maxJobs: 1000,
          maxCircuits: 500,
          maxShotsPerJob: 100000,
          maxJobsPerHour: 50,
          storageLimit: 1024 // 1GB
        }
      });

      await userRepo.save(defaultUser);
      console.log('Default admin user created');
    }
  }
}