import React, { useState, useEffect, useRef } from 'react';
import { DeviceStatusCard, DeviceStatus } from './DeviceStatusCard';
import { MetricsChart, MetricDataPoint } from './MetricsChart';
import { QuantumSurface } from '../../design-system/primitives/QuantumSurface';
import { QuantumButton } from '../../design-system/primitives/QuantumButton';

export interface DeviceMonitoringDashboardProps {
  devices?: DeviceStatus[];
  autoRefresh?: boolean;
  refreshInterval?: number;
  onDeviceSelect?: (deviceId: string) => void;
  selectedDeviceId?: string;
}

// WebSocket connection for real-time updates
class DeviceMetricsWebSocket {
  private ws: WebSocket | null = null;
  private callbacks: Set<(data: any) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(url: string = 'ws://localhost:8080/device-metrics') {
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('Device metrics WebSocket connected');
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.callbacks.forEach(callback => callback(data));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('Device metrics WebSocket disconnected');
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('Device metrics WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to device metrics WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  subscribe(callback: (data: any) => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.clear();
  }
}

// Generate mock device data for demonstration
const generateMockDevices = (): DeviceStatus[] => [
  {
    id: 'ibm-sydney',
    name: 'IBM Sydney',
    provider: 'IBM',
    status: 'online',
    qubits: 27,
    connectivity: 'limited',
    availability: 0.87,
    waitTime: 45,
    fidelity: { single: 0.9991, two: 0.987 },
    error_rates: { readout: 0.031, gate: 0.0052, coherence: 0.0089 },
    temperature: 15.2,
    lastUpdated: new Date(Date.now() - 30000)
  },
  {
    id: 'google-sycamore',
    name: 'Google Sycamore',
    provider: 'Google',
    status: 'online',
    qubits: 70,
    connectivity: 'full',
    availability: 0.94,
    waitTime: 12,
    fidelity: { single: 0.9994, two: 0.992 },
    error_rates: { readout: 0.021, gate: 0.0032, coherence: 0.0045 },
    temperature: 10.8,
    lastUpdated: new Date(Date.now() - 15000)
  },
  {
    id: 'rigetti-aspen',
    name: 'Rigetti Aspen-M-3',
    provider: 'Rigetti',
    status: 'maintenance',
    qubits: 80,
    connectivity: 'limited',
    availability: 0.0,
    waitTime: 0,
    fidelity: { single: 0.995, two: 0.98 },
    error_rates: { readout: 0.045, gate: 0.0078, coherence: 0.012 },
    temperature: 18.5,
    lastUpdated: new Date(Date.now() - 3600000)
  },
  {
    id: 'ionq-aria',
    name: 'IonQ Aria',
    provider: 'IonQ',
    status: 'busy',
    qubits: 25,
    connectivity: 'full',
    availability: 0.78,
    waitTime: 120,
    fidelity: { single: 0.998, two: 0.995 },
    error_rates: { readout: 0.015, gate: 0.0021, coherence: 0.0033 },
    temperature: 0.001,
    lastUpdated: new Date(Date.now() - 60000)
  }
];

const generateMockMetrics = (deviceId: string): Record<string, MetricDataPoint[]> => {
  const now = Date.now();
  const points = 20;
  const interval = 30000; // 30 seconds

  const generateSeries = (baseValue: number, variance: number) => 
    Array.from({ length: points }, (_, i) => ({
      timestamp: now - (points - i - 1) * interval,
      value: baseValue + (Math.random() - 0.5) * variance
    }));

  return {
    fidelity: generateSeries(0.99, 0.02),
    errorRate: generateSeries(0.005, 0.003),
    waitTime: generateSeries(60, 30),
    availability: generateSeries(0.85, 0.1),
    temperature: generateSeries(15, 5),
    throughput: generateSeries(100, 20)
  };
};

export const DeviceMonitoringDashboard: React.FC<DeviceMonitoringDashboardProps> = ({
  devices: propDevices,
  autoRefresh = true,
  refreshInterval = 30000,
  onDeviceSelect,
  selectedDeviceId
}) => {
  const [devices, setDevices] = useState<DeviceStatus[]>(propDevices || generateMockDevices());
  const [selectedDevice, setSelectedDevice] = useState<string>(selectedDeviceId || '');
  const [deviceMetrics, setDeviceMetrics] = useState<Record<string, Record<string, MetricDataPoint[]>>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const wsRef = useRef<DeviceMetricsWebSocket>();

  // Initialize WebSocket connection
  useEffect(() => {
    if (autoRefresh) {
      wsRef.current = new DeviceMetricsWebSocket();
      
      const unsubscribe = wsRef.current.subscribe((data) => {
        if (data.type === 'device_update') {
          setDevices(prev => prev.map(device => 
            device.id === data.deviceId 
              ? { ...device, ...data.updates, lastUpdated: new Date() }
              : device
          ));
        } else if (data.type === 'metrics_update') {
          setDeviceMetrics(prev => ({
            ...prev,
            [data.deviceId]: {
              ...prev[data.deviceId],
              [data.metric]: [...(prev[data.deviceId]?.[data.metric] || []), data.dataPoint].slice(-20)
            }
          }));
        }
        setLastUpdate(new Date());
        setIsConnected(true);
      });

      wsRef.current.connect();

      return () => {
        unsubscribe();
        wsRef.current?.disconnect();
      };
    }
  }, [autoRefresh]);

  // Generate initial metrics for all devices
  useEffect(() => {
    const initialMetrics: Record<string, Record<string, MetricDataPoint[]>> = {};
    devices.forEach(device => {
      initialMetrics[device.id] = generateMockMetrics(device.id);
    });
    setDeviceMetrics(initialMetrics);
  }, [devices]);

  // Periodic refresh fallback
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate device status updates
      setDevices(prev => prev.map(device => {
        const availability = Math.max(0, Math.min(1, device.availability + (Math.random() - 0.5) * 0.1));
        const waitTime = Math.max(0, device.waitTime + (Math.random() - 0.5) * 20);
        
        return {
          ...device,
          availability,
          waitTime,
          lastUpdated: new Date()
        };
      }));

      // Generate new metric data points
      devices.forEach(device => {
        const now = Date.now();
        setDeviceMetrics(prev => {
          const deviceMetrics = prev[device.id] || {};
          return {
            ...prev,
            [device.id]: {
              ...deviceMetrics,
              fidelity: [...(deviceMetrics.fidelity || []), {
                timestamp: now,
                value: Math.max(0.9, Math.min(1, 0.99 + (Math.random() - 0.5) * 0.02))
              }].slice(-20),
              errorRate: [...(deviceMetrics.errorRate || []), {
                timestamp: now,
                value: Math.max(0, 0.005 + (Math.random() - 0.5) * 0.003)
              }].slice(-20),
              waitTime: [...(deviceMetrics.waitTime || []), {
                timestamp: now,
                value: Math.max(0, device.waitTime + (Math.random() - 0.5) * 20)
              }].slice(-20)
            }
          };
        });
      });

      setLastUpdate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, devices]);

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId);
    onDeviceSelect?.(deviceId);
  };

  const getSystemOverview = () => {
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const averageAvailability = devices.reduce((sum, d) => sum + d.availability, 0) / totalDevices;
    const totalQubits = devices.reduce((sum, d) => sum + d.qubits, 0);
    
    return { totalDevices, onlineDevices, averageAvailability, totalQubits };
  };

  const overview = getSystemOverview();
  const selectedDeviceData = devices.find(d => d.id === selectedDevice);
  const selectedDeviceMetrics = deviceMetrics[selectedDevice] || {};

  return (
    <div className="device-monitoring-dashboard" style={{ padding: '16px', maxHeight: '100vh', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '24px' }}>
            Device Monitoring
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Real-time quantum hardware status and performance metrics
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isConnected ? 'var(--status-success)' : 'var(--status-error)',
                animation: isConnected ? 'pulse 2s infinite' : 'none'
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
          
          <QuantumButton
            variant="secondary"
            size="sm"
            onClick={() => setLastUpdate(new Date())}
          >
            Refresh
          </QuantumButton>
        </div>
      </div>

      {/* System Overview */}
      <QuantumSurface variant="glass" style={{ padding: '16px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>System Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--quantum-primary)' }}>
              {onlineDevices}/{overview.totalDevices}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Devices Online</div>
          </div>
          
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--quantum-primary)' }}>
              {overview.totalQubits}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Qubits</div>
          </div>
          
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--quantum-primary)' }}>
              {Math.round(overview.averageAvailability * 100)}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Avg Availability</div>
          </div>
          
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--quantum-primary)' }}>
              {devices.filter(d => d.status === 'online').length > 0 ? 'Operational' : 'Degraded'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>System Status</div>
          </div>
        </div>
      </QuantumSurface>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Device List */}
        <div>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Devices</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {devices.map(device => (
              <DeviceStatusCard
                key={device.id}
                device={device}
                selected={selectedDevice === device.id}
                onSelect={handleDeviceSelect}
                showDetails={selectedDevice === device.id}
              />
            ))}
          </div>
        </div>

        {/* Device Details & Metrics */}
        <div>
          {selectedDeviceData ? (
            <>
              <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                {selectedDeviceData.name} - Live Metrics
              </h3>
              
              <QuantumSurface variant="inset" style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <MetricsChart
                    data={selectedDeviceMetrics.fidelity || []}
                    title="Fidelity"
                    unit="%"
                    color="var(--status-success)"
                    valueFormatter={(value) => (value * 100).toFixed(2)}
                  />
                  
                  <MetricsChart
                    data={selectedDeviceMetrics.errorRate || []}
                    title="Error Rate"
                    unit="%"
                    color="var(--status-error)"
                    valueFormatter={(value) => (value * 100).toFixed(3)}
                  />
                  
                  <MetricsChart
                    data={selectedDeviceMetrics.waitTime || []}
                    title="Wait Time"
                    unit="min"
                    color="var(--status-warning)"
                    valueFormatter={(value) => Math.round(value).toString()}
                  />
                  
                  <MetricsChart
                    data={[{
                      timestamp: Date.now(),
                      value: selectedDeviceData.temperature
                    }]}
                    title="Temperature"
                    unit=" mK"
                    color="var(--quantum-secondary)"
                    valueFormatter={(value) => value.toFixed(1)}
                  />
                </div>
              </QuantumSurface>
            </>
          ) : (
            <QuantumSurface variant="glass" style={{ 
              padding: '48px', 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{ fontSize: '48px', opacity: 0.3 }}>📊</div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Select a Device</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                Choose a quantum device from the list to view detailed metrics and performance data
              </p>
            </QuantumSurface>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
    </div>
  );
};