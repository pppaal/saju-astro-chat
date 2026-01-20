import { useState, useEffect } from 'react';

export function useTypingAnimation(texts: string[], initialDelay = 1000) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (texts.length === 0) return;

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
          timeoutId = setTimeout(type, 30);
        }
      } else {
        setDisplayText(currentText.substring(0, charIndex + 1));
        charIndex++;

        if (charIndex === currentText.length) {
          isDeleting = true;
          timeoutId = setTimeout(type, 2000);
        } else {
          timeoutId = setTimeout(type, 80);
        }
      }
    };

    timeoutId = setTimeout(type, initialDelay);

    return () => clearTimeout(timeoutId);
  }, [texts, initialDelay]);

  return displayText;
}
