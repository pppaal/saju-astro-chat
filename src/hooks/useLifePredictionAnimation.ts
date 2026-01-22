/**
 * useLifePredictionAnimation Hook
 *
 * Manages the background canvas animation for the life prediction page.
 * Features animated stars and orbs with performance optimizations.
 */

'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook to manage background canvas animation
 *
 * @returns Canvas ref to attach to canvas element
 *
 * @example
 * ```tsx
 * const canvasRef = useLifePredictionAnimation();
 * return <canvas ref={canvasRef} className={styles.backgroundCanvas} />;
 * ```
 */
export function useLifePredictionAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationId: number | null = null;
    let time = 0;
    let isRunning = false;
    let lastFrame = 0;
    const frameInterval = 1000 / 30; // 30 FPS

    /**
     * Resize canvas to match window size
     */
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    /**
     * Draw a single animation frame
     */
    const drawFrame = () => {
      const width = canvas.width;
      const height = canvas.height;
      const starCount = width < 640 ? 30 : width < 1024 ? 40 : 50;
      const orbCount = width < 640 ? 3 : 5;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(10, 15, 30, 1)');
      gradient.addColorStop(0.5, 'rgba(20, 25, 50, 1)');
      gradient.addColorStop(1, 'rgba(15, 20, 40, 1)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Animated stars
      for (let i = 0; i < starCount; i++) {
        const x = (Math.sin(time * 0.5 + i * 1.3) * 0.5 + 0.5) * width;
        const y = (Math.cos(time * 0.3 + i * 0.7) * 0.5 + 0.5) * height;
        const opacity = 0.1 + Math.sin(time * 2 + i) * 0.05;

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${opacity})`;
        ctx.fill();
      }

      // Animated orbs (soft glow effect)
      for (let i = 0; i < orbCount; i++) {
        const x = (Math.sin(time + i * 1.2) * 0.3 + 0.5) * width;
        const y = (Math.cos(time * 0.7 + i * 0.8) * 0.3 + 0.5) * height;
        const radius = 100 + Math.sin(time + i) * 50;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${0.02 + Math.sin(time + i) * 0.01})`;
        ctx.fill();
      }
    };

    /**
     * Animation loop with frame rate limiting
     */
    const animate = (timestamp = 0) => {
      if (!isRunning) return;
      if (timestamp - lastFrame >= frameInterval) {
        lastFrame = timestamp;
        time += 0.003;
        drawFrame();
      }
      animationId = requestAnimationFrame(animate);
    };

    /**
     * Stop animation
     */
    const stop = () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      isRunning = false;
    };

    /**
     * Start animation
     */
    const start = () => {
      if (isRunning) return;
      if (mediaQuery.matches || document.hidden) {
        drawFrame();
        return;
      }
      isRunning = true;
      lastFrame = 0;
      animate();
    };

    /**
     * Handle visibility changes (pause when hidden)
     */
    const handleVisibility = () => {
      if (mediaQuery.matches || document.hidden) {
        stop();
        drawFrame();
        return;
      }
      start();
    };

    /**
     * Handle window resize
     */
    const handleResize = () => {
      resizeCanvas();
      if (!isRunning) {
        drawFrame();
      }
    };

    // Initialize
    resizeCanvas();
    handleVisibility();

    // Event listeners
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    mediaQuery.addEventListener('change', handleVisibility);

    // Cleanup
    return () => {
      stop();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      mediaQuery.removeEventListener('change', handleVisibility);
    };
  }, []);

  return canvasRef;
}
