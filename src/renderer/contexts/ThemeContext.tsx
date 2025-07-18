import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface QuantumTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    surface: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    border: {
      primary: string;
      secondary: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
  gradients: {
    primary: string;
    superposition: string;
    background: string;
  };
  shadows: {
    small: string;
    medium: string;
    large: string;
    glow: string;
  };
  animations: {
    fast: string;
    normal: string;
    slow: string;
    superposition: string;
  };
  easings: {
    superposition: string;
    collapse: string;
    entanglement: string;
    decoherence: string;
  };
}

const quantumDarkTheme: QuantumTheme = {
  name: 'Quantum Dark',
  colors: {
    primary: '#60efff',
    secondary: '#ff006e',
    tertiary: '#00ff87',
    background: {
      primary: '#0a0a0a',
      secondary: '#1a1a2e',
      tertiary: '#16213e'
    },
    surface: {
      primary: 'rgba(255, 255, 255, 0.08)',
      secondary: 'rgba(255, 255, 255, 0.12)',
      tertiary: 'rgba(255, 255, 255, 0.16)'
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      tertiary: 'rgba(255, 255, 255, 0.5)'
    },
    border: {
      primary: 'rgba(255, 255, 255, 0.1)',
      secondary: 'rgba(255, 255, 255, 0.05)'
    },
    status: {
      success: '#00ff87',
      warning: '#ffbe0b',
      error: '#ff006e',
      info: '#60efff'
    }
  },
  gradients: {
    primary: 'linear-gradient(135deg, #60efff 0%, #ff006e 100%)',
    superposition: 'linear-gradient(45deg, #00ff87, #60efff, #ff006e)',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
  },
  shadows: {
    small: '0 2px 4px rgba(96, 239, 255, 0.1)',
    medium: '0 4px 8px rgba(96, 239, 255, 0.15)',
    large: '0 8px 16px rgba(96, 239, 255, 0.2)',
    glow: '0 0 20px rgba(96, 239, 255, 0.3)'
  },
  animations: {
    fast: '0.15s',
    normal: '0.3s',
    slow: '0.5s',
    superposition: '2s'
  },
  easings: {
    superposition: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    collapse: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
    entanglement: 'cubic-bezier(0.19, 1, 0.22, 1)',
    decoherence: 'cubic-bezier(0.77, 0, 0.175, 1)'
  }
};

const quantumLightTheme: QuantumTheme = {
  name: 'Quantum Light',
  colors: {
    primary: '#0066cc',
    secondary: '#cc0066',
    tertiary: '#00cc66',
    background: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      tertiary: '#e9ecef'
    },
    surface: {
      primary: 'rgba(0, 0, 0, 0.03)',
      secondary: 'rgba(0, 0, 0, 0.06)',
      tertiary: 'rgba(0, 0, 0, 0.09)'
    },
    text: {
      primary: '#000000',
      secondary: 'rgba(0, 0, 0, 0.7)',
      tertiary: 'rgba(0, 0, 0, 0.5)'
    },
    border: {
      primary: 'rgba(0, 0, 0, 0.1)',
      secondary: 'rgba(0, 0, 0, 0.05)'
    },
    status: {
      success: '#00cc66',
      warning: '#ff9500',
      error: '#cc0066',
      info: '#0066cc'
    }
  },
  gradients: {
    primary: 'linear-gradient(135deg, #0066cc 0%, #cc0066 100%)',
    superposition: 'linear-gradient(45deg, #00cc66, #0066cc, #cc0066)',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%)'
  },
  shadows: {
    small: '0 2px 4px rgba(0, 102, 204, 0.1)',
    medium: '0 4px 8px rgba(0, 102, 204, 0.15)',
    large: '0 8px 16px rgba(0, 102, 204, 0.2)',
    glow: '0 0 20px rgba(0, 102, 204, 0.3)'
  },
  animations: {
    fast: '0.15s',
    normal: '0.3s',
    slow: '0.5s',
    superposition: '2s'
  },
  easings: {
    superposition: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    collapse: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
    entanglement: 'cubic-bezier(0.19, 1, 0.22, 1)',
    decoherence: 'cubic-bezier(0.77, 0, 0.175, 1)'
  }
};

export const themes = {
  dark: quantumDarkTheme,
  light: quantumLightTheme
};

interface ThemeContextType {
  theme: QuantumTheme;
  themeName: keyof typeof themes;
  setTheme: (themeName: keyof typeof themes) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeName, setThemeName] = useState<keyof typeof themes>('dark');
  const [theme, setTheme] = useState<QuantumTheme>(themes.dark);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('quantumos-theme') as keyof typeof themes;
    if (savedTheme && themes[savedTheme]) {
      setThemeName(savedTheme);
      setTheme(themes[savedTheme]);
    }
  }, []);

  // Update CSS custom properties when theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Update color properties
    root.style.setProperty('--quantum-primary', theme.colors.primary);
    root.style.setProperty('--quantum-secondary', theme.colors.secondary);
    root.style.setProperty('--quantum-tertiary', theme.colors.tertiary);
    
    root.style.setProperty('--background-primary', theme.colors.background.primary);
    root.style.setProperty('--background-secondary', theme.colors.background.secondary);
    root.style.setProperty('--background-tertiary', theme.colors.background.tertiary);
    
    root.style.setProperty('--surface-primary', theme.colors.surface.primary);
    root.style.setProperty('--surface-secondary', theme.colors.surface.secondary);
    root.style.setProperty('--surface-tertiary', theme.colors.surface.tertiary);
    
    root.style.setProperty('--text-primary', theme.colors.text.primary);
    root.style.setProperty('--text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--text-tertiary', theme.colors.text.tertiary);
    
    root.style.setProperty('--border-primary', theme.colors.border.primary);
    root.style.setProperty('--border-secondary', theme.colors.border.secondary);
    
    root.style.setProperty('--quantum-success', theme.colors.status.success);
    root.style.setProperty('--quantum-warning', theme.colors.status.warning);
    root.style.setProperty('--quantum-error', theme.colors.status.error);
    root.style.setProperty('--quantum-info', theme.colors.status.info);
    
    // Update gradient properties
    root.style.setProperty('--quantum-gradient-primary', theme.gradients.primary);
    root.style.setProperty('--quantum-gradient-superposition', theme.gradients.superposition);
    root.style.setProperty('--quantum-gradient-background', theme.gradients.background);
    
    // Update shadow properties
    root.style.setProperty('--quantum-shadow-sm', theme.shadows.small);
    root.style.setProperty('--quantum-shadow-md', theme.shadows.medium);
    root.style.setProperty('--quantum-shadow-lg', theme.shadows.large);
    root.style.setProperty('--quantum-shadow-glow', theme.shadows.glow);
    
    // Update animation properties
    root.style.setProperty('--quantum-duration-fast', theme.animations.fast);
    root.style.setProperty('--quantum-duration-normal', theme.animations.normal);
    root.style.setProperty('--quantum-duration-slow', theme.animations.slow);
    root.style.setProperty('--quantum-duration-superposition', theme.animations.superposition);
    
    // Update easing properties
    root.style.setProperty('--quantum-ease-superposition', theme.easings.superposition);
    root.style.setProperty('--quantum-ease-collapse', theme.easings.collapse);
    root.style.setProperty('--quantum-ease-entanglement', theme.easings.entanglement);
    root.style.setProperty('--quantum-ease-decoherence', theme.easings.decoherence);
    
    // Update document background
    document.body.style.background = theme.gradients.background;
    
    // Save theme to localStorage
    localStorage.setItem('quantumos-theme', themeName);
  }, [theme, themeName]);

  const handleSetTheme = (newThemeName: keyof typeof themes) => {
    setThemeName(newThemeName);
    setTheme(themes[newThemeName]);
  };

  const toggleTheme = () => {
    const newThemeName = themeName === 'dark' ? 'light' : 'dark';
    handleSetTheme(newThemeName);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeName,
        setTheme: handleSetTheme,
        toggleTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Utility hook for creating theme-aware styles
export const useThemedStyles = () => {
  const { theme } = useTheme();
  
  const createStyles = (styleFunction: (theme: QuantumTheme) => React.CSSProperties) => {
    return styleFunction(theme);
  };
  
  return { theme, createStyles };
};