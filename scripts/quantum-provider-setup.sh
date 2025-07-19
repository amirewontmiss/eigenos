#!/bin/bash

echo "🚀 QuantumOS Provider Setup Script"
echo "=================================="

# Create necessary directories
mkdir -p configs/quantum-providers
mkdir -p logs
mkdir -p credentials

# Update .env file with quantum provider configuration
echo "⚙️  Setting up environment configuration..."

cat >> .env << 'EOF'

# =============================================================================
# QUANTUM PROVIDER CONFIGURATION
# =============================================================================

# IBM Quantum Configuration
# Get your token from: https://quantum-computing.ibm.com/account
IBM_QUANTUM_TOKEN=your-ibm-quantum-token-here
IBM_QUANTUM_HUB=ibm-q
IBM_QUANTUM_GROUP=open
IBM_QUANTUM_PROJECT=main

# Google Quantum AI Configuration  
# Set up Google Cloud project and service account
GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id
GOOGLE_CLOUD_CREDENTIALS_PATH=./credentials/google-quantum-service-account.json

# Rigetti Quantum Cloud Services Configuration
# Get credentials from: https://qcs.rigetti.com/
RIGETTI_API_KEY=your-rigetti-api-key
RIGETTI_USER_ID=your-rigetti-user-id

# IonQ Configuration
# Get API key from: https://cloud.ionq.com/
IONQ_API_KEY=your-ionq-api-key

# Provider-specific settings
QUANTUM_PROVIDER_TIMEOUT=30000
QUANTUM_PROVIDER_RETRY_ATTEMPTS=3
QUANTUM_MAX_CONCURRENT_JOBS=10
QUANTUM_JOB_POLLING_INTERVAL=10000

# Circuit execution defaults
DEFAULT_SHOTS=1024
MAX_SHOTS_PER_JOB=100000
MAX_QUBITS_PER_CIRCUIT=100
MAX_GATES_PER_CIRCUIT=10000

# Cost controls
MAX_COST_PER_JOB=10.00
ENABLE_COST_WARNINGS=true
ENABLE_AUTOMATIC_DEVICE_SELECTION=true

EOF

# Create Google Cloud service account setup instructions
cat > credentials/google-setup-instructions.md << 'EOF'
# Google Quantum AI Setup Instructions

## 1. Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. Note the Project ID

## 2. Enable Quantum AI API
1. Go to APIs & Services > Library
2. Search for "Quantum AI"
3. Enable the Quantum AI API

## 3. Create Service Account
1. Go to IAM & Admin > Service Accounts
2. Click "Create Service Account"
3. Name: "quantumos-quantum-ai"
4. Grant roles:
   - Quantum AI Admin
   - Service Account User
5. Create key (JSON format)
6. Download and save as: credentials/google-quantum-service-account.json

## 4. Set up authentication
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./credentials/google-quantum-service-account.json"
```
EOF

# Create IBM Quantum setup instructions
cat > configs/quantum-providers/ibm-setup-instructions.md << 'EOF'
# IBM Quantum Setup Instructions

## 1. Create IBM Quantum Account
1. Go to https://quantum-computing.ibm.com/
2. Sign up for free account
3. Verify email address

## 2. Generate API Token
1. Go to Account Settings
2. Copy your API token
3. Add to .env file: IBM_QUANTUM_TOKEN=your-token-here

## 3. Join IBM Quantum Network (Optional)
1. For access to real quantum hardware
2. Request access to specific hubs/groups
3. Update hub/group/project in .env if different from defaults

## 4. Test Connection
```bash
python -c "
from qiskit import IBMQ
IBMQ.save_account('your-token-here', overwrite=True)
IBMQ.load_account()
provider = IBMQ.get_provider(hub='ibm-q', group='open', project='main')
print('Available backends:', [b.name() for b in provider.backends()])
"
```
EOF

# Create Rigetti setup instructions
cat > configs/quantum-providers/rigetti-setup-instructions.md << 'EOF'
# Rigetti Quantum Cloud Services Setup

## 1. Create Rigetti Account
1. Go to https://qcs.rigetti.com/
2. Sign up for account
3. Request access (may require approval)

## 2. Get API Credentials
1. Log in to QCS Console
2. Go to Account Settings
3. Generate API key
4. Note your User ID

## 3. Set up Environment
```bash
# Add to .env
RIGETTI_API_KEY=your-api-key
RIGETTI_USER_ID=your-user-id
```

## 4. Install PyQuil (if needed)
```bash
pip install pyquil
```
EOF

# Create IonQ setup instructions  
cat > configs/quantum-providers/ionq-setup-instructions.md << 'EOF'
# IonQ Quantum Cloud Setup

## 1. Create IonQ Account
1. Go to https://cloud.ionq.com/
2. Sign up for account
3. May require approval for hardware access

## 2. Generate API Key
1. Log in to IonQ Cloud Console
2. Go to API Keys section
3. Generate new API key
4. Copy the key

## 3. Set up Environment
```bash
# Add to .env
IONQ_API_KEY=your-api-key
```

## 4. Test Connection
```bash
curl -H "Authorization: apiKey your-api-key" \
     https://api.ionq.co/v0.3/backends
```
EOF

echo ""
echo "✅ Quantum Provider Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit .env file with your actual API keys and credentials"
echo "2. Follow setup instructions in configs/quantum-providers/"
echo "3. Run: npm run validate-providers"
echo "4. Start QuantumOS: npm run dev"
echo ""
echo "📚 Documentation:"
echo "- IBM Quantum: configs/quantum-providers/ibm-setup-instructions.md"
echo "- Google Quantum AI: credentials/google-setup-instructions.md"  
echo "- Rigetti QCS: configs/quantum-providers/rigetti-setup-instructions.md"
echo "- IonQ: configs/quantum-providers/ionq-setup-instructions.md"
echo ""