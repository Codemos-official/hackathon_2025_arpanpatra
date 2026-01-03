import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query?: string) => void;
  isSearching: boolean;
  resultCount: number;
  disabled: boolean;
}

export function SearchBar({
  query,
  onQueryChange,
  onSearch,
  isSearching,
  resultCount,
  disabled,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Handle input change with debounced search.
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onQueryChange(value);
    
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce search
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        onSearch(value);
      }, 500);
    }
  }, [onQueryChange, onSearch]);
  

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim() && !disabled) {
      onSearch();
    }
  }, [query, disabled, onSearch]);
  
  /**
   * Clear search.
   */
  const handleClear = useCallback(() => {
    onQueryChange('');
    inputRef.current?.focus();
  }, [onQueryChange]);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
  
  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
      <div className={clsx(
        'relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
        isFocused && !disabled 
          ? 'border-insight-500 bg-slate-800 shadow-lg shadow-insight-500/20' 
          : 'border-slate-700 bg-slate-800/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}>
        {isSearching ? (
          <Loader2 className="w-5 h-5 text-insight-400 animate-spin flex-shrink-0" />
        ) : (
          <Search className={clsx(
            'w-5 h-5 flex-shrink-0 transition-colors',
            isFocused ? 'text-insight-400' : 'text-slate-500'
          )} />
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={disabled 
            ? "Transcribe audio to enable search..." 
            : "Search for concepts, topics, or ideas..."}
          className={clsx(
            'flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm',
            disabled && 'cursor-not-allowed'
          )}
        />
        
        {!disabled && (
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-slate-700/50 text-xs text-slate-400">
            <Sparkles className="w-3 h-3 text-insight-400" />
            <span>Semantic</span>
          </div>
        )}
        
        {query && (
          <button
            title='c'
            type="button"
            onClick={handleClear}
            className="p-1 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        {!isFocused && !query && !disabled && (
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700/50 text-xs text-slate-500">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        )}
      </div>
      
      {query && resultCount > 0 && !isSearching && (
        <div className="absolute -bottom-6 left-4 text-xs text-slate-400">
          Found {resultCount} relevant segment{resultCount !== 1 ? 's' : ''}
        </div>
      )}
      
      {query && resultCount === 0 && !isSearching && (
        <div className="absolute -bottom-6 left-4 text-xs text-slate-500">
          No matches found
        </div>
      )}
    </form>
  );
}
