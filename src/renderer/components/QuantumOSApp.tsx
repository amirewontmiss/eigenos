import React, { useState, useEffect } from 'react';
import { useQuantum } from '../contexts/QuantumContext';
import { useTheme } from '../contexts/ThemeContext';
import { QuantumWorkspace } from './QuantumWorkspace/QuantumWorkspace';
import { QuantumSidebar } from './Navigation/QuantumSidebar';
import { QuantumHeader } from './Navigation/QuantumHeader';
import { QuantumStatusBar } from './Navigation/QuantumStatusBar';
import { QuantumLoadingScreen } from './Common/QuantumLoadingScreen';
import { QuantumErrorBoundary } from './Common/QuantumErrorBoundary';
import { QuantumNotificationCenter } from './Common/QuantumNotificationCenter';

export const QuantumOSApp: React.FC = () => {
  const { state } = useQuantum();
  const { theme } = useTheme();
  const [currentView, setCurrentView] = useState<'workspace' | 'devices' | 'jobs' | 'analytics'>('workspace');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Register menu action handlers
  useEffect(() => {
    const handleMenuActions = () => {
      if (window.quantumOS) {
        window.quantumOS.onMenuAction('new-circuit', () => {
          setCurrentView('workspace');
          // Trigger new circuit creation in workspace
        });

        window.quantumOS.onMenuAction('open-circuit', (circuitData: any) => {
          setCurrentView('workspace');
          // Load circuit data in workspace
        });

        window.quantumOS.onMenuAction('device-manager', () => {
          setCurrentView('devices');
        });

        window.quantumOS.onMenuAction('job-queue', () => {
          setCurrentView('jobs');
        });

        window.quantumOS.onMenuAction('preferences', () => {
          // Open preferences modal
        });
      }
    };

    handleMenuActions();

    // Cleanup listeners on unmount
    return () => {
      if (window.quantumOS) {
        window.quantumOS.removeAllListeners('menu:new-circuit');
        window.quantumOS.removeAllListeners('menu:open-circuit');
        window.quantumOS.removeAllListeners('menu:device-manager');
        window.quantumOS.removeAllListeners('menu:job-queue');
        window.quantumOS.removeAllListeners('menu:preferences');
      }
    };
  }, []);

  // Show loading screen while initializing
  if (!state.isInitialized) {
    return <QuantumLoadingScreen />;
  }

  return (
    <QuantumErrorBoundary>
      <div className="quantum-os-app w-full h-screen flex flex-col overflow-hidden">
        {/* Main Header */}
        <QuantumHeader 
          currentView={currentView}
          onViewChange={setCurrentView}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <QuantumSidebar 
            currentView={currentView}
            onViewChange={setCurrentView}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Main Workspace */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <QuantumWorkspace 
                currentView={currentView}
                onViewChange={setCurrentView}
              />
            </div>

            {/* Status Bar */}
            <QuantumStatusBar />
          </main>
        </div>

        {/* Notification Center */}
        <QuantumNotificationCenter />
      </div>
    </QuantumErrorBoundary>
  );
};