import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('quantumOS', {
  // Quantum circuit operations
  createCircuit: (qubits: number, name?: string) => 
    ipcRenderer.invoke('quantum:create-circuit', qubits, name),
  
  runCircuit: (circuitData: any, deviceId?: string) => 
    ipcRenderer.invoke('quantum:run-circuit', circuitData, deviceId),
  
  optimizeCircuit: (circuitData: any, options?: any) => 
    ipcRenderer.invoke('quantum:optimize-circuit', circuitData, options),

  // Device management
  getDevices: () => 
    ipcRenderer.invoke('quantum:get-devices'),
  
  getDeviceStatus: (deviceId: string) => 
    ipcRenderer.invoke('quantum:get-device-status', deviceId),

  // Provider management
  getProviders: () => 
    ipcRenderer.invoke('quantum:get-providers'),
  
  authenticateProvider: (providerId: string, credentials: any) => 
    ipcRenderer.invoke('quantum:authenticate-provider', providerId, credentials),

  // Job management
  getJobs: () => 
    ipcRenderer.invoke('quantum:get-jobs'),
  
  cancelJob: (jobId: string) => 
    ipcRenderer.invoke('quantum:cancel-job', jobId),

  // Configuration
  getConfig: () => 
    ipcRenderer.invoke('config:get'),
  
  setConfig: (config: any) => 
    ipcRenderer.invoke('config:set', config),

  // File operations
  saveCircuit: (circuitData: any, filePath?: string) => 
    ipcRenderer.invoke('file:save-circuit', circuitData, filePath),
  
  loadCircuit: (filePath?: string) => 
    ipcRenderer.invoke('file:load-circuit', filePath),

  // Event listeners
  onQuantumOSReady: (callback: (data: any) => void) => {
    ipcRenderer.on('quantum-os-ready', (event, data) => callback(data));
  },

  onMenuAction: (action: string, callback: () => void) => {
    ipcRenderer.on(`menu:${action}`, callback);
  },

  // Remove listeners
  removeListener: (channel: string, callback: any) => {
    ipcRenderer.removeListener(channel, callback);
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Expose platform information
contextBridge.exposeInMainWorld('platform', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
  platform: process.platform,
  arch: process.arch
});

// Security: Only expose necessary Node.js APIs
contextBridge.exposeInMainWorld('nodeAPI', {
  path: {
    join: (...paths: string[]) => require('path').join(...paths),
    basename: (path: string) => require('path').basename(path),
    dirname: (path: string) => require('path').dirname(path),
    extname: (path: string) => require('path').extname(path)
  }
});