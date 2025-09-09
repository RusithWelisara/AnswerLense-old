import React, { useEffect, useState } from 'react';
import { usePageTransition } from '../hooks/usePageTransition';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const { isTransitioning, isLoading, prefersReducedMotion } = usePageTransition();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after component mounts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50); // Small delay to ensure smooth entrance

    return () => clearTimeout(timer);
  }, []);

  const transitionClasses = prefersReducedMotion 
    ? 'opacity-100' 
    : `transition-all duration-500 ease-in-out ${
        isVisible && !isTransitioning 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      }`;

  return (
    <div className={`page-transition-wrapper ${transitionClasses} ${className}`}>
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
      <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}