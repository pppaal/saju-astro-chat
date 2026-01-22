/**
 * Typing Animation Hook
 *
 * 타이핑 애니메이션 효과
 */

import { useState, useEffect } from 'react';

export function useTypingAnimation(texts: string[], typingSpeed = 80, deletingSpeed = 30, pauseDuration = 2000) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let currentIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    const type = () => {
      const currentText = texts[currentIndex];

      if (isDeleting) {
        setDisplayText(currentText.substring(0, charIndex - 1));
        charIndex--;

        if (charIndex === 0) {
          isDeleting = false;
          currentIndex = (currentIndex + 1) % texts.length;
          timeoutId = setTimeout(type, 500);
        } else {
          timeoutId = setTimeout(type, deletingSpeed);
        }
      } else {
        setDisplayText(currentText.substring(0, charIndex + 1));
        charIndex++;

        if (charIndex === currentText.length) {
          isDeleting = true;
          timeoutId = setTimeout(type, pauseDuration);
        } else {
          timeoutId = setTimeout(type, typingSpeed);
        }
      }
    };

    timeoutId = setTimeout(type, 1000);

    return () => clearTimeout(timeoutId);
  }, [texts, typingSpeed, deletingSpeed, pauseDuration]);

  return displayText;
}
