import { createContext, useContext, useState, ReactNode } from 'react';

type TagFilterState = [string[], (tags: string[]) => void];

const TagFilterContext = createContext<TagFilterState | null>(null);

// Wraps a tab's stack so its Restaurants and Dishes screens share one tag filter
export function TagFilterProvider({ children }: { children: ReactNode }) {
  const state = useState<string[]>([]);
  return <TagFilterContext.Provider value={state}>{children}</TagFilterContext.Provider>;
}

export function useSharedTagFilter(): TagFilterState {
  const state = useContext(TagFilterContext);
  if (!state) throw new Error('useSharedTagFilter must be used inside a TagFilterProvider');
  return state;
}
