import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

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

  constructor(
    private readonly environment: string = 'quantum-env',
    private readonly pythonPath: string = 'python3'
  ) {
    super();
    this.initializePythonEnvironment();
  }

  private async initializePythonEnvironment(): Promise<void> {
    this.emit('status', 'initializing');
    
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
      throw new Error(`Failed to initialize Python environment: ${error.message}`);
    }
  }

  async execute(code: string, timeout: number = 30000): Promise<PythonExecutionResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Python execution timeout after ${timeout}ms`));
      }, timeout);

      this.executionQueue.push({
        code,
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
      
      // Wrap code in comprehensive error handling and output capture
      const wrappedCode = `
import sys
import json
import traceback
import time
from contextlib import redirect_stdout, redirect_stderr
from io import StringIO

# Capture streams
stdout_capture = StringIO()
stderr_capture = StringIO()

execution_start = time.time()

try:
    with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
        # Execute user code
        exec('''${code.replace(/'/g, "\\'")}''')
    
    execution_time = time.time() - execution_start
    
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

      // Execute with timeout
      const pythonProcess = spawn(this.pythonPath, ['-c', wrappedCode], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          PYTHONPATH: process.env.PYTHONPATH,
          PYTHONUNBUFFERED: '1'
        }
      });

      let stdout = '';
      let stderr = '';
      let processTimeout: NodeJS.Timeout;

      if (timeout > 0) {
        processTimeout = setTimeout(() => {
          pythonProcess.kill('SIGKILL');
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
        if (processTimeout) clearTimeout(processTimeout);
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  destroy(): void {
    if (this.pythonProcess && !this.pythonProcess.killed) {
      this.pythonProcess.kill();
    }
    
    // Reject all pending executions
    for (const { reject } of this.executionQueue) {
      reject(new Error('Python bridge destroyed'));
    }
    this.executionQueue.length = 0;
    
    this.removeAllListeners();
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