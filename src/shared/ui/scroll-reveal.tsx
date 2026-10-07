'use client';

import React, { useEffect, useRef, useState } from 'react';

type RevealState = 'in-view' | 'below' | 'above';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  durationMs?: number;
  once?: boolean;
}

const checkCallbacks = new Set<() => void>();
let isListenerBound = false;

function bindScrollListener() {
  if (typeof window === 'undefined' || isListenerBound) return;
  isListenerBound = true;

  let ticking = false;
  const notifyAll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        checkCallbacks.forEach((cb) => cb());
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', notifyAll, { passive: true });
  window.addEventListener('resize', notifyAll, { passive: true });
}

export function ScrollReveal({
  children,
  className = '',
  delayMs = 0,
  direction = 'up',
  durationMs = 600,
  once = false,
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>('below');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    bindScrollListener();

    const el = elementRef.current;
    if (!el) return;

    // Check prefers-reduced-motion
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setState('in-view');
      return;
    }

    const checkVisibility = () => {
      const node = elementRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const windowHeight =
        window.innerHeight || document.documentElement.clientHeight;

      const buffer = 30;

      if (rect.top < windowHeight - buffer && rect.bottom > buffer) {
        setState('in-view');
        if (once) {
          checkCallbacks.delete(checkVisibility);
        }
      } else if (!once) {
        if (rect.top >= windowHeight - buffer) {
          setState('below');
        } else if (rect.bottom <= buffer) {
          setState('above');
        }
      }
    };

    // Evaluate immediately on mount
    checkVisibility();

    checkCallbacks.add(checkVisibility);

    return () => {
      checkCallbacks.delete(checkVisibility);
    };
  }, [once]);

  const getTransformClasses = () => {
    // Default to fully visible during SSR or when in active view
    if (!mounted || state === 'in-view') {
      return 'opacity-100 translate-x-0 translate-y-0 scale-100';
    }

    if (direction === 'none') {
      return 'opacity-0 scale-95';
    }

    if (direction === 'left') {
      return 'opacity-0 translate-x-7 scale-[0.98]';
    }

    if (direction === 'right') {
      return 'opacity-0 -translate-x-7 scale-[0.98]';
    }

    // Default vertical animation:
    // When element is below viewport: primed to rise up when entering from bottom
    // When element is above viewport: primed to glide down when scrolling back up from bottom
    if (state === 'below') {
      return 'opacity-0 translate-y-7 scale-[0.98]';
    } else {
      return 'opacity-0 -translate-y-7 scale-[0.98]';
    }
  };

  return (
    <div
      ref={elementRef}
      className={`transition-all ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity] ${getTransformClasses()} ${className}`}
      style={{
        transitionDuration: `${durationMs}ms`,
        transitionDelay: state === 'in-view' ? `${delayMs}ms` : '0ms',
      }}
    >
      {children}
    </div>
  );
}
