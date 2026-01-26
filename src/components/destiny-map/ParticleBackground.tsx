'use client';

import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  update: () => void;
  draw: () => void;
};

type ParticleBackgroundProps = {
  className?: string;
};

export default function ParticleBackground({ className }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    let disposed = false;
    let cleanup: (() => void) | null = null;

    const startAnimation = () => {
      if (disposed || !canvas) {return;}

      const ctx = canvas.getContext('2d');
      if (!ctx) {return;}

      // Capture canvas reference for use in class
      const canvasWidth = () => canvas!.width;
      const canvasHeight = () => canvas!.height;

      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const connection = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }).connection;
      const isSlowConnection =
        !!connection?.saveData || connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';

      const shouldReduceMotion = () => mediaQuery.matches || document.hidden || isSlowConnection;
      const PARTICLE_COLOR = '#a78bfa';

      let particlesArray: Particle[] = [];
      let animationId: number | null = null;
      let isRunning = false;
      let lastFrame = 0;
      const frameInterval = 1000 / 30;
      let particleCount = 80;
      let maxLinkDistance = 120;
      let particleBaseSpeed = 0.3;

      const mouse = {
        x: undefined as number | undefined,
        y: undefined as number | undefined,
        radius: 150,
      };

      const handleMouseMove = (e: MouseEvent) => {
        mouse.x = e.x;
        mouse.y = e.y;
      };
      const handleMouseOut = () => {
        mouse.x = undefined;
        mouse.y = undefined;
      };

      const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };

      const updateSettings = () => {
        const width = canvas.width;
        particleCount = width < 640 ? 40 : width < 1024 ? 60 : 80;
        maxLinkDistance = width < 640 ? 90 : 120;
        particleBaseSpeed = width < 640 ? 0.2 : 0.3;
      };

      class ParticleImpl implements Particle {
        x: number;
        y: number;
        size: number;
        speedX: number;
        speedY: number;
        color: string;

        constructor() {
          this.x = Math.random() * canvasWidth();
          this.y = Math.random() * canvasHeight();
          this.size = Math.random() * 2 + 1;
          this.speedX = (Math.random() * 2 - 1) * particleBaseSpeed;
          this.speedY = (Math.random() * 2 - 1) * particleBaseSpeed;
          this.color = PARTICLE_COLOR;
        }

        update() {
          if (this.x > canvasWidth() || this.x < 0) {this.speedX = -this.speedX;}
          if (this.y > canvasHeight() || this.y < 0) {this.speedY = -this.speedY;}

          this.x += this.speedX;
          this.y += this.speedY;

          if (mouse.x !== undefined && mouse.y !== undefined) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius) {
              const forceDirectionX = dx / distance;
              const forceDirectionY = dy / distance;
              const force = (mouse.radius - distance) / mouse.radius;
              const directionX = forceDirectionX * force * 2;
              const directionY = forceDirectionY * force * 2;
              this.x -= directionX;
              this.y -= directionY;
            }
          }
        }

        draw() {
          if (!ctx) {return;}
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const init = () => {
        particlesArray = [];
        updateSettings();
        let numberOfParticles = (canvas.height * canvas.width) / 15000;
        numberOfParticles = Math.min(numberOfParticles, particleCount);
        for (let i = 0; i < numberOfParticles; i++) {
          particlesArray.push(new ParticleImpl());
        }
      };

      const connectParticles = () => {
        if (!ctx) {return;}
        for (let a = 0; a < particlesArray.length; a++) {
          for (let b = a; b < particlesArray.length; b++) {
            const dx = particlesArray[a].x - particlesArray[b].x;
            const dy = particlesArray[a].y - particlesArray[b].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < maxLinkDistance) {
              const opacity = 1 - distance / maxLinkDistance;
              ctx.strokeStyle = `rgba(167, 139, 250, ${opacity * 0.5})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
              ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
              ctx.stroke();
            }
          }
        }
      };

      const drawFrame = (animateFrame: boolean) => {
        if (!ctx) {return;}
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particlesArray.forEach((p) => {
          if (animateFrame) {p.update();}
          p.draw();
        });
        connectParticles();
      };

      const animate = (timestamp = 0) => {
        if (!isRunning) {return;}
        if (timestamp - lastFrame >= frameInterval) {
          lastFrame = timestamp;
          drawFrame(true);
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
        if (isRunning) {return;}
        if (shouldReduceMotion()) {
          drawFrame(false);
          return;
        }
        isRunning = true;
        lastFrame = 0;
        animate();
      };

      const handleVisibility = () => {
        if (shouldReduceMotion()) {
          stop();
          drawFrame(false);
          return;
        }
        start();
      };

      const handleResize = () => {
        resizeCanvas();
        init();
        if (!isRunning) {
          drawFrame(false);
        }
      };

      resizeCanvas();
      init();
      handleVisibility();

      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseout', handleMouseOut);
      window.addEventListener('resize', handleResize);
      document.addEventListener('visibilitychange', handleVisibility);
      mediaQuery.addEventListener('change', handleVisibility);

      cleanup = () => {
        stop();
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseout', handleMouseOut);
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibility);
        mediaQuery.removeEventListener('change', handleVisibility);
      };
    };

    let idleId: number | null = null;
    let timeoutId: number | null = null;
    const requestIdle = (window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    }).requestIdleCallback;
    const cancelIdle = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;

    if (requestIdle) {
      idleId = requestIdle(startAnimation, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(startAnimation, 500);
    }

    return () => {
      disposed = true;
      if (idleId !== null && cancelIdle) {
        cancelIdle(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (cleanup) {cleanup();}
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
