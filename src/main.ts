import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { QuantumOS } from './core/quantum-os';
import { Logger } from './utils/logger';
import { ConfigManager } from './core/config-manager';

class QuantumOSApplication {
  private mainWindow: BrowserWindow | null = null;
  private quantumOS: QuantumOS | null = null;
  private logger: Logger;
  private configManager: ConfigManager;

  constructor() {
    this.logger = new Logger('QuantumOS-Main');
    this.configManager = new ConfigManager();
    this.initializeApp();
  }

  private initializeApp(): void {
    // Handle app events
    app.whenReady().then(() => {
      this.createMainWindow();
      this.initializeQuantumOS();
      this.setupMenu();
      this.setupIPC();
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.cleanup();
    });

    // Security: Prevent new window creation from web content
    app.on('web-contents-created', (event, contents) => {
      contents.on('new-window', (navigationEvent, navigationURL) => {
        navigationEvent.preventDefault();
        this.logger.warn('Blocked new window creation', { url: navigationURL });
      });
    });
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false
      },
      titleBarStyle: 'hiddenInset',
      show: false,
      icon: path.join(__dirname, '../assets/icon.png')
    });

    // Load the application
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      this.logger.info('QuantumOS main window ready');
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Security: Block navigation to external URLs
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('file://') && !url.startsWith('http://localhost:')) {
        event.preventDefault();
        this.logger.warn('Blocked navigation to external URL', { url });
      }
    });
  }

  private async initializeQuantumOS(): Promise<void> {
    try {
      this.logger.info('Initializing QuantumOS core systems...');
      
      const config = await this.configManager.getConfig();
      this.quantumOS = new QuantumOS(config, this.logger);
      
      await this.quantumOS.initialize();
      
      this.logger.info('QuantumOS core systems initialized successfully');
      
      // Notify renderer process
      if (this.mainWindow) {
        this.mainWindow.webContents.send('quantum-os-ready', {
          version: app.getVersion(),
          providers: await this.quantumOS.getAvailableProviders(),
          devices: await this.quantumOS.getAvailableDevices()
        });
      }
      
    } catch (error: any) {
      this.logger.error('Failed to initialize QuantumOS', error);
      
      dialog.showErrorBox(
        'QuantumOS Initialization Error',
        `Failed to initialize QuantumOS core systems:\n\n${error.message}`
      );
      
      app.quit();
    }
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Circuit',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.handleNewCircuit()
          },
          {
            label: 'Open Circuit',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.handleOpenCircuit()
          },
          {
            label: 'Save Circuit',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.handleSaveCircuit()
          },
          { type: 'separator' },
          {
            label: 'Import QASM',
            click: () => this.handleImportQASM()
          },
          {
            label: 'Export QASM',
            click: () => this.handleExportQASM()
          },
          { type: 'separator' },
          {
            label: 'Preferences',
            accelerator: 'CmdOrCtrl+,',
            click: () => this.handlePreferences()
          },
          { type: 'separator' },
          {
            role: 'quit'
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
        ]
      },
      {
        label: 'Quantum',
        submenu: [
          {
            label: 'Run Circuit',
            accelerator: 'CmdOrCtrl+R',
            click: () => this.handleRunCircuit()
          },
          {
            label: 'Optimize Circuit',
            accelerator: 'CmdOrCtrl+Shift+O',
            click: () => this.handleOptimizeCircuit()
          },
          { type: 'separator' },
          {
            label: 'Device Manager',
            click: () => this.handleDeviceManager()
          },
          {
            label: 'Job Queue',
            click: () => this.handleJobQueue()
          },
          { type: 'separator' },
          {
            label: 'Simulator Settings',
            click: () => this.handleSimulatorSettings()
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Documentation',
            click: () => this.handleDocumentation()
          },
          {
            label: 'Quantum Computing Basics',
            click: () => this.handleQuantumBasics()
          },
          { type: 'separator' },
          {
            label: 'Check for Updates',
            click: () => this.handleCheckUpdates()
          },
          {
            label: 'About QuantumOS',
            click: () => this.handleAbout()
          }
        ]
      }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      });

      // Window menu
      (template[4].submenu as Electron.MenuItemConstructorOptions[]).push(
        { type: 'separator' },
        { role: 'front' }
      );
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIPC(): void {
    // Quantum circuit operations
    ipcMain.handle('quantum:create-circuit', async (event, qubits: number, name?: string) => {
      return this.quantumOS?.createCircuit(qubits, name);
    });

    ipcMain.handle('quantum:run-circuit', async (event, circuitData: any, deviceId?: string) => {
      return this.quantumOS?.runCircuit(circuitData, deviceId);
    });

    ipcMain.handle('quantum:optimize-circuit', async (event, circuitData: any, options?: any) => {
      return this.quantumOS?.optimizeCircuit(circuitData, options);
    });

    // Device management
    ipcMain.handle('quantum:get-devices', async () => {
      return this.quantumOS?.getAvailableDevices();
    });

    ipcMain.handle('quantum:get-device-status', async (event, deviceId: string) => {
      return this.quantumOS?.getDeviceStatus(deviceId);
    });

    // Provider management
    ipcMain.handle('quantum:get-providers', async () => {
      return this.quantumOS?.getAvailableProviders();
    });

    ipcMain.handle('quantum:authenticate-provider', async (event, providerId: string, credentials: any) => {
      return this.quantumOS?.authenticateProvider(providerId, credentials);
    });

    // Job management
    ipcMain.handle('quantum:get-jobs', async () => {
      return this.quantumOS?.getJobs();
    });

    ipcMain.handle('quantum:cancel-job', async (event, jobId: string) => {
      return this.quantumOS?.cancelJob(jobId);
    });

    // Configuration
    ipcMain.handle('config:get', async () => {
      return this.configManager.getConfig();
    });

    ipcMain.handle('config:set', async (event, config: any) => {
      return this.configManager.setConfig(config);
    });

    // File operations
    ipcMain.handle('file:save-circuit', async (event, circuitData: any, filePath?: string) => {
      return this.handleSaveCircuitToFile(circuitData, filePath);
    });

    ipcMain.handle('file:load-circuit', async (event, filePath?: string) => {
      return this.handleLoadCircuitFromFile(filePath);
    });
  }

  // Menu handlers
  private handleNewCircuit(): void {
    this.mainWindow?.webContents.send('menu:new-circuit');
  }

  private async handleOpenCircuit(): Promise<void> {
    const result = await dialog.showOpenDialog(this.mainWindow!, {
      title: 'Open Quantum Circuit',
      filters: [
        { name: 'QuantumOS Circuits', extensions: ['qos'] },
        { name: 'QASM Files', extensions: ['qasm'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const circuitData = await this.handleLoadCircuitFromFile(result.filePaths[0]);
      this.mainWindow?.webContents.send('menu:open-circuit', circuitData);
    }
  }

  private handleSaveCircuit(): void {
    this.mainWindow?.webContents.send('menu:save-circuit');
  }

  private handleImportQASM(): void {
    this.mainWindow?.webContents.send('menu:import-qasm');
  }

  private handleExportQASM(): void {
    this.mainWindow?.webContents.send('menu:export-qasm');
  }

  private handlePreferences(): void {
    this.mainWindow?.webContents.send('menu:preferences');
  }

  private handleRunCircuit(): void {
    this.mainWindow?.webContents.send('menu:run-circuit');
  }

  private handleOptimizeCircuit(): void {
    this.mainWindow?.webContents.send('menu:optimize-circuit');
  }

  private handleDeviceManager(): void {
    this.mainWindow?.webContents.send('menu:device-manager');
  }

  private handleJobQueue(): void {
    this.mainWindow?.webContents.send('menu:job-queue');
  }

  private handleSimulatorSettings(): void {
    this.mainWindow?.webContents.send('menu:simulator-settings');
  }

  private handleDocumentation(): void {
    // Open documentation in external browser
    require('electron').shell.openExternal('https://docs.quantumos.com');
  }

  private handleQuantumBasics(): void {
    this.mainWindow?.webContents.send('menu:quantum-basics');
  }

  private handleCheckUpdates(): void {
    this.mainWindow?.webContents.send('menu:check-updates');
  }

  private handleAbout(): void {
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'About QuantumOS',
      message: 'QuantumOS',
      detail: `Version: ${app.getVersion()}\n\nEnterprise-Grade Quantum Operating System\n\nBuilt with Electron, TypeScript, and cutting-edge quantum computing libraries.`,
      buttons: ['OK']
    });
  }

  // File operation handlers
  private async handleSaveCircuitToFile(circuitData: any, filePath?: string): Promise<string | null> {
    try {
      if (!filePath) {
        const result = await dialog.showSaveDialog(this.mainWindow!, {
          title: 'Save Quantum Circuit',
          defaultPath: 'quantum-circuit.qos',
          filters: [
            { name: 'QuantumOS Circuits', extensions: ['qos'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (result.canceled || !result.filePath) {
          return null;
        }

        filePath = result.filePath;
      }

      const fs = require('fs').promises;
      await fs.writeFile(filePath, JSON.stringify(circuitData, null, 2));
      
      this.logger.info('Circuit saved', { filePath });
      return filePath;
      
    } catch (error: any) {
      this.logger.error('Failed to save circuit', error);
      dialog.showErrorBox('Save Error', `Failed to save circuit:\n\n${error.message}`);
      return null;
    }
  }

  private async handleLoadCircuitFromFile(filePath?: string): Promise<any | null> {
    try {
      if (!filePath) {
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          title: 'Load Quantum Circuit',
          filters: [
            { name: 'QuantumOS Circuits', extensions: ['qos'] },
            { name: 'QASM Files', extensions: ['qasm'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
          return null;
        }

        filePath = result.filePaths[0];
      }

      const fs = require('fs').promises;
      const fileContent = await fs.readFile(filePath, 'utf8');
      
      let circuitData;
      if (filePath.endsWith('.qasm')) {
        // Parse QASM file
        circuitData = await this.quantumOS?.parseQASM(fileContent);
      } else {
        // Parse JSON circuit file
        circuitData = JSON.parse(fileContent);
      }
      
      this.logger.info('Circuit loaded', { filePath });
      return circuitData;
      
    } catch (error: any) {
      this.logger.error('Failed to load circuit', error);
      dialog.showErrorBox('Load Error', `Failed to load circuit:\n\n${error.message}`);
      return null;
    }
  }

  private cleanup(): void {
    this.logger.info('Cleaning up QuantumOS application...');
    
    try {
      if (this.quantumOS) {
        this.quantumOS.shutdown();
      }
    } catch (error: any) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Initialize application
new QuantumOSApplication();