/**
 * 타이핑 애니메이션 훅
 * 플레이스홀더 텍스트가 타자기처럼 한 글자씩 나타남
 */

import { useState, useReducer, useEffect, useCallback, useRef } from 'react';

interface UseTypingAnimationOptions {
  /** 타이핑 속도 (ms) */
  typingSpeed?: number;
  /** 삭제 속도 (ms) */
  deletingSpeed?: number;
  /** 텍스트 완성 후 대기 시간 (ms) */
  pauseDuration?: number;
  /** 삭제 후 대기 시간 (ms) */
  pauseAfterDelete?: number;
}

// 상태 머신 타입 정의
type TypingPhase = 'typing' | 'pauseAfterType' | 'deleting' | 'pauseAfterDelete';

interface TypingState {
  displayText: string;
  currentIndex: number;
  phase: TypingPhase;
}

type TypingAction =
  | { type: 'TYPE_CHAR'; text: string }
  | { type: 'DELETE_CHAR' }
  | { type: 'START_PAUSE_AFTER_TYPE' }
  | { type: 'START_DELETING' }
  | { type: 'START_PAUSE_AFTER_DELETE' }
  | { type: 'NEXT_TEXT'; textsLength: number }
  | { type: 'RESET' };

function typingReducer(state: TypingState, action: TypingAction): TypingState {
  switch (action.type) {
    case 'TYPE_CHAR':
      return { ...state, displayText: action.text };
    case 'DELETE_CHAR':
      return { ...state, displayText: state.displayText.slice(0, -1) };
    case 'START_PAUSE_AFTER_TYPE':
      return { ...state, phase: 'pauseAfterType' };
    case 'START_DELETING':
      return { ...state, phase: 'deleting' };
    case 'START_PAUSE_AFTER_DELETE':
      return { ...state, phase: 'pauseAfterDelete' };
    case 'NEXT_TEXT':
      return {
        ...state,
        currentIndex: (state.currentIndex + 1) % action.textsLength,
        phase: 'typing',
      };
    case 'RESET':
      return { displayText: '', currentIndex: 0, phase: 'typing' };
    default:
      return state;
  }
}

/**
 * 여러 텍스트를 순환하며 타이핑 애니메이션을 수행하는 훅
 */
export function useTypingAnimation(
  texts: string[],
  options: UseTypingAnimationOptions = {}
) {
  const {
    typingSpeed = 80,
    deletingSpeed = 40,
    pauseDuration = 2000,
    pauseAfterDelete = 500,
  } = options;

  const [state, dispatch] = useReducer(typingReducer, {
    displayText: '',
    currentIndex: 0,
    phase: 'typing',
  });

  // options를 ref로 관리하여 의존성 배열 최소화
  const optionsRef = useRef({ typingSpeed, deletingSpeed, pauseDuration, pauseAfterDelete });
  optionsRef.current = { typingSpeed, deletingSpeed, pauseDuration, pauseAfterDelete };

  useEffect(() => {
    if (texts.length === 0) return;

    const { typingSpeed, deletingSpeed, pauseDuration, pauseAfterDelete } = optionsRef.current;
    const currentText = texts[state.currentIndex];
    let delay: number;

    switch (state.phase) {
      case 'typing':
        if (state.displayText.length < currentText.length) {
          delay = typingSpeed;
        } else {
          dispatch({ type: 'START_PAUSE_AFTER_TYPE' });
          return;
        }
        break;
      case 'pauseAfterType':
        delay = pauseDuration;
        break;
      case 'deleting':
        if (state.displayText.length > 0) {
          delay = deletingSpeed;
        } else {
          dispatch({ type: 'START_PAUSE_AFTER_DELETE' });
          return;
        }
        break;
      case 'pauseAfterDelete':
        delay = pauseAfterDelete;
        break;
    }

    const timeout = setTimeout(() => {
      switch (state.phase) {
        case 'typing':
          dispatch({ type: 'TYPE_CHAR', text: currentText.slice(0, state.displayText.length + 1) });
          break;
        case 'pauseAfterType':
          dispatch({ type: 'START_DELETING' });
          break;
        case 'deleting':
          dispatch({ type: 'DELETE_CHAR' });
          break;
        case 'pauseAfterDelete':
          dispatch({ type: 'NEXT_TEXT', textsLength: texts.length });
          break;
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [state, texts]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    displayText: state.displayText,
    currentIndex: state.currentIndex,
    isDeleting: state.phase === 'deleting',
    isPaused: state.phase === 'pauseAfterType' || state.phase === 'pauseAfterDelete',
    reset,
  };
}

/**
 * 단일 텍스트 타이핑 애니메이션 (삭제 없음)
 */
export function useSingleTypingAnimation(
  text: string,
  options: { typingSpeed?: number; startDelay?: number } = {}
) {
  const { typingSpeed = 80, startDelay = 0 } = options;

  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted) {
      const startTimeout = setTimeout(() => {
        setHasStarted(true);
      }, startDelay);
      return () => clearTimeout(startTimeout);
    }

    if (displayText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, displayText.length + 1));
      }, typingSpeed);
      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
    }
  }, [displayText, text, typingSpeed, hasStarted, startDelay]);

  const reset = useCallback(() => {
    setDisplayText('');
    setIsComplete(false);
    setHasStarted(false);
  }, []);

  return {
    displayText,
    isComplete,
    reset,
  };
}

export default useTypingAnimation;
