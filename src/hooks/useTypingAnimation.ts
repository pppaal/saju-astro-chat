import { useState, useEffect } from 'react';
import { ANIMATION_DELAYS } from '@/lib/constants/formulas';

export function useTypingAnimation(texts: string[], initialDelay = ANIMATION_DELAYS.TYPING_START) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (texts.length === 0) {return;}

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
          timeoutId = setTimeout(type, ANIMATION_DELAYS.TYPING_NEXT_WORD);
        } else {
          timeoutId = setTimeout(type, ANIMATION_DELAYS.TYPING_DELETE);
        }
      } else {
        setDisplayText(currentText.substring(0, charIndex + 1));
        charIndex++;

        if (charIndex === currentText.length) {
          isDeleting = true;
          timeoutId = setTimeout(type, ANIMATION_DELAYS.TYPING_PAUSE_END);
        } else {
          timeoutId = setTimeout(type, ANIMATION_DELAYS.TYPING_CHAR);
        }
      }
    };

    timeoutId = setTimeout(type, initialDelay);

    return () => clearTimeout(timeoutId);
  }, [texts, initialDelay]);

  return displayText;
}
