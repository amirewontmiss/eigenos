import React from 'react';
import { createRoot } from 'react-dom/client';
import { QuantumOSApp } from './components/QuantumOSApp';
import { QuantumProvider } from './contexts/QuantumContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/global.css';
import './styles/quantum.css';

// Initialize the React application
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);

// Render the main application with providers
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <QuantumProvider>
        <QuantumOSApp />
      </QuantumProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// Handle hot module replacement in development
if (module.hot) {
  module.hot.accept('./components/QuantumOSApp', () => {
    const NextApp = require('./components/QuantumOSApp').QuantumOSApp;
    root.render(
      <React.StrictMode>
        <ThemeProvider>
          <QuantumProvider>
            <NextApp />
          </QuantumProvider>
        </ThemeProvider>
      </React.StrictMode>
    );
  });
}