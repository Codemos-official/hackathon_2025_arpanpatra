import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { SearchResult } from '../types';

interface AudioVisualizerProps {
  audioUrl: string | null;
  currentTime: number;
  duration: number;
  searchResults: SearchResult[];
  onSeek: (time: number) => void;
  isPlaying: boolean;
}

interface WaveformData {
  peaks: Float32Array;
  duration: number;
}

export function AudioVisualizer({
  audioUrl,
  currentTime,
  duration,
  searchResults,
  onSeek,
  isPlaying,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const animationFrameRef = useRef<number>(0);
  
  useEffect(() => {
    if (!audioUrl) {
      setWaveformData(null);
      return;
    }
    
    const generateWaveform = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const samples = audioBuffer.numberOfChannels > 1
          ? mixToMono(audioBuffer.getChannelData(0), audioBuffer.getChannelData(1))
          : audioBuffer.getChannelData(0);
        
        const targetPeaks = 800; // Will be scaled to canvas width
        const samplesPerPeak = Math.floor(samples.length / targetPeaks);
        
        const peaks = new Float32Array(targetPeaks);
        
        for (let i = 0; i < targetPeaks; i++) {
          const start = i * samplesPerPeak;
          const end = Math.min(start + samplesPerPeak, samples.length);
          
          let max = 0;
          for (let j = start; j < end; j++) {
            const abs = Math.abs(samples[j] ?? 0);
            if (abs > max) max = abs;
          }
          peaks[i] = max;
        }
        
        setWaveformData({
          peaks,
          duration: audioBuffer.duration,
        });
        
        await audioContext.close();
      } catch (error) {
        console.error('Failed to generate waveform:', error);
      }
    };
    
    generateWaveform();
  }, [audioUrl]);
  

  function mixToMono(left: Float32Array, right: Float32Array): Float32Array {
    const mono = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      mono[i] = ((left[i] ?? 0) + (right[i] ?? 0)) / 2;
    }
    return mono;
  }
  

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const { width, height } = canvas;
    const dpr = window.devicePixelRatio || 1;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgba(15, 23, 42, 0.9)');
    bgGradient.addColorStop(1, 'rgba(30, 41, 59, 0.9)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw search result heatmap if we have results
    if (searchResults.length > 0 && duration > 0) {
      drawHeatmap(ctx, width, height, searchResults, duration);
    }
    
    // Draw waveform
    if (waveformData) {
      drawWaveform(ctx, width, height, waveformData);
    } else {
      // Draw placeholder when no waveform
      drawPlaceholder(ctx, width, height);
    }
    
    // Draw playhead
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width;
      
      // Playhead line
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
      
      // Playhead glow
      ctx.shadowColor = '#0ea5e9';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Played portion tint
      ctx.fillStyle = 'rgba(14, 165, 233, 0.1)';
      ctx.fillRect(0, 0, playheadX, height);
    }
    
    // Draw hover indicator
    if (isHovering && duration > 0) {
      const hoverX = hoverPosition * width;
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1 * dpr;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [waveformData, currentTime, duration, searchResults, isHovering, hoverPosition]);
  

  function drawWaveform(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: WaveformData
  ) {
    const { peaks } = data;
    const barWidth = width / peaks.length;
    const centerY = height / 2;
    
    // Waveform gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#38bdf8');
    gradient.addColorStop(0.5, '#0ea5e9');
    gradient.addColorStop(1, '#38bdf8');
    
    ctx.fillStyle = gradient;
    
    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i] ?? 0;
      const barHeight = Math.max(2, peak * height * 0.8);
      const x = i * barWidth;
      
      // Draw symmetric bar
      ctx.fillRect(
        x,
        centerY - barHeight / 2,
        Math.max(1, barWidth - 1),
        barHeight
      );
    }
  }
  
  function drawHeatmap(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    results: SearchResult[],
    totalDuration: number
  ) {
    for (const result of results) {
      const { segment, score } = result;
      
      const startX = (segment.start / totalDuration) * width;
      const endX = (segment.end / totalDuration) * width;
      const regionWidth = Math.max(endX - startX, 4); // Minimum width for visibility
      

      let color: string;
      let opacity: number;
      
      if (score > 0.7) {
        color = '239, 68, 68'; // red-500
        opacity = 0.4 + (score - 0.7) * 1;
      } else if (score > 0.5) {
        color = '234, 179, 8'; // yellow-500
        opacity = 0.3 + (score - 0.5) * 0.5;
      } else {
        color = '34, 197, 94'; // green-500
        opacity = 0.2 + score * 0.3;
      }

      ctx.fillStyle = `rgba(${color}, ${opacity})`;
      ctx.fillRect(startX, 0, regionWidth, height);
      
      ctx.fillStyle = `rgba(${color}, ${Math.min(1, opacity + 0.3)})`;
      ctx.fillRect(startX, 0, regionWidth, 3);
    }
  }
  

  function drawPlaceholder(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    const centerY = height / 2;
    
    ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
    
    for (let i = 0; i < 100; i++) {
      const x = (i / 100) * width;
      const barHeight = Math.random() * 40 + 10;
      const barWidth = width / 100 - 1;
      
      ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
    }
    
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Drop an audio file to visualize', width / 2, centerY);
  }
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
        
        draw();
      }
    });
    
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, [draw]);
  

  useEffect(() => {
    const animate = () => {
      draw();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      draw();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw, isPlaying]);
  

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const position = x / rect.width;
    const time = position * duration;
    
    onSeek(time);
  }, [duration, onSeek]);
  
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    setHoverPosition(x / rect.width);
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-900 border border-slate-700"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      />
      
      {duration > 0 && (
        <div className="absolute bottom-1 left-2 right-2 flex justify-between text-xs text-slate-400 pointer-events-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
      
      {searchResults.length > 0 && (
        <div className="absolute top-1 right-2 flex items-center gap-2 text-xs pointer-events-none">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-slate-400">Low</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-slate-400">Med</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-slate-400">High</span>
          </span>
        </div>
      )}
    </div>
  );
}


function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
