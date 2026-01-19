import { useEffect, RefObject } from 'react';

export function useCanvasAnimation(canvasRef: RefObject<HTMLCanvasElement>) {
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
    const frameInterval = 1000 / 30;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const drawFrame = () => {
      const width = canvas.width;
      const height = canvas.height;
      const starCount = width < 640 ? 50 : width < 1024 ? 65 : 80;

      // Deep blue/indigo gradient for dream theme
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(10, 8, 24, 1)');
      gradient.addColorStop(0.5, 'rgba(20, 15, 45, 1)');
      gradient.addColorStop(1, 'rgba(8, 12, 30, 1)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Stars with cyan/pink dream colors
      for (let i = 0; i < starCount; i++) {
        const x = (Math.sin(time * 0.3 + i * 1.5) * 0.5 + 0.5) * width;
        const y = (Math.cos(time * 0.2 + i * 0.9) * 0.5 + 0.5) * height;
        const opacity = 0.15 + Math.sin(time * 2 + i) * 0.1;
        const hue = 180 + Math.sin(time + i) * 30; // Cyan to pink range

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 70%, 80%, ${opacity})`;
        ctx.fill();
      }

      // Moon glow effect
      const moonX = width * 0.8;
      const moonY = height * 0.2;
      const moonRadius = 60 + Math.sin(time) * 10;

      const moonGradient = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius * 2);
      moonGradient.addColorStop(0, 'rgba(168, 237, 234, 0.15)');
      moonGradient.addColorStop(0.5, 'rgba(168, 237, 234, 0.05)');
      moonGradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = moonGradient;
      ctx.fill();
    };

    const animate = (timestamp = 0) => {
      if (!isRunning) return;
      if (timestamp - lastFrame >= frameInterval) {
        lastFrame = timestamp;
        time += 0.002;
        drawFrame();
      }
      animationId = requestAnimationFrame(animate);
    };

    const stop = () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      isRunning = false;
    };

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

    const handleVisibility = () => {
      if (mediaQuery.matches || document.hidden) {
        stop();
        drawFrame();
        return;
      }
      start();
    };

    const handleResize = () => {
      resizeCanvas();
      if (!isRunning) {
        drawFrame();
      }
    };

    resizeCanvas();
    handleVisibility();

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    mediaQuery.addEventListener('change', handleVisibility);

    return () => {
      stop();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      mediaQuery.removeEventListener('change', handleVisibility);
    };
  }, [canvasRef]);
}
