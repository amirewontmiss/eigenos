import React, { useEffect, useRef, useState } from 'react';

export interface DragDropEngineProps {
  onGateDrop: (gateType: string, position: { x: number; y: number }) => void;
  canvas: SVGSVGElement | null;
  viewport: {
    x: number;
    y: number;
    zoom: number;
    width: number;
    height: number;
  };
  gridSize: number;
}

export interface DragData {
  type: 'gate';
  gateType: string;
  sourceElement: HTMLElement;
  offset: { x: number; y: number };
}

export const DragDropEngine: React.FC<DragDropEngineProps> = ({
  onGateDrop,
  canvas,
  viewport,
  gridSize
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragData, setDragData] = useState<DragData | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dropZones, setDropZones] = useState<DOMRect[]>([]);
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  
  // Initialize drag and drop event listeners
  useEffect(() => {
    const handleDragStart = (event: DragEvent) => {
      const target = event.target as HTMLElement;
      const gateType = target.dataset.gateType;
      
      if (!gateType) return;
      
      const rect = target.getBoundingClientRect();
      const offset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      
      const dragData: DragData = {
        type: 'gate',
        gateType,
        sourceElement: target,
        offset
      };
      
      setDragData(dragData);
      setIsDragging(true);
      
      // Set drag image to be transparent (we'll show our custom preview)
      const emptyImg = new Image();
      emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
      event.dataTransfer?.setDragImage(emptyImg, 0, 0);
      
      // Calculate drop zones (qubit wire areas)
      if (canvas) {
        const canvasRect = canvas.getBoundingClientRect();
        const zones: DOMRect[] = [];
        
        // Assuming qubits are spaced by gridSize
        const qubitCount = Math.floor(viewport.height / viewport.zoom / gridSize);
        
        for (let i = 0; i < qubitCount; i++) {
          const y = i * gridSize;
          zones.push(new DOMRect(
            canvasRect.left,
            canvasRect.top + (y - viewport.y) * viewport.zoom,
            canvasRect.width,
            gridSize * viewport.zoom
          ));
        }
        
        setDropZones(zones);
      }
    };
    
    const handleDragOver = (event: DragEvent) => {
      event.preventDefault(); // Allow drop
      
      if (isDragging && dragData) {
        setDragPosition({
          x: event.clientX - dragData.offset.x,
          y: event.clientY - dragData.offset.y
        });
      }
    };
    
    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      
      if (!isDragging || !dragData || !canvas) return;
      
      const canvasRect = canvas.getBoundingClientRect();
      const canvasX = event.clientX - canvasRect.left;
      const canvasY = event.clientY - canvasRect.top;
      
      // Convert screen coordinates to canvas coordinates
      const canvasPosition = {
        x: canvasX / viewport.zoom + viewport.x,
        y: canvasY / viewport.zoom + viewport.y
      };
      
      // Check if drop is within canvas bounds
      if (
        canvasX >= 0 &&
        canvasX <= canvasRect.width &&
        canvasY >= 0 &&
        canvasY <= canvasRect.height
      ) {
        onGateDrop(dragData.gateType, canvasPosition);
      }
      
      cleanup();
    };
    
    const handleDragEnd = () => {
      cleanup();
    };
    
    const cleanup = () => {
      setIsDragging(false);
      setDragData(null);
      setDropZones([]);
    };
    
    // Add event listeners to document for global drag and drop
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragend', handleDragEnd);
    
    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, [isDragging, dragData, canvas, viewport, gridSize, onGateDrop]);
  
  // Gate type configurations for drag preview
  const GATE_CONFIGS = {
    X: { symbol: 'X', color: '#ff4757', width: 40, height: 40 },
    Y: { symbol: 'Y', color: '#2ed573', width: 40, height: 40 },
    Z: { symbol: 'Z', color: '#1e90ff', width: 40, height: 40 },
    H: { symbol: 'H', color: '#ffa502', width: 40, height: 40 },
    CNOT: { symbol: '⊕', color: '#3742fa', width: 60, height: 40 },
    S: { symbol: 'S', color: '#f9ca24', width: 40, height: 40 },
    T: { symbol: 'T', color: '#6c5ce7', width: 40, height: 40 },
    RX: { symbol: 'Rx', color: '#ff6b6b', width: 50, height: 40 },
    RY: { symbol: 'Ry', color: '#4ecdc4', width: 50, height: 40 },
    RZ: { symbol: 'Rz', color: '#45b7d1', width: 50, height: 40 }
  };
  
  // Get the appropriate drop zone highlight
  const getDropZoneHighlight = () => {
    if (!isDragging || !canvas) return null;
    
    const canvasRect = canvas.getBoundingClientRect();
    const mouseY = dragPosition.y + (dragData?.offset.y || 0);
    
    // Find which qubit wire we're hovering over
    const relativeY = (mouseY - canvasRect.top) / viewport.zoom + viewport.y;
    const qubitIndex = Math.floor(relativeY / gridSize);
    const qubitY = qubitIndex * gridSize;
    
    // Convert back to screen coordinates
    const screenY = (qubitY - viewport.y) * viewport.zoom + canvasRect.top;
    
    return (
      <div
        className="drop-zone-highlight"
        style={{
          position: 'fixed',
          left: canvasRect.left,
          top: screenY - (gridSize * viewport.zoom) / 2,
          width: canvasRect.width,
          height: gridSize * viewport.zoom,
          background: 'rgba(96, 239, 255, 0.2)',
          border: '2px dashed var(--quantum-primary)',
          pointerEvents: 'none',
          zIndex: 1000
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--quantum-primary)',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 'bold'
          }}
        >
          Qubit {qubitIndex}
        </div>
      </div>
    );
  };
  
  // Render drag preview
  const renderDragPreview = () => {
    if (!isDragging || !dragData) return null;
    
    const config = GATE_CONFIGS[dragData.gateType as keyof typeof GATE_CONFIGS];
    if (!config) return null;
    
    return (
      <div
        ref={dragPreviewRef}
        className="drag-preview"
        style={{
          position: 'fixed',
          left: dragPosition.x,
          top: dragPosition.y,
          width: config.width,
          height: config.height,
          background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)`,
          border: `2px solid ${config.color}`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 'bold',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          transform: 'rotate(2deg) scale(1.1)',
          pointerEvents: 'none',
          zIndex: 1001,
          opacity: 0.9
        }}
      >
        {config.symbol}
        
        {/* Quantum field effect */}
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            left: '-10px',
            right: '-10px',
            bottom: '-10px',
            background: `radial-gradient(circle, ${config.color}33, transparent)`,
            borderRadius: '16px',
            animation: 'quantum-pulse 1s ease-in-out infinite'
          }}
        />
      </div>
    );
  };
  
  return (
    <>
      {/* Drop zone highlights */}
      {getDropZoneHighlight()}
      
      {/* Drag preview */}
      {renderDragPreview()}
      
      {/* Snap grid visualization during drag */}
      {isDragging && canvas && (
        <div
          className="snap-grid-overlay"
          style={{
            position: 'fixed',
            left: canvas.getBoundingClientRect().left,
            top: canvas.getBoundingClientRect().top,
            width: canvas.getBoundingClientRect().width,
            height: canvas.getBoundingClientRect().height,
            pointerEvents: 'none',
            zIndex: 999,
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent ${gridSize * viewport.zoom - 1}px,
                rgba(96, 239, 255, 0.1) ${gridSize * viewport.zoom - 1}px,
                rgba(96, 239, 255, 0.1) ${gridSize * viewport.zoom}px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent ${gridSize * viewport.zoom - 1}px,
                rgba(96, 239, 255, 0.1) ${gridSize * viewport.zoom - 1}px,
                rgba(96, 239, 255, 0.1) ${gridSize * viewport.zoom}px
              )
            `
          }}
        />
      )}
      
      {/* Global drag styles */}
      <style>
        {`
          @keyframes quantum-pulse {
            0%, 100% {
              opacity: 0.3;
              transform: scale(1);
            }
            50% {
              opacity: 0.6;
              transform: scale(1.05);
            }
          }
          
          .drag-preview {
            animation: quantum-pulse 1s ease-in-out infinite;
          }
          
          .drop-zone-highlight {
            animation: drop-zone-pulse 0.5s ease-in-out infinite alternate;
          }
          
          @keyframes drop-zone-pulse {
            0% {
              opacity: 0.3;
            }
            100% {
              opacity: 0.6;
            }
          }
        `}
      </style>
    </>
  );
};