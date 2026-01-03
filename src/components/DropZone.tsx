import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileAudio, Loader2, Cpu, Zap } from 'lucide-react';
import clsx from 'clsx';
import type { ProgressInfo } from '../types';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  progress: ProgressInfo | null;
  isModelReady: boolean;
  device: 'webgpu' | 'wasm' | null;
}

const ACCEPTED_FORMATS = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
];

export function DropZone({
  onFileSelect,
  isProcessing,
  progress,
  isModelReady,
  device,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const validateFile = useCallback((file: File): boolean => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      // Also check by extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      const validExts = ['mp3', 'wav', 'mp4', 'm4a', 'ogg', 'webm', 'flac'];
      if (!ext || !validExts.includes(ext)) {
        setDragError(`Unsupported format. Please use: MP3, WAV, M4A, OGG, WebM, or FLAC`);
        return false;
      }
    }
    setDragError(null);
    return true;
  }, []);
  

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    
    if (isProcessing || !isModelReady) return;
    
    const file = event.dataTransfer.files[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }, [isProcessing, isModelReady, onFileSelect, validateFile]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!isProcessing && isModelReady) {
      setIsDragOver(true);
    }
  }, [isProcessing, isModelReady]);
  

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);
  

  const handleClick = useCallback(() => {
    if (!isProcessing && isModelReady && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isProcessing, isModelReady]);
  

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
    // Reset input for re-selection of same file
    event.target.value = '';
  }, [onFileSelect, validateFile]);

  const renderContent = () => {
    // Loading models state
    if (!isModelReady && progress) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-insight-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-mono text-insight-400">
                {progress.progress.toFixed(0)}%
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-1">
              {progress.stage}
            </h3>
            <p className="text-sm text-slate-400 max-w-xs">
              {progress.message}
            </p>
          </div>
          
          {/* Progress bar */}
          <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-insight-600 to-insight-400 transition-all duration-300 ease-out"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          
          <p className="text-xs text-slate-500">
            This may take a few minutes on first load
          </p>
        </div>
      );
    }
    
    // Processing/transcribing state
    if (isProcessing && progress) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <FileAudio className="w-16 h-16 text-insight-500 animate-pulse" />
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-1">
              {progress.stage}
            </h3>
            <p className="text-sm text-slate-400 max-w-xs">
              {progress.message}
            </p>
          </div>
          
          {/* Progress bar */}
          <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-300 ease-out"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      );
    }
    
    // Ready state
    return (
      <div className="flex flex-col items-center gap-4">
        <div className={clsx(
          'p-4 rounded-full transition-all duration-300',
          isDragOver 
            ? 'bg-insight-500/30 scale-110' 
            : 'bg-slate-800 hover:bg-slate-700'
        )}>
          <Upload className={clsx(
            'w-12 h-12 transition-colors',
            isDragOver ? 'text-insight-400' : 'text-slate-400'
          )} />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-1">
            {isDragOver ? 'Drop to analyze' : 'Drop Audio Here'}
          </h3>
          <p className="text-sm text-slate-400">
            or click to select a file
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Supports MP3, WAV, M4A, OGG, WebM, FLAC
          </p>
        </div>
        
        {/* Device indicator */}
        {device && (
          <div className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
            device === 'webgpu' 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-yellow-500/20 text-yellow-400'
          )}>
            {device === 'webgpu' ? (
              <>
                <Zap className="w-3 h-3" />
                GPU Accelerated
              </>
            ) : (
              <>
                <Cpu className="w-3 h-3" />
                CPU Mode
              </>
            )}
          </div>
        )}
        
        {dragError && (
          <p className="text-sm text-red-400 mt-2">
            {dragError}
          </p>
        )}
      </div>
    );
  };
  
  return (
    <div
      className={clsx(
        'relative w-full min-h-[280px] rounded-2xl border-2 border-dashed transition-all duration-300 flex items-center justify-center p-8',
        isDragOver && isModelReady && 'border-insight-500 bg-insight-500/10 scale-[1.02]',
        !isDragOver && isModelReady && 'border-slate-600 hover:border-slate-500 bg-slate-900/50',
        !isModelReady && 'border-slate-700 bg-slate-900/30',
        isModelReady && !isProcessing && 'cursor-pointer'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      {/* Hidden file input */}
      <input
      title='file input'
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* Animated background gradient when dragging */}
      {isDragOver && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-insight-500/20 via-transparent to-purple-500/20 animate-pulse" />
        </div>
      )}
      
      {renderContent()}
    </div>
  );
}
