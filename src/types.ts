/**
 * InsightCast Type Definitions
 * 
 * This file defines the complete type system for the application, including:
 * - Discriminated unions for Worker message protocols
 * - Transcript and search result interfaces
 * - Audio processing types
 * 
 * Using discriminated unions ensures type-safe message passing between
 * the main thread and Web Worker with exhaustive pattern matching.
 */

// ============================================================================
// Core Data Types
// ============================================================================

/**
 * Represents a single segment of transcribed audio.
 * Each segment maps to a specific timestamp range in the original audio.
 */
export interface TranscriptSegment {
  /** Unique identifier for this segment (used as Orama document ID) */
  id: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** The transcribed text content */
  text: string;
}

/**
 * Extended segment with embedding vector for semantic search.
 * This is stored in the Orama database for vector similarity queries.
 */
export interface IndexedSegment extends TranscriptSegment {
  /** 384-dimensional embedding vector from mxbai-embed-xsmall-v1 */
  embedding: number[];
}

/**
 * Search result returned from Orama vector search.
 * Includes the original segment plus relevance scoring.
 */
export interface SearchResult {
  /** The matching transcript segment */
  segment: TranscriptSegment;
  /** Relevance score from 0 (no match) to 1 (perfect match) */
  score: number;
}

// ============================================================================
// Worker Input Messages (Main Thread → Worker)
// ============================================================================

/**
 * Initialize and load AI models.
 * This should be called once when the application starts.
 */
export interface LoadModelsMessage {
  type: 'load';
}

/**
 * Transcribe pre-decoded audio samples.
 * Audio must be decoded on main thread (AudioContext not available in Workers).
 * The worker will run Whisper, generate embeddings, and index all segments in Orama.
 */
export interface TranscribeMessage {
  type: 'transcribe';
  /** Audio samples as Float32Array (16kHz mono) - decoded on main thread */
  audioSamples: Float32Array;
  /** Duration in seconds */
  duration: number;
  /** Original filename for reference */
  fileName: string;
}

/**
 * Perform semantic search over transcribed content.
 * The query is embedded and matched against stored segments.
 */
export interface SearchMessage {
  type: 'search';
  /** Natural language search query */
  query: string;
  /** Maximum number of results to return (default: 10) */
  limit?: number;
}

/**
 * Clear all indexed data and reset the database.
 */
export interface ClearMessage {
  type: 'clear';
}

/**
 * Discriminated union of all possible input messages to the worker.
 */
export type WorkerInputMessage =
  | LoadModelsMessage
  | TranscribeMessage
  | SearchMessage
  | ClearMessage;

// ============================================================================
// Worker Output Messages (Worker → Main Thread)
// ============================================================================

/**
 * Progress update during model loading or transcription.
 * Used to update the UI with loading states and progress bars.
 */
export interface ProgressMessage {
  type: 'progress';
  /** Current operation stage */
  stage: 'loading-asr' | 'loading-embedder' | 'transcribing' | 'embedding' | 'indexing';
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable status message */
  message: string;
  /** Optional: File being downloaded */
  file?: string;
  /** Optional: Loaded size in bytes */
  loaded?: number;
  /** Optional: Total size in bytes */
  total?: number;
}

/**
 * Models have been successfully loaded and are ready.
 */
export interface ReadyMessage {
  type: 'ready';
  /** Device being used for inference */
  device: 'webgpu' | 'wasm';
  /** Model information */
  models: {
    asr: string;
    embedder: string;
  };
}

/**
 * Transcription completed successfully.
 */
export interface TranscriptionResultMessage {
  type: 'transcription-result';
  /** All transcribed segments */
  segments: TranscriptSegment[];
  /** Total audio duration in seconds */
  duration: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Search results from Orama vector query.
 */
export interface SearchResultsMessage {
  type: 'search-results';
  /** Matching segments with relevance scores */
  results: SearchResult[];
  /** Original query for reference */
  query: string;
  /** Search execution time in milliseconds */
  searchTime: number;
}

/**
 * Database cleared successfully.
 */
export interface ClearedMessage {
  type: 'cleared';
}

/**
 * Error occurred during processing.
 */
export interface ErrorMessage {
  type: 'error';
  /** Error message */
  message: string;
  /** Original error stack (if available) */
  stack?: string;
  /** Which operation failed */
  operation: 'load' | 'transcribe' | 'search' | 'clear';
}

/**
 * Discriminated union of all possible output messages from the worker.
 */
export type WorkerOutputMessage =
  | ProgressMessage
  | ReadyMessage
  | TranscriptionResultMessage
  | SearchResultsMessage
  | ClearedMessage
  | ErrorMessage;

// ============================================================================
// Application State Types
// ============================================================================

/**
 * Overall application state for the InsightCast context.
 */
export interface AppState {
  /** Whether AI models are loaded */
  isModelReady: boolean;
  /** Current inference device */
  device: 'webgpu' | 'wasm' | null;
  /** Whether a transcription is in progress */
  isTranscribing: boolean;
  /** Whether a search is in progress */
  isSearching: boolean;
  /** Current progress information */
  progress: ProgressInfo | null;
  /** Loaded audio file information */
  audioFile: AudioFileInfo | null;
  /** All transcribed segments */
  segments: TranscriptSegment[];
  /** Current search results */
  searchResults: SearchResult[];
  /** Current search query */
  searchQuery: string;
  /** Any error that occurred */
  error: string | null;
}

/**
 * Progress information for UI display.
 */
export interface ProgressInfo {
  stage: string;
  progress: number;
  message: string;
}

/**
 * Information about the loaded audio file.
 */
export interface AudioFileInfo {
  name: string;
  size: number;
  duration: number;
  url: string;
}

// ============================================================================
// Audio Processing Types
// ============================================================================

/**
 * Raw audio data after decoding.
 * Whisper expects 16kHz mono Float32Array.
 */
export interface ProcessedAudio {
  /** Audio samples as Float32Array */
  samples: Float32Array;
  /** Sample rate (should be 16000 for Whisper) */
  sampleRate: number;
  /** Duration in seconds */
  duration: number;
}

/**
 * Waveform data for visualization.
 */
export interface WaveformData {
  /** Normalized amplitude values (-1 to 1) */
  peaks: Float32Array;
  /** Number of samples per peak */
  samplesPerPeak: number;
  /** Duration in seconds */
  duration: number;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for the AudioVisualizer component.
 */
export interface AudioVisualizerProps {
  /** URL of the audio file to visualize */
  audioUrl: string | null;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Search results to overlay as heatmap */
  searchResults: SearchResult[];
  /** Callback when user seeks to a position */
  onSeek: (time: number) => void;
  /** Whether audio is currently playing */
  isPlaying: boolean;
}

/**
 * Props for the TranscriptView component.
 */
export interface TranscriptViewProps {
  /** All transcript segments */
  segments: TranscriptSegment[];
  /** Current playback position in seconds */
  currentTime: number;
  /** Search results with relevance scores */
  searchResults: SearchResult[];
  /** Callback when user clicks a segment */
  onSegmentClick: (segment: TranscriptSegment) => void;
}

/**
 * Props for the SearchBar component.
 */
export interface SearchBarProps {
  /** Current search query */
  query: string;
  /** Callback when query changes */
  onQueryChange: (query: string) => void;
  /** Callback when search is submitted */
  onSearch: () => void;
  /** Whether search is in progress */
  isSearching: boolean;
  /** Number of results found */
  resultCount: number;
}

/**
 * Props for the DropZone component.
 */
export interface DropZoneProps {
  /** Callback when file is dropped or selected */
  onFileSelect: (file: File) => void;
  /** Whether a file is being processed */
  isProcessing: boolean;
  /** Current progress info */
  progress: ProgressInfo | null;
}
