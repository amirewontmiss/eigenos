import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { configurationService } from '../../config/configuration.service';

export interface PythonExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

export interface PythonEnvironmentInfo {
  pythonVersion: string;
  libraries: {
    qiskit?: string;
    cirq?: string;
    pennylane?: string;
    numpy?: string;
    scipy?: string;
  };
  status: 'ready' | 'error' | 'initializing';
  errors: string[];
}

export class PythonBridge extends EventEmitter {
  private pythonProcess: ChildProcess | null = null;
  private executionQueue: Array<{
    code: string;
    resolve: (result: PythonExecutionResult) => void;
    reject: (error: Error) => void;
    timeout: number;
  }> = [];
  private isExecuting = false;
  private environmentInfo: PythonEnvironmentInfo | null = null;
  private initializationAttempts = 0;
  private maxInitializationAttempts = 3;
  private isShuttingDown = false;
  private lastValidationTime = 0;
  private validationInterval = 60000; // 1 minute

  constructor() {
    super();
    this.initializePythonEnvironment();
  }

  private async initializePythonEnvironment(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.initializationAttempts++;
    this.emit('status', 'initializing');

    if (this.initializationAttempts > this.maxInitializationAttempts) {
      const error = new Error(`Failed to initialize Python environment after ${this.maxInitializationAttempts} attempts`);
      this.emit('error', error);
      return;
    }
    
    const initCode = `
import sys
import json
import traceback
import time
from contextlib import redirect_stdout, redirect_stderr
from io import StringIO

# Initialize environment info
env_info = {
    'python_version': sys.version,
    'libraries': {},
    'status': 'ready',
    'errors': []
}

# Import quantum libraries
try:
    import qiskit
    from qiskit import IBMQ, QuantumCircuit, execute, Aer
    from qiskit.providers.aer import AerSimulator
    env_info['libraries']['qiskit'] = qiskit.__version__
    print(json.dumps({'library': 'qiskit', 'version': qiskit.__version__, 'status': 'loaded'}))
except ImportError as e:
    env_info['errors'].append(f'Qiskit import failed: {str(e)}')
    print(json.dumps({'library': 'qiskit', 'status': 'error', 'error': str(e)}))

try:
    import cirq
    env_info['libraries']['cirq'] = cirq.__version__
    print(json.dumps({'library': 'cirq', 'version': cirq.__version__, 'status': 'loaded'}))
except ImportError as e:
    env_info['errors'].append(f'Cirq import failed: {str(e)}')
    print(json.dumps({'library': 'cirq', 'status': 'error', 'error': str(e)}))

try:
    import pennylane as qml
    env_info['libraries']['pennylane'] = qml.__version__
    print(json.dumps({'library': 'pennylane', 'version': qml.__version__, 'status': 'loaded'}))
except ImportError as e:
    env_info['errors'].append(f'PennyLane import failed: {str(e)}')
    print(json.dumps({'library': 'pennylane', 'status': 'error', 'error': str(e)}))

try:
    import numpy as np
    import scipy
    env_info['libraries']['numpy'] = np.__version__
    env_info['libraries']['scipy'] = scipy.__version__
    print(json.dumps({'library': 'scipy', 'versions': {
        'numpy': np.__version__,
        'scipy': scipy.__version__
    }, 'status': 'loaded'}))
except ImportError as e:
    env_info['errors'].append(f'SciPy stack import failed: {str(e)}')
    print(json.dumps({'library': 'scipy', 'status': 'error', 'error': str(e)}))

# Final status
print(json.dumps({'type': 'environment_info', 'data': env_info}))
    `;

    try {
      // First validate Python installation
      await this.validatePythonInstallation();
      
      const result = await this.execute(initCode, 60000); // 60 second timeout for initialization
      const lines = result.stdout.trim().split('\n');
      
      let environmentInfo: PythonEnvironmentInfo = {
        pythonVersion: '',
        libraries: {},
        status: 'error',
        errors: []
      };

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          
          if (data.type === 'environment_info') {
            environmentInfo = {
              pythonVersion: data.data.python_version,
              libraries: data.data.libraries,
              status: data.data.errors.length === 0 ? 'ready' : 'error',
              errors: data.data.errors
            };
          }
        } catch (parseError) {
          // Skip non-JSON lines
        }
      }

      this.environmentInfo = environmentInfo;
      this.emit('initialized', environmentInfo);
      this.emit('status', environmentInfo.status);
      this.lastValidationTime = Date.now();
      
      // Reset attempts on successful initialization
      this.initializationAttempts = 0;
      
    } catch (error: any) {
      const errorInfo: PythonEnvironmentInfo = {
        pythonVersion: 'unknown',
        libraries: {},
        status: 'error',
        errors: [`Failed to initialize Python environment: ${error.message}`]
      };
      
      this.environmentInfo = errorInfo;
      this.emit('error', error);
      this.emit('status', 'error');
      
      // Retry initialization after delay
      if (this.initializationAttempts < this.maxInitializationAttempts) {
        setTimeout(() => {
          this.initializePythonEnvironment();
        }, 5000 * this.initializationAttempts); // Exponential backoff
      }
      
      throw new Error(`Failed to initialize Python environment: ${error.message}`);
    }
  }

  async execute(code: string, timeout: number = 30000): Promise<PythonExecutionResult> {
    if (this.isShuttingDown) {
      throw new Error('Python bridge is shutting down');
    }

    // Validate environment periodically
    if (Date.now() - this.lastValidationTime > this.validationInterval) {
      await this.validateEnvironment();
    }

    // Sanitize code input
    const sanitizedCode = this.sanitizeCode(code);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Python execution timeout after ${timeout}ms`));
      }, timeout);

      this.executionQueue.push({
        code: sanitizedCode,
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        timeout
      });

      this.processQueue();
    });
  }

  async executeAsync(code: string, timeout: number = 30000): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const wrappedCode = `
import threading
import json
import time

def async_execution():
    try:
        # User code execution
        ${code}
        print(json.dumps({'job_id': '${jobId}', 'status': 'completed', 'timestamp': time.time()}))
    except Exception as e:
        print(json.dumps({'job_id': '${jobId}', 'status': 'failed', 'error': str(e), 'timestamp': time.time()}))

# Start async execution
thread = threading.Thread(target=async_execution)
thread.daemon = True
thread.start()

print(json.dumps({'job_id': '${jobId}', 'status': 'started', 'timestamp': time.time()}))
    `;

    const result = await this.execute(wrappedCode, timeout);
    return jobId;
  }

  async installPackage(packageName: string, version?: string): Promise<boolean> {
    const installCommand = version ? `${packageName}==${version}` : packageName;
    
    const installCode = `
import subprocess
import sys
import json

try:
    result = subprocess.run([
        sys.executable, '-m', 'pip', 'install', '${installCommand}'
    ], capture_output=True, text=True, timeout=300)
    
    success = result.returncode == 0
    print(json.dumps({
        'package': '${packageName}',
        'success': success,
        'stdout': result.stdout,
        'stderr': result.stderr
    }))
except Exception as e:
    print(json.dumps({
        'package': '${packageName}',
        'success': False,
        'error': str(e)
    }))
    `;

    try {
      const result = await this.execute(installCode, 300000); // 5 minute timeout
      const installResult = JSON.parse(result.stdout.trim().split('\n').pop() || '{}');
      return installResult.success || false;
    } catch (error) {
      return false;
    }
  }

  async checkPackageVersion(packageName: string): Promise<string | null> {
    const versionCode = `
import json
try:
    import ${packageName}
    version = getattr(${packageName}, '__version__', 'unknown')
    print(json.dumps({'package': '${packageName}', 'version': version, 'available': True}))
except ImportError:
    print(json.dumps({'package': '${packageName}', 'available': False}))
    `;

    try {
      const result = await this.execute(versionCode);
      const versionResult = JSON.parse(result.stdout.trim());
      return versionResult.available ? versionResult.version : null;
    } catch (error) {
      return null;
    }
  }

  getEnvironmentInfo(): PythonEnvironmentInfo | null {
    return this.environmentInfo;
  }

  isReady(): boolean {
    return this.environmentInfo?.status === 'ready';
  }

  private async processQueue(): Promise<void> {
    if (this.isExecuting || this.executionQueue.length === 0) {
      return;
    }

    this.isExecuting = true;
    const { code, resolve, reject, timeout } = this.executionQueue.shift()!;

    try {
      const result = await this.executeCode(code, timeout);
      resolve(result);
    } catch (error: any) {
      reject(error);
    } finally {
      this.isExecuting = false;
      this.processQueue();
    }
  }

  private executeCode(code: string, timeout: number): Promise<PythonExecutionResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let processKilled = false;
      
      // Wrap code in comprehensive error handling and output capture
      const wrappedCode = `
import sys
import json
import traceback
import time
import signal
from contextlib import redirect_stdout, redirect_stderr
from io import StringIO

# Security: Set execution limits
import resource
try:
    # Limit memory to 512MB
    resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
    # Limit CPU time to 30 seconds
    resource.setrlimit(resource.RLIMIT_CPU, (30, 30))
except:
    pass  # Resource limits not available on all platforms

# Capture streams
stdout_capture = StringIO()
stderr_capture = StringIO()

execution_start = time.time()

def timeout_handler(signum, frame):
    raise TimeoutError("Execution timeout")

# Set timeout signal (Unix only)
try:
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(${Math.floor(timeout / 1000)})
except:
    pass  # Signals not available on all platforms

try:
    with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
        # Execute user code in restricted environment
        exec('''${code.replace(/'/g, "\\'")}''', {
            '__builtins__': {
                # Allow only safe builtins
                'print': print,
                'len': len,
                'range': range,
                'list': list,
                'dict': dict,
                'tuple': tuple,
                'set': set,
                'str': str,
                'int': int,
                'float': float,
                'bool': bool,
                'abs': abs,
                'min': min,
                'max': max,
                'sum': sum,
                'round': round,
                'enumerate': enumerate,
                'zip': zip,
                'map': map,
                'filter': filter,
                'sorted': sorted,
                'any': any,
                'all': all
            }
        })
    
    execution_time = time.time() - execution_start
    
    # Clear timeout
    try:
        signal.alarm(0)
    except:
        pass
    
    # Output results
    result = {
        'success': True,
        'stdout': stdout_capture.getvalue(),
        'stderr': stderr_capture.getvalue(),
        'execution_time': execution_time
    }
    
    print('===QUANTUMOS_RESULT_START===')
    print(json.dumps(result))
    print('===QUANTUMOS_RESULT_END===')
    
except Exception as e:
    execution_time = time.time() - execution_start
    
    # Clear timeout
    try:
        signal.alarm(0)
    except:
        pass
    
    result = {
        'success': False,
        'error': str(e),
        'traceback': traceback.format_exc(),
        'stdout': stdout_capture.getvalue(),
        'stderr': stderr_capture.getvalue(),
        'execution_time': execution_time
    }
    
    print('===QUANTUMOS_RESULT_START===')
    print(json.dumps(result))
    print('===QUANTUMOS_RESULT_END===')
      `;

      // Execute with proper cleanup
      const pythonConfig = configurationService.getPythonConfig();
      const pythonProcess = spawn(pythonConfig.pythonPath, ['-c', wrappedCode], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          PYTHONPATH: process.env.PYTHONPATH,
          PYTHONUNBUFFERED: '1'
        },
        detached: false
      });

      let stdout = '';
      let stderr = '';
      let processTimeout: NodeJS.Timeout;

      const cleanup = () => {
        if (processTimeout) clearTimeout(processTimeout);
        if (!processKilled && !pythonProcess.killed) {
          processKilled = true;
          pythonProcess.kill('SIGTERM');
          setTimeout(() => {
            if (!pythonProcess.killed) {
              pythonProcess.kill('SIGKILL');
            }
          }, 5000);
        }
      };

      if (timeout > 0) {
        processTimeout = setTimeout(() => {
          cleanup();
          reject(new Error(`Python execution timeout after ${timeout}ms`));
        }, timeout);
      }

      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (exitCode) => {
        if (processTimeout) clearTimeout(processTimeout);
        
        const executionTime = Date.now() - startTime;

        try {
          // Extract result from captured output
          const resultMatch = stdout.match(/===QUANTUMOS_RESULT_START===([\s\S]*?)===QUANTUMOS_RESULT_END===/);
          
          if (resultMatch) {
            const resultData = JSON.parse(resultMatch[1].trim());
            
            if (resultData.success) {
              resolve({
                stdout: resultData.stdout || '',
                stderr: resultData.stderr || '',
                exitCode: 0,
                executionTime: resultData.execution_time * 1000 // Convert to ms
              });
            } else {
              reject(new Error(`Python execution failed: ${resultData.error}\n${resultData.traceback}`));
            }
          } else {
            // Fallback to raw output
            resolve({
              stdout,
              stderr,
              exitCode: exitCode || 0,
              executionTime
            });
          }
        } catch (parseError) {
          // If result parsing fails, return raw output
          resolve({
            stdout,
            stderr,
            exitCode: exitCode || 0,
            executionTime
          });
        }
      });

      pythonProcess.on('error', (error) => {
        cleanup();
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  destroy(): void {
    this.isShuttingDown = true;
    
    if (this.pythonProcess && !this.pythonProcess.killed) {
      this.pythonProcess.kill('SIGTERM');
      setTimeout(() => {
        if (this.pythonProcess && !this.pythonProcess.killed) {
          this.pythonProcess.kill('SIGKILL');
        }
      }, 5000);
    }
    
    // Reject all pending executions
    for (const { reject } of this.executionQueue) {
      reject(new Error('Python bridge destroyed'));
    }
    this.executionQueue.length = 0;
    
    this.removeAllListeners();
  }

  // New validation and security methods
  async validateEnvironment(): Promise<boolean> {
    try {
      const result = await this.execute(`
import sys
print(f"Python {sys.version}")
print("Environment validation passed")
      `, 10000);
      
      this.lastValidationTime = Date.now();
      return result.exitCode === 0;
    } catch (error) {
      console.error('Python environment validation failed:', error);
      this.emit('error', error);
      return false;
    }
  }

  private async validatePythonInstallation(): Promise<void> {
    return new Promise((resolve, reject) => {
      const pythonConfig = configurationService.getPythonConfig();
      const pythonProcess = spawn(pythonConfig.pythonPath, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      pythonProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr?.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.on('close', (exitCode) => {
        if (exitCode === 0 && output.includes('Python')) {
          resolve();
        } else {
          reject(new Error(`Python installation validation failed: ${output}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to validate Python installation: ${error.message}`));
      });
    });
  }

  private sanitizeCode(code: string): string {
    // Remove potentially dangerous operations
    const dangerousPatterns = [
      /import\s+os/g,
      /import\s+subprocess/g,
      /import\s+shutil/g,
      /from\s+os\s+import/g,
      /from\s+subprocess\s+import/g,
      /from\s+shutil\s+import/g,
      /__import__/g,
      /eval\s*\(/g,
      /exec\s*\(/g,
      /open\s*\(/g,
      /file\s*\(/g,
      /input\s*\(/g,
      /raw_input\s*\(/g
    ];

    let sanitizedCode = code;
    
    // Check for dangerous patterns
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitizedCode)) {
        throw new Error(`Potentially unsafe code detected: ${pattern.toString()}`);
      }
    }

    // Limit code length
    if (sanitizedCode.length > 10000) {
      throw new Error('Code too long (maximum 10,000 characters)');
    }

    return sanitizedCode;
  }

  // Convenience methods for quantum-specific operations
  async executeQiskit(code: string): Promise<PythonExecutionResult> {
    const qiskitCode = `
# Ensure Qiskit is available
try:
    import qiskit
    from qiskit import *
except ImportError as e:
    raise RuntimeError(f"Qiskit not available: {e}")

# User code
${code}
    `;
    return this.execute(qiskitCode);
  }

  async executeCirq(code: string): Promise<PythonExecutionResult> {
    const cirqCode = `
# Ensure Cirq is available
try:
    import cirq
except ImportError as e:
    raise RuntimeError(f"Cirq not available: {e}")

# User code
${code}
    `;
    return this.execute(cirqCode);
  }

  async executePennyLane(code: string): Promise<PythonExecutionResult> {
    const pennyLaneCode = `
# Ensure PennyLane is available
try:
    import pennylane as qml
    import numpy as np
except ImportError as e:
    raise RuntimeError(f"PennyLane not available: {e}")

# User code
${code}
    `;
    return this.execute(pennyLaneCode);
  }
}