import {
  pipeline,
  AutomaticSpeechRecognitionPipeline,
  FeatureExtractionPipeline,
  type ProgressCallback,
} from '@huggingface/transformers';

import { create, insertMultiple, search, type Orama } from '@orama/orama';

import type {
  WorkerInputMessage,
  WorkerOutputMessage,
  TranscriptSegment,
  SearchResult,
} from './types';

const ASR_MODEL = 'onnx-community/whisper-base';
const EMBEDDER_MODEL = 'Xenova/all-MiniLM-L6-v2'; 
const EMBEDDING_DIM = 384; 

const WINDOW_SIZE = 3; 
const STRIDE = 1;      
const QUESTION_PATTERNS = {
  definition: /\b(what is|what are|define|meaning of|definition)\b/i,
  origin: /\b(where does|where do|origin|source|come from|comes from)\b/i,
  howTo: /\b(how can|how do|how to|ways to|improve|develop|better)\b/i,
  example: /\b(example|examples|instance|such as|like what|give me|show me|real life)\b/i,
  author: /\b(who|author|person|says|believes|believed|troward)\b/i, // Added specific author names here if known
};

const ANSWER_INDICATORS: Record<string, string[]> = {
  definition: ['is', 'means', 'refers to', 'defined as', 'is like'],
  origin: ['comes from', 'source', 'part of', 'connected to'],
  howTo: ['by', 'through', 'learn to', 'practice', 'listening', 'trust'],
  example: ['for example', 'such as', 'like when', 'imagine', 'think of'],
  author: ['says', 'believes', 'believed', 'according to'],
};

let currentDevice: 'webgpu' | 'wasm' = 'wasm';
let asrPipeline: AutomaticSpeechRecognitionPipeline | null = null;
let embedderPipeline: FeatureExtractionPipeline | null = null;
let oramaDb: Orama<any> | null = null;

function postMessage(message: WorkerOutputMessage): void {
  self.postMessage(message);
}

function log(message: string, data?: any) {
  console.log(`[Worker] ${message}`, data || '');
}

function generateId(): string {
  return `seg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function checkWebGPUSupport(): Promise<boolean> {
  if (!('gpu' in navigator)) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;
    return true;
  } catch {
    return false;
  }
}

function createProgressCallback(stage: 'loading-asr' | 'loading-embedder'): ProgressCallback {
  return (progress) => {
    if (progress.status === 'progress' && progress.progress !== undefined) {
      postMessage({ type: 'progress', stage, progress: progress.progress, message: `Downloading ${progress.file ?? 'model'}...` });
    } else if (progress.status === 'done') {
      postMessage({ type: 'progress', stage, progress: 100, message: 'Model loaded successfully' });
    } else if (progress.status === 'initiate') {
      postMessage({ type: 'progress', stage, progress: 0, message: `Initializing ${progress.file ?? 'model'}...` });
    }
  };
}

function chunkTextWithWindow(text: string): { text: string; startRatio: number; endRatio: number }[] {
  // Split by sentence ending punctuation
  const sentenceRegex = /[^.!?]+[.!?]+["']?|[^.!?]+$/g;
  const sentences = text.match(sentenceRegex)?.map(s => s.trim()).filter(s => s.length > 0) || [text];

  const chunks: { text: string; startRatio: number; endRatio: number }[] = [];
  
  for (let i = 0; i < sentences.length; i += STRIDE) {
    const windowSentences = sentences.slice(i, i + WINDOW_SIZE);
    if (windowSentences.length === 0) break;

    const chunkText = windowSentences.join(' ');
    
    const chunkStartChar = text.indexOf(windowSentences[0] ?? ''); 
    const chunkEndChar = chunkStartChar + chunkText.length;

    chunks.push({
      text: chunkText,
      startRatio: Math.max(0, chunkStartChar / text.length),
      endRatio: Math.min(1, chunkEndChar / text.length)
    });

    if (i + WINDOW_SIZE >= sentences.length) break;
  }

  return chunks;
}


function detectQuestionIntent(query: string): string[] {
  const intents: string[] = [];
  for (const [type, pattern] of Object.entries(QUESTION_PATTERNS)) {
    if (pattern.test(query)) intents.push(type);
  }
  return intents.length > 0 ? intents : ['general'];
}

function calculateHeuristicBoost(text: string, intents: string[]): number {
  let boost = 0;
  const lowerText = text.toLowerCase();
  
  for (const intent of intents) {
    const indicators = ANSWER_INDICATORS[intent] || [];
    for (const indicator of indicators) {
      if (lowerText.includes(indicator)) {
        boost += 0.1;
      }
    }
  }
  return Math.min(boost, 0.3);
}

async function loadModels(): Promise<void> {
  try {
    const hasWebGPU = await checkWebGPUSupport();
    const embedderDevice = hasWebGPU ? 'webgpu' : 'wasm';
    
    currentDevice = embedderDevice as 'webgpu' | 'wasm';
    
    log(`Initializing Models. GPU Available: ${hasWebGPU}`);

    // ASR
    postMessage({ type: 'progress', stage: 'loading-asr', progress: 5, message: 'Loading Whisper ASR (CPU)...' });
    asrPipeline = await pipeline('automatic-speech-recognition', ASR_MODEL, {
      device: 'wasm', dtype: 'q8', progress_callback: createProgressCallback('loading-asr'),
    }) as any as AutomaticSpeechRecognitionPipeline;
    
    // Embedder
    postMessage({ type: 'progress', stage: 'loading-embedder', progress: 0, message: `Loading Embedder (${embedderDevice.toUpperCase()})...` });
    embedderPipeline = await pipeline('feature-extraction', EMBEDDER_MODEL, {
      device: embedderDevice, dtype: embedderDevice === 'webgpu' ? 'fp16' : 'q8', progress_callback: createProgressCallback('loading-embedder'),
    }) as any as FeatureExtractionPipeline;
    
    oramaDb = await create({
      schema: {
        id: 'string',
        segmentId: 'string',
        text: 'string',            // Indexed for Keyword Search
        fullSegmentText: 'string', // Display text
        start: 'number',
        end: 'number',
        embedding: 'vector[384]',  // Indexed for Vector Search
      } as const,
    });
    
    postMessage({ type: 'ready', device: currentDevice, models: { asr: ASR_MODEL, embedder: EMBEDDER_MODEL } });
    
  } catch (error) {
    postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error', operation: 'load' });
  }
}

async function transcribeAudio(audioSamples: Float32Array, duration: number): Promise<void> {
  const startTime = performance.now();
  try {
    if (!asrPipeline || !embedderPipeline || !oramaDb) throw new Error('Models not loaded');
    
    log('Starting Transcription...');

    const transcriptionResult = await asrPipeline(audioSamples, {
      return_timestamps: true, chunk_length_s: 30, stride_length_s: 5, language: 'english', task: 'transcribe',
    });
    
    const segments: TranscriptSegment[] = [];
    const results = Array.isArray(transcriptionResult) ? transcriptionResult : [transcriptionResult];
    
    for (const result of results) {
      if (result.chunks && Array.isArray(result.chunks)) {
        for (const chunk of result.chunks) {
           const [start, end] = chunk.timestamp;
           const text = chunk.text?.trim() ?? '';
           if(text) segments.push({ id: generateId(), start, end, text });
        }
      }
    }

    log(`Transcription done. Generated ${segments.length} segments.`);

    const documentsToIndex: any[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment) continue;
      
      const chunks = chunkTextWithWindow(segment.text);
      
      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j];
        if (!chunk) continue;
        
        const embeddingResult = await embedderPipeline(chunk.text, { pooling: 'mean', normalize: true });
        const embedding = Array.from(embeddingResult.data);
        
        if (embedding.length !== EMBEDDING_DIM) continue;

        documentsToIndex.push({
          id: `${segment.id}_${j}`,
          segmentId: segment.id,
          text: chunk.text, 
          fullSegmentText: segment.text, // Store for display
          start: segment.start,
          end: segment.end,
          embedding: embedding,
        });
      }

      if (i % 5 === 0) {
        postMessage({ type: 'progress', stage: 'embedding', progress: 60 + (i / segments.length) * 30, message: `Embedding ${i}/${segments.length}` });
      }
    }
    
    await insertMultiple(oramaDb, documentsToIndex as any);
    postMessage({ type: 'transcription-result', segments, duration, processingTime: performance.now() - startTime });
    
  } catch (error) {
    postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Transcription failed', operation: 'transcribe' });
  }
}

async function semanticSearch(query: string, limit: number = 10): Promise<void> {
  const startTime = performance.now();
  try {
    if (!embedderPipeline || !oramaDb) throw new Error('Models not ready');
    log(`Searching for: "${query}"`);

    // 1. Intent Detection
    const intents = detectQuestionIntent(query);
    log(`Detected intents: ${intents.join(', ')}`);

    // 2. Generate Vector
    const embeddingResult = await embedderPipeline(query, { pooling: 'mean', normalize: true });
    const queryVector = Array.from(embeddingResult.data);

    const searchResults = await search(oramaDb, {
      mode: 'hybrid', 
      term: query, // Uses BM25 (Keyword matching)
      vector: {
        value: queryVector,
        property: 'embedding', // Uses Vector Similarity
      },
      properties: ['text'], // Perform keyword search on the text field
      limit: 20, // Fetch more to allow for re-ranking
      similarity: 0.4, // Baseline similarity
    });

    log(`Found ${searchResults.hits.length} hybrid hits.`);

    // 4. Heuristic Re-ranking
    const scoredResults = new Map<string, any>();

    for (const hit of searchResults.hits) {
      const doc = hit.document as any;
      
      const heuristicBoost = calculateHeuristicBoost(doc.text, intents);
      
      const finalScore = hit.score + heuristicBoost;

      const existing = scoredResults.get(doc.segmentId);
      if (!existing || finalScore > existing.score) {
        scoredResults.set(doc.segmentId, {
          segment: {
            id: doc.segmentId,
            text: doc.fullSegmentText, // Display full context
            start: doc.start,
            end: doc.end,
          },
          score: finalScore
        });
      }
    }

    let results: SearchResult[] = Array.from(scoredResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (results.length > 0 && results[0] !== undefined) {
      const maxScore = results[0].score;
      results = results.map(r => ({
        ...r,
        score: Math.min(r.score / (maxScore * 1.1), 0.99)
      }));
    }
    
    postMessage({ type: 'search-results', results, query, searchTime: performance.now() - startTime });
    
  } catch (error) {
    postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Search failed', operation: 'search' });
  }
}

async function clearDatabase(): Promise<void> {
    oramaDb = await create({
      schema: {
        id: 'string', segmentId: 'string', text: 'string', fullSegmentText: 'string', start: 'number', end: 'number', embedding: 'vector[384]',
      } as const,
    });
    postMessage({ type: 'cleared' });
}

self.onmessage = async (event: MessageEvent<WorkerInputMessage>) => {
  const message = event.data;
  switch (message.type) {
    case 'load': await loadModels(); break;
    case 'transcribe': await transcribeAudio(message.audioSamples, message.duration); break;
    case 'search': await semanticSearch(message.query, message.limit ?? 10); break;
    case 'clear': await clearDatabase(); break;
  }
};