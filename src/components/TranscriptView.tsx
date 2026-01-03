import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Clock, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import type { TranscriptSegment, SearchResult } from '../types';

interface TranscriptViewProps {
  segments: TranscriptSegment[];
  currentTime: number;
  searchResults: SearchResult[];
  onSegmentClick: (segment: TranscriptSegment) => void;
  searchQuery: string;
}

export function TranscriptView({
  segments,
  currentTime,
  searchResults,
  onSegmentClick,
  searchQuery,
}: TranscriptViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  
  /**
   * Create a map of segment IDs to search results for quick lookup.
   */
  const searchResultMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const result of searchResults) {
      map.set(result.segment.id, result.score);
    }
    return map;
  }, [searchResults]);
  
  /**
   * Find the currently playing segment.
   */
  const currentSegmentIndex = useMemo(() => {
    return segments.findIndex(
      (seg) => currentTime >= seg.start && currentTime < seg.end
    );
  }, [segments, currentTime]);
  
  /**
   * Auto-scroll to current segment.
   */
  useEffect(() => {
    if (activeSegmentRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeSegmentRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      // Check if element is out of view
      if (
        elementRect.top < containerRect.top ||
        elementRect.bottom > containerRect.bottom
      ) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentSegmentIndex]);
  
  /**
   * Highlight search terms in text.
   */
  const highlightText = useCallback((text: string, hasMatch: boolean) => {
    if (!searchQuery || !hasMatch) {
      return text;
    }
    
    // Simple word-based highlighting (semantic search may match concepts, not exact words)
    // We'll highlight if any search term appears
    const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const lowerText = text.toLowerCase();
    
    let highlighted = text;
    for (const term of terms) {
      const index = lowerText.indexOf(term);
      if (index !== -1) {
        const before = highlighted.slice(0, index);
        const match = highlighted.slice(index, index + term.length);
        const after = highlighted.slice(index + term.length);
        highlighted = `${before}<mark class="bg-insight-500/40 text-white rounded px-0.5">${match}</mark>${after}`;
        break; // Only highlight first match per segment
      }
    }
    
    return highlighted;
  }, [searchQuery]);
  
  /**
   * Get relevance indicator style based on score.
   */
  const getRelevanceStyle = (score: number): string => {
    if (score > 0.7) return 'border-l-red-500 bg-red-500/10';
    if (score > 0.5) return 'border-l-yellow-500 bg-yellow-500/10';
    return 'border-l-green-500 bg-green-500/10';
  };
  
  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <p className="text-sm">Transcript will appear here</p>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className="flex flex-col gap-1 h-full overflow-y-auto pr-2 custom-scrollbar"
    >
      {segments.map((segment, index) => {
        const isActive = index === currentSegmentIndex;
        const searchScore = searchResultMap.get(segment.id);
        const hasSearchMatch = searchScore !== undefined;
        
        return (
          <div
            key={segment.id}
            ref={isActive ? activeSegmentRef : null}
            onClick={() => onSegmentClick(segment)}
            className={clsx(
              'group relative px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 border-l-4',
              // Active state (currently playing)
              isActive && 'bg-insight-500/20 border-l-insight-500',
              // Search match state
              !isActive && hasSearchMatch && getRelevanceStyle(searchScore),
              // Default state
              !isActive && !hasSearchMatch && 'border-l-transparent hover:bg-slate-800/50',
            )}
          >
            {/* Timestamp badge */}
            <div className={clsx(
              'flex items-center gap-1.5 text-xs mb-1.5',
              isActive ? 'text-insight-400' : 'text-slate-500'
            )}>
              <Clock className="w-3 h-3" />
              <span>{formatTime(segment.start)}</span>
              <span className="text-slate-600">→</span>
              <span>{formatTime(segment.end)}</span>
              
              {/* Relevance score badge */}
              {hasSearchMatch && (
                <span className={clsx(
                  'ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                  searchScore > 0.7 && 'bg-red-500/20 text-red-400',
                  searchScore > 0.5 && searchScore <= 0.7 && 'bg-yellow-500/20 text-yellow-400',
                  searchScore <= 0.5 && 'bg-green-500/20 text-green-400',
                )}>
                  <Sparkles className="w-2.5 h-2.5" />
                  {(searchScore * 100).toFixed(0)}%
                </span>
              )}
            </div>
            
            {/* Transcript text */}
            <p 
              className={clsx(
                'text-sm leading-relaxed',
                isActive ? 'text-white' : 'text-slate-300'
              )}
              dangerouslySetInnerHTML={{ 
                __html: highlightText(segment.text, hasSearchMatch) 
              }}
            />
            
            {/* Hover play indicator */}
            <div className={clsx(
              'absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity',
              'text-xs text-slate-400'
            )}>
              Click to play
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Format seconds to MM:SS.
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  
  return `${m}:${s.toString().padStart(2, '0')}`;
}
