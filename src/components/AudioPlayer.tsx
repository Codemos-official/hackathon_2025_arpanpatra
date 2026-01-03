import{ useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  RotateCcw 
} from 'lucide-react';
import clsx from 'clsx';

interface AudioPlayerProps {
  src: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onPlay: () => Promise<void>;
  onPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  fileName?: string | undefined;
}

export function AudioPlayer({
  src,
  isPlaying,
  currentTime,
  duration,
  volume,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  fileName,
}: AudioPlayerProps) {
  /**
   * Toggle playback.
   */
  const handleToggle = useCallback(async () => {
    if (isPlaying) {
      onPause();
    } else {
      await onPlay();
    }
  }, [isPlaying, onPlay, onPause]);
  
  /**
   * Skip backward 10 seconds.
   */
  const handleSkipBack = useCallback(() => {
    onSeek(Math.max(0, currentTime - 10));
  }, [currentTime, onSeek]);
  
  /**
   * Skip forward 10 seconds.
   */
  const handleSkipForward = useCallback(() => {
    onSeek(Math.min(duration, currentTime + 10));
  }, [currentTime, duration, onSeek]);
  
  /**
   * Reset to beginning.
   */
  const handleReset = useCallback(() => {
    onSeek(0);
  }, [onSeek]);
  
  /**
   * Toggle mute.
   */
  const handleMuteToggle = useCallback(() => {
    onVolumeChange(volume > 0 ? 0 : 1);
  }, [volume, onVolumeChange]);
  
  if (!src) return null;
  
  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900/80 rounded-xl border border-slate-700">
      {/* File name */}
      {fileName && (
        <div className="text-sm text-slate-400 truncate">
          {fileName}
        </div>
      )}
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {/* Reset button */}
        <button
          onClick={handleReset}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        
        {/* Skip back */}
        <button
          onClick={handleSkipBack}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Back 10s"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        
        {/* Play/Pause */}
        <button
          onClick={handleToggle}
          className={clsx(
            'p-4 rounded-full transition-all duration-200',
            'bg-insight-600 hover:bg-insight-500 text-white',
            'shadow-lg shadow-insight-600/30 hover:shadow-insight-500/40'
          )}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>
        
        {/* Skip forward */}
        <button
          onClick={handleSkipForward}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Forward 10s"
        >
          <SkipForward className="w-5 h-5" />
        </button>
        
        {/* Volume control */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={handleMuteToggle}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={volume > 0 ? 'Mute' : 'Unmute'}
          >
            {volume > 0 ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
          
          <input
            placeholder='place'
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      </div>
      
      {/* Time display */}
      <div className="flex justify-center text-sm text-slate-400">
        <span className="font-mono">{formatTime(currentTime)}</span>
        <span className="mx-2">/</span>
        <span className="font-mono">{formatTime(duration)}</span>
      </div>
    </div>
  );
}

/**
 * Format seconds to MM:SS or HH:MM:SS.
 */
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
