#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Quantum Provider Setup...\n');

// Load environment variables
require('dotenv').config();

// Validation functions
const validators = {
  async validateIBM() {
    const token = process.env.IBM_QUANTUM_TOKEN;
    if (!token || token === 'your-ibm-quantum-token-here') {
      return { valid: false, error: 'IBM_QUANTUM_TOKEN not configured' };
    }
    
    if (token.length < 50) {
      return { valid: false, error: 'IBM_QUANTUM_TOKEN appears invalid (too short)' };
    }
    
    // Test with qiskit
    return new Promise((resolve) => {
      exec(`python -c "
from qiskit_ibm_provider import IBMProvider
try:
    provider = IBMProvider('${token}')
    backends = provider.backends()
    print(f'SUCCESS: Found {len(backends)} IBM backends')
except Exception as e:
    print(f'ERROR: {str(e)}')
"`, (error, stdout, stderr) => {
        if (stdout.includes('SUCCESS')) {
          resolve({ valid: true, message: stdout.trim() });
        } else {
          resolve({ valid: false, error: stderr || stdout });
        }
      });
    });
  },

  async validateGoogle() {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const credentialsPath = process.env.GOOGLE_CLOUD_CREDENTIALS_PATH;
    
    if (!projectId || projectId === 'your-google-cloud-project-id') {
      return { valid: false, error: 'GOOGLE_CLOUD_PROJECT_ID not configured' };
    }
    
    if (!credentialsPath || !fs.existsSync(credentialsPath)) {
      return { valid: false, error: 'Google credentials file not found' };
    }
    
    try {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      if (!credentials.client_email || !credentials.private_key) {
        return { valid: false, error: 'Invalid Google credentials file format' };
      }
      return { valid: true, message: `Credentials loaded for ${credentials.client_email}` };
    } catch (error) {
      return { valid: false, error: `Failed to parse credentials: ${error.message}` };
    }
  },

  async validateRigetti() {
    const apiKey = process.env.RIGETTI_API_KEY;
    const userId = process.env.RIGETTI_USER_ID;
    
    if (!apiKey || apiKey === 'your-rigetti-api-key') {
      return { valid: false, error: 'RIGETTI_API_KEY not configured' };
    }
    
    if (!userId || userId === 'your-rigetti-user-id') {
      return { valid: false, error: 'RIGETTI_USER_ID not configured' };
    }
    
    // Test API connection
    return new Promise((resolve) => {
      exec(`curl -s -H "Authorization: Bearer ${apiKey}" -H "X-User-Id: ${userId}" https://api.rigetti.com/v1/user`, 
        (error, stdout, stderr) => {
          if (stdout.includes('user_id') || stdout.includes('organization')) {
            resolve({ valid: true, message: 'Rigetti API connection successful' });
          } else {
            resolve({ valid: false, error: 'Rigetti API connection failed' });
          }
        }
      );
    });
  },

  async validateIonQ() {
    const apiKey = process.env.IONQ_API_KEY;
    
    if (!apiKey || apiKey === 'your-ionq-api-key') {
      return { valid: false, error: 'IONQ_API_KEY not configured' };
    }
    
    // Test API connection
    return new Promise((resolve) => {
      exec(`curl -s -H "Authorization: apiKey ${apiKey}" https://api.ionq.co/v0.3/backends`, 
        (error, stdout, stderr) => {
          if (stdout.includes('backend') || stdout.includes('simulator')) {
            resolve({ valid: true, message: 'IonQ API connection successful' });
          } else {
            resolve({ valid: false, error: 'IonQ API connection failed' });
          }
        }
      );
    });
  }
};

// Run validations
async function validateAll() {
  const providers = ['IBM', 'Google', 'Rigetti', 'IonQ'];
  const results = {};
  
  for (const provider of providers) {
    console.log(`Validating ${provider}...`);
    try {
      const result = await validators[`validate${provider}`]();
      results[provider] = result;
      
      if (result.valid) {
        console.log(`✅ ${provider}: ${result.message}`);
      } else {
        console.log(`❌ ${provider}: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${provider}: Validation failed - ${error.message}`);
      results[provider] = { valid: false, error: error.message };
    }
    console.log('');
  }
  
  // Summary
  const validCount = Object.values(results).filter(r => r.valid).length;
  console.log(`\n📊 Summary: ${validCount}/${providers.length} providers configured correctly`);
  
  if (validCount === 0) {
    console.log('\n⚠️  No quantum providers are configured. Please follow the setup instructions.');
    process.exit(1);
  } else if (validCount < providers.length) {
    console.log('\n⚠️  Some providers need configuration. See instructions in configs/quantum-providers/');
  } else {
    console.log('\n🎉 All quantum providers are configured correctly!');
  }
}

validateAll().catch(console.error);