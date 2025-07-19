import React, { useMemo } from 'react';

export interface MetricDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface MetricsChartProps {
  data: MetricDataPoint[];
  title: string;
  unit?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  valueFormatter?: (value: number) => string;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({
  data,
  title,
  unit = '',
  color = 'var(--quantum-primary)',
  height = 120,
  showGrid = true,
  showLabels = true,
  valueFormatter = (value) => value.toFixed(2)
}) => {
  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    const chartWidth = 300;
    const chartHeight = height - 40; // Reserve space for labels
    const pointSpacing = chartWidth / Math.max(data.length - 1, 1);

    const points = data.map((point, index) => ({
      x: index * pointSpacing,
      y: chartHeight - ((point.value - minValue) / range) * chartHeight,
      value: point.value,
      timestamp: point.timestamp
    }));

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    // Create gradient area
    const areaData = `${pathData} L ${points[points.length - 1]?.x || 0} ${chartHeight} L 0 ${chartHeight} Z`;

    return {
      points,
      pathData,
      areaData,
      minValue,
      maxValue,
      range,
      chartWidth,
      chartHeight,
      currentValue: values[values.length - 1] || 0,
      trend: values.length > 1 ? values[values.length - 1] - values[values.length - 2] : 0
    };
  }, [data, height]);

  if (!chartData) {
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        fontSize: '14px'
      }}>
        No data available
      </div>
    );
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'var(--status-success)';
    if (trend < 0) return 'var(--status-error)';
    return 'var(--text-secondary)';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return '↗';
    if (trend < 0) return '↘';
    return '→';
  };

  return (
    <div style={{ height, padding: '8px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '8px'
      }}>
        <div>
          <h4 style={{ 
            margin: 0, 
            fontSize: '12px', 
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {title}
          </h4>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            {valueFormatter(chartData.currentValue)}{unit}
          </div>
          <div style={{ 
            fontSize: '10px', 
            color: getTrendColor(chartData.trend),
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            justifyContent: 'flex-end'
          }}>
            <span>{getTrendIcon(chartData.trend)}</span>
            <span>{Math.abs(chartData.trend).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', height: chartData.chartHeight + 20 }}>
        <svg
          width="100%"
          height={chartData.chartHeight + 20}
          viewBox={`0 0 ${chartData.chartWidth} ${chartData.chartHeight + 20}`}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
            
            <filter id={`glow-${title}`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {showGrid && (
            <g opacity="0.1">
              {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                const y = chartData.chartHeight * ratio;
                return (
                  <line
                    key={ratio}
                    x1="0"
                    y1={y}
                    x2={chartData.chartWidth}
                    y2={y}
                    stroke="var(--text-secondary)"
                    strokeWidth="1"
                  />
                );
              })}
            </g>
          )}

          {/* Area fill */}
          <path
            d={chartData.areaData}
            fill={`url(#gradient-${title})`}
            opacity="0.6"
          />

          {/* Main line */}
          <path
            d={chartData.pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            filter={`url(#glow-${title})`}
          />

          {/* Data points */}
          {chartData.points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill={color}
              opacity={index === chartData.points.length - 1 ? 1 : 0.7}
            >
              <title>
                {valueFormatter(point.value)}{unit} at {new Date(point.timestamp).toLocaleTimeString()}
              </title>
            </circle>
          ))}

          {/* Value labels */}
          {showLabels && (
            <g fontSize="9" fontFamily="JetBrains Mono, monospace" fill="var(--text-secondary)">
              <text x="0" y={chartData.chartHeight + 15} textAnchor="start">
                {valueFormatter(chartData.minValue)}{unit}
              </text>
              <text x={chartData.chartWidth} y={chartData.chartHeight + 15} textAnchor="end">
                {valueFormatter(chartData.maxValue)}{unit}
              </text>
            </g>
          )}
        </svg>

        {/* Current value indicator */}
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            top: chartData.points[chartData.points.length - 1]?.y || 0,
            transform: 'translateY(-50%)',
            background: color,
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
        >
          {valueFormatter(chartData.currentValue)}{unit}
        </div>
      </div>
    </div>
  );
};