// Jest setup file for QuantumOS tests

// Mock Electron APIs
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/quantumos-test'),
    getVersion: jest.fn(() => '1.0.0'),
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn()
  },
  BrowserWindow: jest.fn(() => ({
    loadURL: jest.fn(),
    loadFile: jest.fn(),
    show: jest.fn(),
    webContents: {
      send: jest.fn(),
      openDevTools: jest.fn(),
      on: jest.fn()
    },
    on: jest.fn(),
    once: jest.fn()
  })),
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn()
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  dialog: {
    showErrorBox: jest.fn(),
    showMessageBox: jest.fn(),
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn()
  }
}));

// Mock child_process for Python bridge
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    stdout: {
      on: jest.fn()
    },
    stderr: {
      on: jest.fn()
    },
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 100);
      }
    }),
    kill: jest.fn()
  }))
}));

// Global test timeout
jest.setTimeout(30000);

// Console log suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (args[0]?.includes?.('Warning') || args[0]?.includes?.('Deprecated')) {
      return;
    }
    originalConsoleError(...args);
  };
  
  console.warn = (...args: any[]) => {
    if (args[0]?.includes?.('Warning') || args[0]?.includes?.('Deprecated')) {
      return;
    }
    originalConsoleWarn(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});