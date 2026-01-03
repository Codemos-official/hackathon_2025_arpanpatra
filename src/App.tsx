import React, {useCallback} from 'react';
import { 
  Mic, FileText, Search as SearchIcon, AlertCircle, X, Github, Trash2
} from 'lucide-react';
import clsx from 'clsx';
import { useInsightContext } from './hooks/InsightContext';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { AudioVisualizer, DropZone, SearchBar, TranscriptView, AudioPlayer } from './components';

export function App() {
  const {
    isModelReady, isTranscribing, isSearching, device, progress,
    audioFile, segments, searchResults, searchQuery, error,
    loadAudio, search, clearAll, setSearchQuery,
  } = useInsightContext();
  
  const {
    audioRef, currentTime, duration, isPlaying, volume,
    play, pause, seek, setVolume,
  } = useAudioPlayer(audioFile?.url ?? null);
  
  const handleFileSelect = useCallback(async (file: File) => {
    await loadAudio(file);
  }, [loadAudio]);
  
  const handleSegmentClick = useCallback((segment: { start: number }) => {
    seek(segment.start);
    if (!isPlaying) play();
  }, [seek, isPlaying, play]);
  
  const handleSearch = useCallback((query?: string) => {
    const q = typeof query === 'string' ? query : searchQuery;
    if (q.trim()) search(q);
  }, [searchQuery, search]);
  
  const [dismissedError, setDismissedError] = React.useState(false);
  const handleDismissError = useCallback(() => setDismissedError(true), []);
  
  React.useEffect(() => { if (error) setDismissedError(false); }, [error]);
  
  const showError = error && !dismissedError;
  const hasTranscript = segments.length > 0;
  
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <audio ref={audioRef} src={audioFile?.url ?? undefined} preload="metadata" crossOrigin="anonymous"/>

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-insight-500 to-purple-600 flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">InsightCast</h1>
                <p className="text-xs text-slate-500">AI Podcast Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {hasTranscript && (
                <button onClick={clearAll} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
              <a title='s' href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </header>
      
      {showError && (
        <div className="bg-red-500/10 border-b border-red-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm flex-1">{error}</p>
              <button title='a' onClick={handleDismissError} className="p-1 rounded hover:bg-red-500/20 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {!hasTranscript ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center max-w-2xl animate-fade-in">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Understand Your Podcasts
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-insight-400 to-purple-400"> Instantly</span>
              </h2>
              <p className="text-lg text-slate-400">
                Upload any audio file and search for concepts. Local-first AI.
              </p>
            </div>
            <div className="w-full max-w-xl animate-slide-up">
              <DropZone onFileSelect={handleFileSelect} isProcessing={isTranscribing} progress={progress} isModelReady={isModelReady} device={device} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl mt-8">
               <FeatureCard icon={<Mic className="w-6 h-6" />} title="Local Transcription" description="Whisper AI runs entirely in your browser" />
               <FeatureCard icon={<SearchIcon className="w-6 h-6" />} title="Semantic Search" description="Find concepts and ideas, not just exact words" />
               <FeatureCard icon={<FileText className="w-6 h-6" />} title="Privacy First" description="Your audio never leaves your device" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex justify-center sticky top-20 z-40">
              <SearchBar query={searchQuery} onQueryChange={setSearchQuery} onSearch={handleSearch} isSearching={isSearching} resultCount={searchResults.length} disabled={!hasTranscript} />
            </div>
            <div className="mt-4">
              <AudioVisualizer audioUrl={audioFile?.url ?? null} currentTime={currentTime} duration={duration} searchResults={searchResults} onSeek={seek} isPlaying={isPlaying} />
            </div>
            <AudioPlayer src={audioFile?.url ?? null} isPlaying={isPlaying} currentTime={currentTime} duration={duration} volume={volume} onPlay={play} onPause={pause} onSeek={seek} onVolumeChange={setVolume} fileName={audioFile?.name} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-insight-400" /> Transcript
                  </h3>
                  <span className="text-sm text-slate-500">{segments.length} segments</span>
                </div>
                <div className="h-[400px] overflow-hidden">
                  <TranscriptView segments={segments} currentTime={currentTime} searchResults={searchResults} onSegmentClick={handleSegmentClick} searchQuery={searchQuery} />
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <SearchIcon className="w-5 h-5 text-insight-400" /> Search Results
                </h3>
                {searchResults.length > 0 ? (
                  <div className="space-y-3 h-[400px] overflow-y-auto custom-scrollbar">
                    {searchResults.map((result, index) => (
                      <div key={result.segment.id} onClick={() => handleSegmentClick(result.segment)} className={clsx('p-3 rounded-lg cursor-pointer transition-all duration-200 border border-slate-700 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-800')}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-500">#{index + 1}</span>
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', result.score > 0.7 && 'bg-red-500/20 text-red-400', result.score > 0.5 && result.score <= 0.7 && 'bg-yellow-500/20 text-yellow-400', result.score <= 0.5 && 'bg-green-500/20 text-green-400')}>
                            {(result.score * 100).toFixed(0)}% match
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 line-clamp-2">{result.segment.text}</p>
                        <p className="text-xs text-slate-500 mt-2">{formatTime(result.segment.start)} - {formatTime(result.segment.end)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-slate-500">
                    <SearchIcon className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">{searchQuery ? 'No results found' : 'Enter a search query'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
             <p className="text-sm text-slate-500">Powered by Whisper + Transformers.js + Orama</p>
             <p className="text-sm text-slate-600">All processing runs locally in your browser</p>
          </div>
        </div>
      </footer>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.4); border-radius: 3px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.6); }`}</style>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string; }) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-xl bg-slate-900/50 border border-slate-800">
      <div className="w-12 h-12 rounded-lg bg-insight-500/20 flex items-center justify-center text-insight-400 mb-4">{icon}</div>
      <h3 className="text-white font-medium mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default App;