// src/hooks/calendar/useParticleAnimation.ts
import { useEffect, RefObject } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  update: () => void;
  draw: () => void;
}

interface UseParticleAnimationOptions {
  enabled: boolean;
  particleCount?: number;
  maxLinkDistance?: number;
  baseSpeed?: number;
  particleColor?: string;
}

/**
 * Hook for particle animation background effect
 */
export function useParticleAnimation(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: UseParticleAnimationOptions
) {
  const {
    enabled,
    particleCount = 60,
    maxLinkDistance = 120,
    baseSpeed = 0.25,
    particleColor = '#63d2ff',
  } = options;

  useEffect(() => {
    if (!enabled) {return;}

    const canvasRaw = canvasRef.current;
    if (!canvasRaw) {return;}

    const ctxRaw = canvasRaw.getContext('2d');
    if (!ctxRaw) {return;}

    // Non-null after checks - used in closures below
    const canvas = canvasRaw;
    const ctx = ctxRaw;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particlesArray: Particle[] = [];
    let raf = 0;

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

    // Debounce resize for better performance
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        init();
      }, 200);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('resize', handleResize);

    class ParticleImpl implements Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() * 2 - 1) * baseSpeed;
        this.speedY = (Math.random() * 2 - 1) * baseSpeed;
        this.color = particleColor;
      }

      update() {
        if (this.x > canvas.width || this.x < 0) {this.speedX = -this.speedX;}
        if (this.y > canvas.height || this.y < 0) {this.speedY = -this.speedY;}
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
            this.x -= forceDirectionX * force * 2;
            this.y -= forceDirectionY * force * 2;
          }
        }
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function init() {
      particlesArray = [];
      let numberOfParticles = (canvas.height * canvas.width) / 18000;
      numberOfParticles = Math.min(numberOfParticles, particleCount);
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new ParticleImpl());
      }
    }

    // Spatial grid for O(n) collision detection instead of O(n²)
    class SpatialGrid {
      private cellSize: number;
      private grid: Map<string, Particle[]>;

      constructor(cellSize: number) {
        this.cellSize = cellSize;
        this.grid = new Map();
      }

      clear() {
        this.grid.clear();
      }

      private getKey(x: number, y: number): string {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
      }

      insert(particle: Particle) {
        const key = this.getKey(particle.x, particle.y);
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(particle);
      }

      getNearby(x: number, y: number): Particle[] {
        const nearby: Particle[] = [];
        // Check current cell and 8 neighboring cells
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const checkX = x + dx * this.cellSize;
            const checkY = y + dy * this.cellSize;
            const key = this.getKey(checkX, checkY);
            const cellParticles = this.grid.get(key);
            if (cellParticles) {
              nearby.push(...cellParticles);
            }
          }
        }
        return nearby;
      }
    }

    const spatialGrid = new SpatialGrid(maxLinkDistance);

    function connectParticles() {
      // Rebuild spatial grid
      spatialGrid.clear();
      particlesArray.forEach(p => spatialGrid.insert(p));

      // Only check nearby particles instead of all pairs
      const checked = new Set<string>();
      for (let a = 0; a < particlesArray.length; a++) {
        const particleA = particlesArray[a];
        const nearby = spatialGrid.getNearby(particleA.x, particleA.y);

        for (const particleB of nearby) {
          if (particleA === particleB) {continue;}

          // Avoid checking same pair twice
          const pairKey = `${Math.min(particleA.x, particleB.x)},${Math.min(particleA.y, particleB.y)}`;
          if (checked.has(pairKey)) {continue;}
          checked.add(pairKey);

          const dx = particleA.x - particleB.x;
          const dy = particleA.y - particleB.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxLinkDistance) {
            const opacity = 1 - distance / maxLinkDistance;
            ctx.strokeStyle = `rgba(99, 210, 255, ${opacity * 0.4})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particleA.x, particleA.y);
            ctx.lineTo(particleB.x, particleB.y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach((p) => {
        p.update();
        p.draw();
      });
      connectParticles();
      raf = requestAnimationFrame(animate);
    }

    init();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
    };
  }, [enabled, canvasRef, particleCount, maxLinkDistance, baseSpeed, particleColor]);
}
