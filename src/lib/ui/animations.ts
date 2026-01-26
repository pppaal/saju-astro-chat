/**
 * Animation System
 *
 * Centralized animation configuration for consistent UX across the application.
 * Use these constants instead of hardcoded values in CSS/components.
 */

// ============ Duration Constants ============

export const DURATION = {
  /** 150ms - Quick interactions (hover, active states) */
  fast: '150ms',
  fastMs: 150,

  /** 250ms - Standard transitions (most UI changes) */
  medium: '250ms',
  mediumMs: 250,

  /** 400ms - Slower animations (modals, complex transitions) */
  slow: '400ms',
  slowMs: 400,

  /** 500ms - Bounce/spring effects */
  bounce: '500ms',
  bounceMs: 500,
} as const;

// ============ Easing Functions ============

export const EASING = {
  /** Standard easing - most common, smooth acceleration */
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',

  /** Ease out - quick start, slow end (good for exit animations) */
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',

  /** Ease in - slow start, quick end (good for enter animations) */
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',

  /** Ease in-out - symmetric acceleration (good for loops) */
  easeInOut: 'cubic-bezier(0.4, 0, 0.6, 1)',

  /** Bounce/spring effect - overshoot and settle */
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  /** Sharp - instant motion with no easing */
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const;

// ============ Complete Transition Strings ============

/**
 * Ready-to-use transition strings combining duration and easing
 *
 * @example
 * .button {
 *   transition: all ${TRANSITIONS.fast};
 * }
 */
export const TRANSITIONS = {
  /** 150ms standard - Quick interactions */
  fast: `${DURATION.fast} ${EASING.standard}`,

  /** 250ms standard - Most UI changes */
  medium: `${DURATION.medium} ${EASING.standard}`,

  /** 400ms standard - Slower animations */
  slow: `${DURATION.slow} ${EASING.standard}`,

  /** 500ms bounce - Spring effects */
  bounce: `${DURATION.bounce} ${EASING.bounce}`,

  /** 150ms ease-out - Quick exits */
  fastOut: `${DURATION.fast} ${EASING.easeOut}`,

  /** 250ms ease-in - Standard entries */
  mediumIn: `${DURATION.medium} ${EASING.easeIn}`,
} as const;

// ============ CSS Animation Classes ============

/**
 * Common CSS animations as strings
 * Use these in CSS modules or styled-components
 */
export const ANIMATIONS = {
  /** Fade in from opacity 0 to 1 */
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,

  /** Fade out from opacity 1 to 0 */
  fadeOut: `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,

  /** Slide in from top */
  slideInTop: `
    @keyframes slideInTop {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,

  /** Slide in from bottom */
  slideInBottom: `
    @keyframes slideInBottom {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,

  /** Scale in (zoom in) */
  scaleIn: `
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,

  /** Pulse effect */
  pulse: `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.05);
      }
    }
  `,

  /** Spin animation */
  spin: `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,

  /** Shimmer effect for skeletons */
  shimmer: `
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `,

  /** Shake effect (for errors) */
  shake: `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-8px); }
      75% { transform: translateX(8px); }
    }
  `,

  /** Bounce in */
  bounceIn: `
    @keyframes bounceIn {
      0% {
        opacity: 0;
        transform: scale(0.3);
      }
      50% {
        transform: scale(1.05);
      }
      70% {
        transform: scale(0.9);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
} as const;

// ============ Helper Functions ============

/**
 * Get transition with custom property
 *
 * @example
 * getTransition('opacity', 'fast')
 * // Returns: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)'
 */
export function getTransition(
  property: string,
  speed: keyof typeof TRANSITIONS = 'medium'
): string {
  return `${property} ${TRANSITIONS[speed]}`;
}

/**
 * Get multiple transitions
 *
 * @example
 * getTransitions(['opacity', 'transform'], 'fast')
 * // Returns: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms cubic-bezier(0.4, 0, 0.2, 1)'
 */
export function getTransitions(
  properties: string[],
  speed: keyof typeof TRANSITIONS = 'medium'
): string {
  return properties.map(prop => getTransition(prop, speed)).join(', ');
}

/**
 * Delay execution for animation timing
 * Useful for staggered animations
 *
 * @example
 * await delay(DURATION.mediumMs);
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {return false;}
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get duration based on user preference
 * Returns 0ms if user prefers reduced motion
 */
export function getAccessibleDuration(
  duration: keyof typeof DURATION
): number {
  if (prefersReducedMotion()) {return 0;}

  // Map string keys to their Ms counterparts
  const msMap: Record<string, number> = {
    fast: DURATION.fastMs,
    medium: DURATION.mediumMs,
    slow: DURATION.slowMs,
    bounce: DURATION.bounceMs,
    fastMs: DURATION.fastMs,
    mediumMs: DURATION.mediumMs,
    slowMs: DURATION.slowMs,
    bounceMs: DURATION.bounceMs,
  };

  return msMap[duration] || 150;
}

// ============ CSS Variable Exports ============

/**
 * Export as CSS custom properties for use in CSS modules
 *
 * @example
 * // In your CSS:
 * .button {
 *   transition: all var(--transition-fast);
 * }
 */
export const CSS_VARIABLES = `
  :root {
    /* Durations */
    --duration-fast: ${DURATION.fast};
    --duration-medium: ${DURATION.medium};
    --duration-slow: ${DURATION.slow};
    --duration-bounce: ${DURATION.bounce};

    /* Easing */
    --easing-standard: ${EASING.standard};
    --easing-ease-out: ${EASING.easeOut};
    --easing-ease-in: ${EASING.easeIn};
    --easing-bounce: ${EASING.bounce};

    /* Complete transitions */
    --transition-fast: ${TRANSITIONS.fast};
    --transition-medium: ${TRANSITIONS.medium};
    --transition-slow: ${TRANSITIONS.slow};
    --transition-bounce: ${TRANSITIONS.bounce};
  }
`;

// ============ React Hook for Animations ============

/**
 * Hook to safely use animations with reduced motion support
 *
 * @example
 * const { shouldAnimate, duration } = useAnimation('medium');
 *
 * return (
 *   <div style={{ transition: shouldAnimate ? `all ${duration}ms` : 'none' }}>
 *     Content
 *   </div>
 * );
 */
export function useAnimation(speed: keyof typeof TRANSITIONS = 'medium') {
  const shouldAnimate = !prefersReducedMotion();
  const duration = getAccessibleDuration(speed as keyof typeof DURATION);

  return {
    shouldAnimate,
    duration,
    transition: shouldAnimate ? TRANSITIONS[speed] : 'none',
  };
}

// ============ Type Exports ============

export type Duration = keyof typeof DURATION;
export type Easing = keyof typeof EASING;
export type Transition = keyof typeof TRANSITIONS;
export type Animation = keyof typeof ANIMATIONS;
