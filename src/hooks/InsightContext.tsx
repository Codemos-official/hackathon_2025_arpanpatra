import { createContext, useContext, type ReactNode } from 'react';
import { useInsight, type UseInsightReturn } from './useInsight';

const InsightContext = createContext<UseInsightReturn | undefined>(undefined);

interface InsightProviderProps {
  children: ReactNode;
}

export function InsightProvider({ children }: InsightProviderProps) {
  const insight = useInsight();
  return (
    <InsightContext.Provider value={insight}>
      {children}
    </InsightContext.Provider>
  );
}

export function useInsightContext(): UseInsightReturn {
  const context = useContext(InsightContext);
  if (context === undefined) {
    throw new Error('useInsightContext must be used within an InsightProvider');
  }
  return context;
}