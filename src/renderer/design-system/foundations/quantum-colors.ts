// Quantum-inspired color system based on quantum state physics
export interface QuantumColorPalette {
  superposition: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  entanglement: {
    correlated: string;
    anticorrelated: string;
  };
  measurement: {
    collapsed: string;
    probability: string;
  };
  decoherence: {
    noise: string;
    error: string;
  };
  system: {
    background: string;
    surface: string;
    border: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
  };
}

export const quantumColors: QuantumColorPalette = {
  superposition: {
    primary: 'hsl(180, 100%, 70%)',    // Cyan - |+⟩ state
    secondary: 'hsl(300, 100%, 70%)',  // Magenta - |−⟩ state
    tertiary: 'hsl(120, 100%, 70%)',   // Green - |0⟩ state
  },
  entanglement: {
    correlated: 'hsl(45, 100%, 65%)',      // Gold - entangled states
    anticorrelated: 'hsl(225, 100%, 65%)', // Blue - anti-entangled
  },
  measurement: {
    collapsed: 'hsl(0, 100%, 65%)',    // Red - measurement collapse
    probability: 'hsl(270, 50%, 80%)', // Purple - probability amplitudes
  },
  decoherence: {
    noise: 'hsl(0, 0%, 50%)',          // Gray - environmental noise
    error: 'hsl(15, 100%, 60%)',       // Orange - quantum errors
  },
  system: {
    background: 'hsl(220, 20%, 8%)',   // Dark quantum void
    surface: 'hsl(220, 15%, 12%)',     // Slightly lighter surface
    border: 'hsl(220, 10%, 20%)',      // Subtle borders
    text: {
      primary: 'hsl(0, 0%, 95%)',      // High contrast white
      secondary: 'hsl(0, 0%, 70%)',    // Medium contrast gray
      disabled: 'hsl(0, 0%, 40%)',     // Low contrast gray
    },
  },
};

// CSS Custom Properties for quantum colors
export const quantumCSSVariables = `
  :root {
    /* Superposition States */
    --quantum-primary: ${quantumColors.superposition.primary};
    --quantum-secondary: ${quantumColors.superposition.secondary};
    --quantum-tertiary: ${quantumColors.superposition.tertiary};
    
    /* Entanglement States */
    --quantum-correlated: ${quantumColors.entanglement.correlated};
    --quantum-anticorrelated: ${quantumColors.entanglement.anticorrelated};
    
    /* Measurement States */
    --quantum-collapsed: ${quantumColors.measurement.collapsed};
    --quantum-probability: ${quantumColors.measurement.probability};
    
    /* Decoherence States */
    --quantum-noise: ${quantumColors.decoherence.noise};
    --quantum-error: ${quantumColors.decoherence.error};
    
    /* System Colors */
    --background-primary: ${quantumColors.system.background};
    --surface-primary: ${quantumColors.system.surface};
    --border-primary: ${quantumColors.system.border};
    --text-primary: ${quantumColors.system.text.primary};
    --text-secondary: ${quantumColors.system.text.secondary};
    --text-disabled: ${quantumColors.system.text.disabled};
    
    /* Semantic Colors */
    --quantum-success: hsl(120, 100%, 60%);
    --quantum-warning: hsl(45, 100%, 60%);
    --quantum-danger: hsl(0, 100%, 60%);
    --quantum-info: hsl(210, 100%, 60%);
    
    /* Glass Morphism */
    --glass-background: rgba(255, 255, 255, 0.05);
    --glass-border: rgba(255, 255, 255, 0.1);
    --glass-backdrop: blur(16px) saturate(180%);
  }
`;

// Utility functions for color manipulation
export const colorUtils = {
  // Convert HSL to RGB
  hslToRgb: (hsl: string): { r: number; g: number; b: number } => {
    const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) throw new Error('Invalid HSL format');
    
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (h < 1/6) { r = c; g = x; b = 0; }
    else if (h < 2/6) { r = x; g = c; b = 0; }
    else if (h < 3/6) { r = 0; g = c; b = x; }
    else if (h < 4/6) { r = 0; g = x; b = c; }
    else if (h < 5/6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  },
  
  // Create quantum field gradient
  createQuantumGradient: (state: 'superposition' | 'entangled' | 'collapsed'): string => {
    switch (state) {
      case 'superposition':
        return `linear-gradient(45deg, ${quantumColors.superposition.primary}, ${quantumColors.superposition.secondary})`;
      case 'entangled':
        return `linear-gradient(90deg, ${quantumColors.entanglement.correlated}, ${quantumColors.entanglement.anticorrelated})`;
      case 'collapsed':
        return `radial-gradient(circle, ${quantumColors.measurement.collapsed}, ${quantumColors.decoherence.noise})`;
      default:
        return quantumColors.system.surface;
    }
  },
  
  // Add quantum noise to color
  addQuantumNoise: (color: string, intensity: number = 0.1): string => {
    // Simple implementation - in practice would add actual noise
    return color;
  }
};

export default quantumColors;