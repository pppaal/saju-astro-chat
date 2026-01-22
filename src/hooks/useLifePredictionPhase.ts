/**
 * useLifePredictionPhase Hook
 *
 * Manages phase navigation for the life prediction page.
 * Handles transitions between birth-input, input, analyzing, and result phases.
 */

'use client';

import { useState, useCallback } from 'react';

/**
 * Available phases in the life prediction flow
 */
export type Phase = 'birth-input' | 'input' | 'analyzing' | 'result';

/**
 * Return type for useLifePredictionPhase hook
 */
export interface UseLifePredictionPhaseReturn {
  /** Current phase */
  phase: Phase;
  /** Set phase directly */
  setPhase: (phase: Phase) => void;
  /** Navigate to input phase and reset state */
  handleAskAgain: () => void;
  /** Navigate back to birth input phase */
  handleChangeBirthInfo: () => void;
}

/**
 * Hook to manage phase navigation in life prediction flow
 *
 * @param initialPhase - Initial phase (default: 'birth-input')
 * @param onAskAgain - Callback when user asks another question
 * @param onChangeBirthInfo - Callback when user changes birth info
 * @returns Phase state and navigation handlers
 *
 * @example
 * ```tsx
 * const { phase, setPhase, handleAskAgain, handleChangeBirthInfo } =
 *   useLifePredictionPhase('birth-input', resetResults, resetProfile);
 * ```
 */
export function useLifePredictionPhase(
  initialPhase: Phase = 'birth-input',
  onAskAgain?: () => void,
  onChangeBirthInfo?: () => void
): UseLifePredictionPhaseReturn {
  const [phase, setPhase] = useState<Phase>(initialPhase);

  const handleAskAgain = useCallback(() => {
    setPhase('input');
    onAskAgain?.();
  }, [onAskAgain]);

  const handleChangeBirthInfo = useCallback(() => {
    setPhase('birth-input');
    onChangeBirthInfo?.();
  }, [onChangeBirthInfo]);

  return {
    phase,
    setPhase,
    handleAskAgain,
    handleChangeBirthInfo,
  };
}
