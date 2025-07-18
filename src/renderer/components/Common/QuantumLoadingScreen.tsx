import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface LoadingPhase {
  name: string;
  progress: number;
  message: string;
}

const loadingPhases: LoadingPhase[] = [
  { name: 'quantum-core', progress: 0, message: 'Initializing Quantum Core Systems...' },
  { name: 'python-bridge', progress: 20, message: 'Establishing Python Bridge Connection...' },
  { name: 'providers', progress: 40, message: 'Connecting to Quantum Providers...' },
  { name: 'devices', progress: 60, message: 'Scanning Quantum Devices...' },
  { name: 'scheduler', progress: 80, message: 'Initializing Job Scheduler...' },
  { name: 'ready', progress: 100, message: 'QuantumOS Ready' }
];

export const QuantumLoadingScreen: React.FC = () => {
  const { theme } = useTheme();
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; opacity: number }>>([]);

  // Simulate loading progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPhase < loadingPhases.length - 1) {
        setCurrentPhase(prev => prev + 1);
        setProgress(loadingPhases[currentPhase + 1].progress);
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [currentPhase]);

  // Generate quantum particles
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2
      }));
      setParticles(newParticles);
    };

    generateParticles();
    const particleInterval = setInterval(generateParticles, 3000);

    return () => clearInterval(particleInterval);
  }, []);

  const currentLoadingPhase = loadingPhases[currentPhase];

  return (
    <div className="quantum-loading-screen fixed inset-0 z-50 flex items-center justify-center">
      {/* Animated background */}
      <div 
        className="absolute inset-0"
        style={{ background: theme.gradients.background }}
      >
        {/* Quantum particles */}
        <div className="absolute inset-0 overflow-hidden">
          {particles.map(particle => (
            <div
              key={particle.id}
              className="absolute rounded-full animate-pulse"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: theme.colors.primary,
                opacity: particle.opacity,
                boxShadow: `0 0 ${particle.size * 2}px ${theme.colors.primary}`,
                animation: `quantumFloat ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Quantum wave effect */}
        <div className="absolute inset-0">
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border-2 opacity-20 animate-ping"
            style={{ borderColor: theme.colors.primary }}
          />
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-2 opacity-30 animate-ping"
            style={{ 
              borderColor: theme.colors.secondary,
              animationDelay: '0.5s'
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 opacity-40 animate-ping"
            style={{ 
              borderColor: theme.colors.tertiary,
              animationDelay: '1s'
            }}
          />
        </div>
      </div>

      {/* Main loading content */}
      <div className="relative z-10 flex flex-col items-center space-y-8 p-8">
        {/* QuantumOS Logo */}
        <div className="text-center">
          <h1 
            className="text-6xl font-bold mb-2"
            style={{ 
              background: theme.gradients.primary,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            QuantumOS
          </h1>
          <p className="text-xl text-secondary opacity-80">
            Enterprise Quantum Computing Platform
          </p>
        </div>

        {/* Quantum Spinner */}
        <div className="relative">
          <div 
            className="w-24 h-24 border-4 border-transparent rounded-full animate-spin"
            style={{
              borderTopColor: theme.colors.primary,
              borderRightColor: theme.colors.secondary,
              borderBottomColor: theme.colors.tertiary,
              animation: `quantumSpin 2s ${theme.easings.superposition} infinite`
            }}
          />
          
          {/* Inner spinner */}
          <div 
            className="absolute inset-2 w-16 h-16 border-2 border-transparent rounded-full animate-spin"
            style={{
              borderTopColor: theme.colors.tertiary,
              borderLeftColor: theme.colors.primary,
              animation: `quantumSpin 1s ${theme.easings.entanglement} infinite reverse`
            }}
          />

          {/* Center dot */}
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full animate-pulse"
            style={{ 
              backgroundColor: theme.colors.primary,
              boxShadow: `0 0 20px ${theme.colors.primary}`
            }}
          />
        </div>

        {/* Loading Progress */}
        <div className="w-80 space-y-4">
          {/* Progress Bar */}
          <div className="relative h-2 bg-surface-primary rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: theme.gradients.primary,
                boxShadow: `0 0 10px ${theme.colors.primary}`
              }}
            />
            
            {/* Shimmer effect */}
            <div 
              className="absolute top-0 left-0 w-full h-full"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)`,
                animation: `shimmer 2s infinite linear`
              }}
            />
          </div>

          {/* Loading Message */}
          <div className="text-center">
            <p 
              className="text-lg font-medium transition-all duration-300"
              style={{ color: theme.colors.primary }}
            >
              {currentLoadingPhase.message}
            </p>
            <p className="text-sm text-tertiary mt-1">
              {progress}% Complete
            </p>
          </div>

          {/* Loading Phases */}
          <div className="flex justify-between text-xs text-tertiary">
            {loadingPhases.map((phase, index) => (
              <div 
                key={phase.name}
                className={`flex flex-col items-center transition-all duration-300 ${
                  index <= currentPhase ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <div 
                  className={`w-2 h-2 rounded-full mb-1 transition-all duration-300 ${
                    index <= currentPhase 
                      ? 'animate-pulse' 
                      : ''
                  }`}
                  style={{
                    backgroundColor: index <= currentPhase 
                      ? theme.colors.primary 
                      : theme.colors.text.tertiary,
                    boxShadow: index <= currentPhase 
                      ? `0 0 8px ${theme.colors.primary}` 
                      : 'none'
                  }}
                />
                <span className="capitalize">
                  {phase.name.replace('-', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="text-center text-xs text-tertiary space-y-1">
          <p>Electron {window.platform?.electron} • Node {window.platform?.node}</p>
          <p>Platform: {window.platform?.platform} ({window.platform?.arch})</p>
        </div>
      </div>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes quantumSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes quantumFloat {
          0%, 100% { 
            transform: translateY(0px) translateX(0px); 
            opacity: 0.2;
          }
          25% { 
            transform: translateY(-20px) translateX(10px); 
            opacity: 0.8;
          }
          50% { 
            transform: translateY(-10px) translateX(-10px); 
            opacity: 1;
          }
          75% { 
            transform: translateY(-30px) translateX(5px); 
            opacity: 0.6;
          }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};