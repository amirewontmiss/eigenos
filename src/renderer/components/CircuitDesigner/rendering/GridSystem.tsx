import React from 'react';

export interface GridConfig {
  size: number;
  subdivisions: number;
  opacity: number;
  majorLineWidth: number;
  minorLineWidth: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface GridSystemProps {
  config: GridConfig;
  viewport: Viewport;
  visible: boolean;
}

export const GridSystem: React.FC<GridSystemProps> = ({ config, viewport, visible }) => {
  if (!visible) return null;
  
  const { size, subdivisions, opacity, majorLineWidth, minorLineWidth } = config;
  
  // Calculate grid bounds based on viewport
  const gridBounds = {
    left: Math.floor(viewport.x / size) * size,
    right: Math.ceil((viewport.x + viewport.width / viewport.zoom) / size) * size,
    top: Math.floor(viewport.y / size) * size,
    bottom: Math.ceil((viewport.y + viewport.height / viewport.zoom) / size) * size
  };
  
  // Generate major grid lines
  const majorLines: React.ReactElement[] = [];
  
  // Vertical major lines
  for (let x = gridBounds.left; x <= gridBounds.right; x += size) {
    majorLines.push(
      <line
        key={`major-v-${x}`}
        x1={x}
        y1={gridBounds.top}
        x2={x}
        y2={gridBounds.bottom}
        stroke="var(--border-primary)"
        strokeWidth={majorLineWidth}
        opacity={opacity * 0.8}
        className="grid-major-line"
      />
    );
  }
  
  // Horizontal major lines
  for (let y = gridBounds.top; y <= gridBounds.bottom; y += size) {
    majorLines.push(
      <line
        key={`major-h-${y}`}
        x1={gridBounds.left}
        y1={y}
        x2={gridBounds.right}
        y2={y}
        stroke="var(--border-primary)"
        strokeWidth={majorLineWidth}
        opacity={opacity * 0.8}
        className="grid-major-line"
      />
    );
  }
  
  // Generate minor grid lines (subdivisions)
  const minorLines: React.ReactElement[] = [];
  const minorStep = size / subdivisions;
  
  if (viewport.zoom > 0.5) { // Only show minor lines at higher zoom levels
    // Vertical minor lines
    for (let x = gridBounds.left; x <= gridBounds.right; x += minorStep) {
      if (x % size !== 0) { // Skip major line positions
        minorLines.push(
          <line
            key={`minor-v-${x}`}
            x1={x}
            y1={gridBounds.top}
            x2={x}
            y2={gridBounds.bottom}
            stroke="var(--border-primary)"
            strokeWidth={minorLineWidth}
            opacity={opacity * 0.4}
            className="grid-minor-line"
          />
        );
      }
    }
    
    // Horizontal minor lines
    for (let y = gridBounds.top; y <= gridBounds.bottom; y += minorStep) {
      if (y % size !== 0) { // Skip major line positions
        minorLines.push(
          <line
            key={`minor-h-${y}`}
            x1={gridBounds.left}
            y1={y}
            x2={gridBounds.right}
            y2={y}
            stroke="var(--border-primary)"
            strokeWidth={minorLineWidth}
            opacity={opacity * 0.4}
            className="grid-minor-line"
          />
        );
      }
    }
  }
  
  // Generate origin indicator
  const originIndicator = (
    <g className="grid-origin">
      <circle
        cx={0}
        cy={0}
        r={3}
        fill="var(--quantum-primary)"
        opacity={opacity}
      />
      <text
        x={8}
        y={-8}
        fontSize="10"
        fontFamily="'JetBrains Mono', monospace"
        fill="var(--text-secondary)"
        opacity={opacity}
      >
        (0,0)
      </text>
    </g>
  );
  
  // Generate coordinate labels (only at higher zoom levels)
  const coordinateLabels: React.ReactElement[] = [];
  
  if (viewport.zoom > 0.8) {
    const labelStep = size * Math.max(1, Math.floor(4 / viewport.zoom));
    
    // X-axis labels
    for (let x = gridBounds.left; x <= gridBounds.right; x += labelStep) {
      if (x !== 0) {
        coordinateLabels.push(
          <text
            key={`label-x-${x}`}
            x={x}
            y={gridBounds.top - 5}
            textAnchor="middle"
            fontSize="9"
            fontFamily="'JetBrains Mono', monospace"
            fill="var(--text-secondary)"
            opacity={opacity * 0.6}
            className="grid-coordinate-label"
          >
            {x}
          </text>
        );
      }
    }
    
    // Y-axis labels
    for (let y = gridBounds.top; y <= gridBounds.bottom; y += labelStep) {
      if (y !== 0) {
        coordinateLabels.push(
          <text
            key={`label-y-${y}`}
            x={gridBounds.left - 10}
            y={y}
            textAnchor="end"
            dominantBaseline="central"
            fontSize="9"
            fontFamily="'JetBrains Mono', monospace"
            fill="var(--text-secondary)"
            opacity={opacity * 0.6}
            className="grid-coordinate-label"
          >
            {y}
          </text>
        );
      }
    }
  }
  
  // Generate snap indicators for precise positioning
  const snapIndicators: React.ReactElement[] = [];
  
  if (viewport.zoom > 1.5) {
    for (let x = gridBounds.left; x <= gridBounds.right; x += size) {
      for (let y = gridBounds.top; y <= gridBounds.bottom; y += size) {
        snapIndicators.push(
          <circle
            key={`snap-${x}-${y}`}
            cx={x}
            cy={y}
            r={1.5}
            fill="var(--quantum-primary)"
            opacity={opacity * 0.5}
            className="grid-snap-point"
          />
        );
      }
    }
  }
  
  return (
    <g className="grid-system" opacity={opacity}>
      {/* Minor grid lines (drawn first, behind major lines) */}
      <g className="grid-minor">
        {minorLines}
      </g>
      
      {/* Major grid lines */}
      <g className="grid-major">
        {majorLines}
      </g>
      
      {/* Coordinate labels */}
      <g className="grid-labels">
        {coordinateLabels}
      </g>
      
      {/* Snap indicators */}
      <g className="grid-snap-indicators">
        {snapIndicators}
      </g>
      
      {/* Origin indicator */}
      {originIndicator}
      
      {/* Grid info overlay (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <text
          x={viewport.x + 10}
          y={viewport.y + 20}
          fontSize="10"
          fontFamily="'JetBrains Mono', monospace"
          fill="var(--text-secondary)"
          opacity={0.5}
        >
          Grid: {size}px, Zoom: {viewport.zoom.toFixed(2)}x
        </text>
      )}
    </g>
  );
};