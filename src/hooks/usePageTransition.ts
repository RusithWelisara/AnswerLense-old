import { useState, useEffect, useCallback } from 'react';

interface TransitionState {
  isTransitioning: boolean;
  isLoading: boolean;
}

export function usePageTransition() {
  const [transitionState, setTransitionState] = useState<TransitionState>({
    isTransitioning: false,
    isLoading: false
  });

  // Check if user prefers reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const startTransition = useCallback(() => {
    if (prefersReducedMotion) return;
    
    setTransitionState({
      isTransitioning: true,
      isLoading: false
    });
  }, [prefersReducedMotion]);

  const endTransition = useCallback(() => {
    setTransitionState({
      isTransitioning: false,
      isLoading: false
    });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setTransitionState(prev => ({
      ...prev,
      isLoading: loading
    }));
  }, []);

  // Handle page visibility changes for better UX
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reset transition state when page becomes visible
        setTransitionState({
          isTransitioning: false,
          isLoading: false
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return {
    ...transitionState,
    startTransition,
    endTransition,
    setLoading,
    prefersReducedMotion
  };
}