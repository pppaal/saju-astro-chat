/**
 * Smooth scroll to a target position
 */
export function smoothScrollTo(targetY: number, duration: number = 600): void {
  const startY = window.scrollY;
  const diff = targetY - startY;
  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (easeInOutCubic)
    const ease = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    window.scrollTo(0, startY + diff * ease);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

/**
 * Scroll to a specific element with smooth animation
 */
export function scrollToElement(element: HTMLElement | null, offset: number = -100, duration: number = 600): void {
  if (!element) {return;}

  const targetY = element.getBoundingClientRect().top + window.scrollY + offset;
  smoothScrollTo(targetY, duration);
}
