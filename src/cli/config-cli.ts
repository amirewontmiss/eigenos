#!/usr/bin/env node

import { program } from 'commander';
import { configurationService } from '../config/configuration.service';
import { validateConfig } from '../config/environment.config';
import * as fs from 'fs';
import * as path from 'path';

program
  .name('quantumos-config')
  .description('QuantumOS Configuration Management CLI')
  .version('1.0.0');

program
  .command('validate')
  .description('Validate the current configuration')
  .action(async () => {
    try {
      console.log('Validating QuantumOS configuration...');
      await configurationService.initialize();
      validateConfig();
      console.log('✅ Configuration is valid');
      
      const healthCheck = await configurationService.healthCheck();
      console.log('\nHealth Check Results:');
      console.log(`Status: ${healthCheck.status}`);
      console.log('Details:', JSON.stringify(healthCheck.details, null, 2));
      
    } catch (error: any) {
      console.error('❌ Configuration validation failed:');
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command('providers')
  .description('List available quantum providers')
  .action(async () => {
    try {
      await configurationService.initialize();
      const providers = configurationService.getAvailableProviders();
      
      console.log('Available Quantum Providers:');
      if (providers.length === 0) {
        console.log('  No providers configured');
      } else {
        providers.forEach(provider => {
          console.log(`  ✓ ${provider.toUpperCase()}`);
        });
      }
      
      console.log('\nProvider Validation:');
      const validationResults = await configurationService.validateProviderConfigurations();
      validationResults.forEach(result => {
        const status = result.available ? '✅' : '❌';
        const error = result.error ? ` (${result.error})` : '';
        console.log(`  ${status} ${result.provider.toUpperCase()}${error}`);
      });
      
    } catch (error: any) {
      console.error('❌ Failed to check providers:', error.message);
      process.exit(1);
    }
  });

program
  .command('export')
  .description('Export current configuration (with sensitive data masked)')
  .option('-o, --output <file>', 'Output file path', 'config-export.json')
  .action(async (options) => {
    try {
      await configurationService.initialize();
      const exportedConfig = configurationService.exportConfiguration();
      
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, JSON.stringify(exportedConfig, null, 2));
      
      console.log(`✅ Configuration exported to: ${outputPath}`);
    } catch (error: any) {
      console.error('❌ Failed to export configuration:', error.message);
      process.exit(1);
    }
  });

program
  .command('env')
  .description('Environment-related commands')
  .addCommand(
    program.createCommand('check')
      .description('Check environment variables')
      .action(async () => {
        try {
          await configurationService.initialize();
          const config = configurationService.getConfig();
          
          console.log('Environment Check:');
          console.log(`Node Environment: ${config.development.nodeEnv}`);
          console.log(`Production Mode: ${configurationService.isProduction()}`);
          console.log(`Development Mode: ${configurationService.isDevelopment()}`);
          console.log(`Test Mode: ${configurationService.isTest()}`);
          console.log(`Telemetry Enabled: ${configurationService.isTelemetryEnabled()}`);
          console.log(`Backup Enabled: ${configurationService.isBackupEnabled()}`);
          console.log(`Notifications Enabled: ${configurationService.areNotificationsEnabled()}`);
          
        } catch (error: any) {
          console.error('❌ Environment check failed:', error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    program.createCommand('create')
      .description('Create .env file from template')
      .option('-f, --force', 'Overwrite existing .env file')
      .action((options) => {
        const envPath = '.env';
        const examplePath = '.env.example';
        
        if (!fs.existsSync(examplePath)) {
          console.error('❌ .env.example file not found');
          process.exit(1);
        }
        
        if (fs.existsSync(envPath) && !options.force) {
          console.error('❌ .env file already exists. Use --force to overwrite.');
          process.exit(1);
        }
        
        try {
          fs.copyFileSync(examplePath, envPath);
          console.log('✅ .env file created from template');
          console.log('📝 Please edit .env file with your actual configuration values');
        } catch (error: any) {
          console.error('❌ Failed to create .env file:', error.message);
          process.exit(1);
        }
      })
  );

program
  .command('python')
  .description('Python environment commands')
  .addCommand(
    program.createCommand('check')
      .description('Check Python environment')
      .action(async () => {
        try {
          await configurationService.initialize();
          const pythonConfig = configurationService.getPythonConfig();
          
          console.log('Python Environment Check:');
          console.log(`Python Path: ${pythonConfig.pythonPath}`);
          console.log(`Virtual Environment: ${pythonConfig.virtualEnv}`);
          console.log(`Requirements File: ${pythonConfig.requirementsPath}`);
          
          // Check if requirements file exists
          if (fs.existsSync(pythonConfig.requirementsPath)) {
            console.log('✅ Requirements file found');
          } else {
            console.log('❌ Requirements file not found');
          }
          
        } catch (error: any) {
          console.error('❌ Python environment check failed:', error.message);
          process.exit(1);
        }
      })
  );

program
  .command('database')
  .description('Database configuration commands')
  .addCommand(
    program.createCommand('info')
      .description('Show database configuration')
      .action(async () => {
        try {
          await configurationService.initialize();
          const dbConfig = configurationService.getDatabaseConfig();
          
          console.log('Database Configuration:');
          console.log(`Type: ${dbConfig.type}`);
          console.log(`Path/Database: ${dbConfig.path || dbConfig.database}`);
          if (dbConfig.host) console.log(`Host: ${dbConfig.host}`);
          if (dbConfig.port) console.log(`Port: ${dbConfig.port}`);
          if (dbConfig.username) console.log(`Username: ${dbConfig.username}`);
          console.log(`Logging: ${dbConfig.logging}`);
          console.log(`Synchronize: ${dbConfig.synchronize}`);
          
        } catch (error: any) {
          console.error('❌ Database info failed:', error.message);
          process.exit(1);
        }
      })
  );

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}