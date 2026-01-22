/**
 * Rotating Prompts Hook
 *
 * 프롬프트 자동 회전
 */

import { useState, useEffect } from 'react';

export function useRotatingPrompts(prompts: string[], interval = 4200) {
  const [currentPrompt, setCurrentPrompt] = useState(prompts[0] || '');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
    }, interval);

    return () => clearInterval(timer);
  }, [prompts, interval]);

  return currentPrompt;
}
