import React, { useMemo } from 'react';

export interface StateHistogramProps {
  results: Record<string, number>;
  qubits: number;
  maxBars?: number;
  height?: number;
  showProbabilities?: boolean;
  showValues?: boolean;
  color?: string;
  className?: string;
}

export interface HistogramBar {
  state: string;
  count: number;
  probability: number;
  height: number;
  color: string;
}

export const StateHistogram: React.FC<StateHistogramProps> = ({
  results,
  qubits,
  maxBars = 16,
  height = 200,
  showProbabilities = true,
  showValues = true,
  color = 'var(--quantum-primary)',
  className = ''
}) => {
  const histogramData = useMemo((): HistogramBar[] => {
    const totalShots = Object.values(results).reduce((sum, count) => sum + count, 0);
    if (totalShots === 0) return [];

    // Sort by count (descending) and take top maxBars
    const sortedStates = Object.entries(results)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxBars);

    const maxCount = Math.max(...sortedStates.map(([, count]) => count));

    return sortedStates.map(([state, count], index) => {
      const probability = count / totalShots;
      const barHeight = (count / maxCount) * (height - 60); // Reserve space for labels
      
      // Generate color variations
      const hue = index * (360 / maxBars);
      const barColor = `hsl(${hue}, 70%, 60%)`;

      return {
        state,
        count,
        probability,
        height: barHeight,
        color: barColor
      };
    });
  }, [results, qubits, maxBars, height]);

  const totalShots = Object.values(results).reduce((sum, count) => sum + count, 0);
  const chartWidth = Math.max(400, histogramData.length * 60);
  const barWidth = Math.max(20, (chartWidth - 80) / histogramData.length - 10);

  if (histogramData.length === 0) {
    return (
      <div 
        className={`state-histogram ${className}`}
        style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: '14px'
        }}
      >
        No measurement results available
      </div>
    );
  }

  return (
    <div className={`state-histogram ${className}`} style={{ width: '100%', height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        <defs>
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0.4" />
          </linearGradient>
          
          <filter id="barGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <g opacity="0.1">
          {[0.25, 0.5, 0.75, 1].map(ratio => {
            const y = height - 40 - (height - 60) * ratio;
            return (
              <line
                key={ratio}
                x1="40"
                y1={y}
                x2={chartWidth - 20}
                y2={y}
                stroke="var(--text-secondary)"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            );
          })}
        </g>

        {/* Y-axis */}
        <line
          x1="40"
          y1="20"
          x2="40"
          y2={height - 40}
          stroke="var(--text-secondary)"
          strokeWidth="2"
        />

        {/* X-axis */}
        <line
          x1="40"
          y1={height - 40}
          x2={chartWidth - 20}
          y2={height - 40}
          stroke="var(--text-secondary)"
          strokeWidth="2"
        />

        {/* Y-axis labels */}
        {showValues && (
          <g fontSize="10" fontFamily="'JetBrains Mono', monospace" fill="var(--text-secondary)">
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
              const y = height - 40 - (height - 60) * ratio;
              const value = Math.round(histogramData[0]?.count * ratio) || 0;
              return (
                <text key={ratio} x="35" y={y + 3} textAnchor="end">
                  {value}
                </text>
              );
            })}
          </g>
        )}

        {/* Bars */}
        {histogramData.map((bar, index) => {
          const x = 50 + index * (barWidth + 10);
          const y = height - 40 - bar.height;

          return (
            <g key={bar.state}>
              {/* Bar shadow */}
              <rect
                x={x + 2}
                y={y + 2}
                width={barWidth}
                height={bar.height}
                fill="rgba(0, 0, 0, 0.2)"
                rx="2"
              />

              {/* Main bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={bar.height}
                fill={`url(#barGradient)`}
                stroke={bar.color}
                strokeWidth="1"
                rx="2"
                filter="url(#barGlow)"
              >
                <animate
                  attributeName="height"
                  from="0"
                  to={bar.height}
                  dur="1s"
                  begin="0s"
                  fill="freeze"
                />
                <animate
                  attributeName="y"
                  from={height - 40}
                  to={y}
                  dur="1s"
                  begin="0s"
                  fill="freeze"
                />
              </rect>

              {/* Value label on top of bar */}
              {showValues && bar.height > 15 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="'JetBrains Mono', monospace"
                  fill="var(--text-primary)"
                  fontWeight="bold"
                >
                  {bar.count}
                </text>
              )}

              {/* Probability percentage */}
              {showProbabilities && bar.height > 30 && (
                <text
                  x={x + barWidth / 2}
                  y={y + bar.height / 2}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="'JetBrains Mono', monospace"
                  fill="white"
                  fontWeight="bold"
                >
                  {(bar.probability * 100).toFixed(1)}%
                </text>
              )}

              {/* State label */}
              <text
                x={x + barWidth / 2}
                y={height - 25}
                textAnchor="middle"
                fontSize="12"
                fontFamily="'JetBrains Mono', monospace"
                fill="var(--text-primary)"
                fontWeight="bold"
              >
                |{bar.state}⟩
              </text>

              {/* Binary representation */}
              <text
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="8"
                fontFamily="'JetBrains Mono', monospace"
                fill="var(--text-secondary)"
              >
                {parseInt(bar.state, 2)}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={chartWidth / 2}
          y={height - 5}
          textAnchor="middle"
          fontSize="12"
          fontFamily="'JetBrains Mono', monospace"
          fill="var(--text-secondary)"
          fontWeight="bold"
        >
          Measurement Outcomes
        </text>

        <text
          x="15"
          y={height / 2}
          textAnchor="middle"
          fontSize="12"
          fontFamily="'JetBrains Mono', monospace"
          fill="var(--text-secondary)"
          fontWeight="bold"
          transform={`rotate(-90, 15, ${height / 2})`}
        >
          Counts
        </text>

        {/* Statistics overlay */}
        <g>
          <rect
            x={chartWidth - 150}
            y="10"
            width="140"
            height="60"
            fill="rgba(0, 0, 0, 0.7)"
            stroke="var(--border-primary)"
            strokeWidth="1"
            rx="4"
          />
          
          <text
            x={chartWidth - 145}
            y="25"
            fontSize="10"
            fontFamily="'JetBrains Mono', monospace"
            fill="white"
            fontWeight="bold"
          >
            Statistics
          </text>
          
          <text
            x={chartWidth - 145}
            y="40"
            fontSize="9"
            fontFamily="'JetBrains Mono', monospace"
            fill="white"
          >
            Total Shots: {totalShots.toLocaleString()}
          </text>
          
          <text
            x={chartWidth - 145}
            y="52"
            fontSize="9"
            fontFamily="'JetBrains Mono', monospace"
            fill="white"
          >
            States: {histogramData.length}
          </text>
          
          <text
            x={chartWidth - 145}
            y="64"
            fontSize="9"
            fontFamily="'JetBrains Mono', monospace"
            fill="white"
          >
            Entropy: {calculateEntropy(histogramData).toFixed(3)}
          </text>
        </g>
      </svg>
    </div>
  );
};

// Helper function to calculate Shannon entropy
function calculateEntropy(data: HistogramBar[]): number {
  return -data.reduce((entropy, bar) => {
    if (bar.probability === 0) return entropy;
    return entropy + bar.probability * Math.log2(bar.probability);
  }, 0);
}