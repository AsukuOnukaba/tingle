import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Optimized query hook with automatic stale time and caching
 */
export function useOptimizedQuery<T>(
  key: string | string[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  const queryKey = useMemo(() => 
    Array.isArray(key) ? key : [key], 
    [key]
  );

  return useQuery<T, Error>({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Hook for real-time data that needs frequent updates
 */
export function useRealtimeQuery<T>(
  key: string | string[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  const queryKey = useMemo(() => 
    Array.isArray(key) ? key : [key], 
    [key]
  );

  return useQuery<T, Error>({
    queryKey,
    queryFn,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30000, // 30 seconds
    retry: 2,
    ...options,
  });
}
