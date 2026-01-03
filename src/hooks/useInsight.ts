import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  TranscriptSegment,
  SearchResult,
  WorkerInputMessage,
  WorkerOutputMessage,
  ProgressInfo,
  AudioFileInfo,
} from '../types';


export interface UseInsightReturn {
  isModelReady: boolean;
  isTranscribing: boolean;
  isSearching: boolean;
  device: 'webgpu' | 'wasm' | null;
  progress: ProgressInfo | null;
  audioFile: AudioFileInfo | null;
  segments: TranscriptSegment[];
  searchResults: SearchResult[];
  searchQuery: string;
  error: string | null;
  
  loadAudio: (file: File) => Promise<void>;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  clearAll: () => void;
  setSearchQuery: (query: string) => void;
}


export function useInsight(): UseInsightReturn {
  const workerRef = useRef<Worker | null>(null);
  
  const audioUrlRef = useRef<string | null>(null);
  
  const [isModelReady, setIsModelReady] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [device, setDevice] = useState<'webgpu' | 'wasm' | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [audioFile, setAudioFile] = useState<AudioFileInfo | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
    }
  }, [searchQuery]);
  

  const postToWorker = useCallback((message: WorkerInputMessage) => {
    if (workerRef.current) {
      workerRef.current.postMessage(message);
    } else {
      console.error('Worker not initialized');
      setError('AI Worker not initialized. Please refresh the page.');
    }
  }, []);

  const handleWorkerMessage = useCallback((event: MessageEvent<WorkerOutputMessage>) => {
    const message = event.data;
    
    switch (message.type) {
      case 'progress':
        setProgress({
          stage: formatStage(message.stage),
          progress: message.progress,
          message: message.message,
        });
        break;
        
      case 'ready':
        setIsModelReady(true);
        setDevice(message.device);
        setProgress(null);
        setError(null);
        console.log(`Models loaded on ${message.device}:`, message.models);
        break;
        
      case 'transcription-result':
        setIsTranscribing(false);
        setSegments(message.segments);
        setProgress(null);
        console.log(`Transcription complete: ${message.segments.length} segments in ${(message.processingTime / 1000).toFixed(1)}s`);
        break;
        
      case 'search-results':
        setIsSearching(false);
        setSearchResults(message.results);
        console.log(`Search complete: ${message.results.length} results in ${message.searchTime.toFixed(0)}ms`);
        break;
        
      case 'cleared':
        setSegments([]);
        setSearchResults([]);
        setSearchQuery('');
        setAudioFile(null);
        // Revoke old audio URL if exists
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        break;
        
      case 'error':
        setError(message.message);
        setProgress(null);
        setIsTranscribing(false);
        setIsSearching(false);
        console.error(`Worker error (${message.operation}):`, message.message, message.stack);
        break;
        
      default:
        // TypeScript exhaustive check
        const _exhaustive: never = message;
        console.warn('Unknown worker message:', _exhaustive);
    }
  }, []);
  

  useEffect(() => {
    const worker = new Worker(
      new URL('../worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    worker.onmessage = handleWorkerMessage;
    worker.onerror = (error) => {
      console.error('Worker error:', error);
      setError(`Worker error: ${error.message}`);
    };
    
    workerRef.current = worker;
    
    setProgress({
      stage: 'Initializing',
      progress: 0,
      message: 'Starting AI engine...',
    });
    
    worker.postMessage({ type: 'load' } as WorkerInputMessage);
    
    return () => {
      worker.terminate();
      workerRef.current = null;
      
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [handleWorkerMessage]);
  

  const decodeAudioFile = useCallback(async (file: File): Promise<{ samples: Float32Array; duration: number }> => {
    const arrayBuffer = await file.arrayBuffer();
    
    const audioContext = new AudioContext();
    let audioBuffer: AudioBuffer;
    
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } finally {
      await audioContext.close();
    }
    
    const duration = audioBuffer.duration;
    const TARGET_SAMPLE_RATE = 16000;
    
    const targetLength = Math.ceil(duration * TARGET_SAMPLE_RATE);
    
    const offlineContext = new OfflineAudioContext(
      1, // mono output
      targetLength,
      TARGET_SAMPLE_RATE
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
    
    const resampledBuffer = await offlineContext.startRendering();
    const samples = resampledBuffer.getChannelData(0);
    
    return { samples: new Float32Array(samples), duration };
  }, []);


  const loadAudio = useCallback(async (file: File): Promise<void> => {
    if (!isModelReady) {
      setError('Please wait for models to load before uploading audio.');
      return;
    }
    
    setError(null);
    setIsTranscribing(true);
    setSegments([]);
    setSearchResults([]);
    setSearchQuery('');
    
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    
    const url = URL.createObjectURL(file);
    audioUrlRef.current = url;
    
    const audio = new Audio(url);
    await new Promise<void>((resolve, reject) => {
      audio.onloadedmetadata = () => resolve();
      audio.onerror = () => reject(new Error('Failed to load audio file'));
    });
    
    setAudioFile({
      name: file.name,
      size: file.size,
      duration: audio.duration,
      url,
    });
    
    setProgress({
      stage: 'Processing',
      progress: 0,
      message: 'Decoding audio file...',
    });
    
    try {
      const { samples, duration: audioDuration } = await decodeAudioFile(file);
      
      setProgress({
        stage: 'Processing',
        progress: 5,
        message: 'Sending to AI worker...',
      });
      
      postToWorker({
        type: 'transcribe',
        audioSamples: samples,
        duration: audioDuration,
        fileName: file.name,
      });
    } catch (decodeError) {
      setIsTranscribing(false);
      setError(`Failed to decode audio: ${decodeError instanceof Error ? decodeError.message : 'Unknown error'}`);
    }
  }, [isModelReady, postToWorker, decodeAudioFile]);
  

  const search = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    if (segments.length === 0) {
      setError('No transcription available. Please upload and transcribe audio first.');
      return;
    }
    
    setError(null);
    setIsSearching(true);
    setSearchQuery(query);
    
    postToWorker({
      type: 'search',
      query: query.trim(),
      limit: 20,
    });
  }, [segments.length, postToWorker]);
  

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchQuery('');
  }, []);
  

  const clearAll = useCallback(() => {
    postToWorker({ type: 'clear' });
  }, [postToWorker]);
  
  return {
    isModelReady,
    isTranscribing,
    isSearching,
    device,
    progress,
    audioFile,
    segments,
    searchResults,
    searchQuery,
    error,
    
    loadAudio,
    search,
    clearSearch,
    clearAll,
    setSearchQuery,
  };
}


function formatStage(stage: string): string {
  const stageMap: Record<string, string> = {
    'loading-asr': 'Loading Speech Recognition',
    'loading-embedder': 'Loading Embedding Model',
    'transcribing': 'Transcribing Audio',
    'embedding': 'Generating Embeddings',
    'indexing': 'Indexing for Search',
  };
  
  return stageMap[stage] ?? stage;
}
