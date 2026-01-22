/**
 * Particle Canvas Animation
 *
 * 배경 파티클 애니메이션 컴포넌트
 */

'use client';

import { useEffect, useRef } from 'react';
import styles from './ParticleCanvas.module.css';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  update(): void;
  draw(): void;
}

const PARTICLE_COUNT = 150;
const MAX_LINK_DISTANCE = 120;
const MOUSE_INTERACTION_RADIUS = 200;
const PARTICLE_BASE_SPEED = 0.5;
const PARTICLE_COLOR = '#88b3f7';

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particlesArray: Particle[] = [];
    let raf = 0;
    let lastFrame = 0;
    const frameInterval = 1000 / 30;

    const mouse = {
      x: undefined as number | undefined,
      y: undefined as number | undefined,
      radius: MOUSE_INTERACTION_RADIUS,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.x;
      mouse.y = e.y;
    };

    const handleMouseOut = () => {
      mouse.x = undefined;
      mouse.y = undefined;
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
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
        this.size = Math.random() * 2.5 + 1;
        this.speedX = (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED;
        this.speedY = (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED;
        this.color = PARTICLE_COLOR;
      }

      update() {
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;

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
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function init() {
      particlesArray = [];
      let numberOfParticles = (canvas.height * canvas.width) / 9000;
      numberOfParticles = Math.min(numberOfParticles, PARTICLE_COUNT);
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new ParticleImpl());
      }
    }

    // Grid-based spatial partitioning for O(n) performance
    const gridCellSize = MAX_LINK_DISTANCE;
    function connectParticles() {
      const grid: Map<string, Particle[]> = new Map();
      for (const p of particlesArray) {
        const cellX = Math.floor(p.x / gridCellSize);
        const cellY = Math.floor(p.y / gridCellSize);
        const key = `${cellX},${cellY}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(p);
      }

      const checked = new Set<string>();
      for (const p of particlesArray) {
        const cellX = Math.floor(p.x / gridCellSize);
        const cellY = Math.floor(p.y / gridCellSize);

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const neighborKey = `${cellX + dx},${cellY + dy}`;
            const neighbors = grid.get(neighborKey);
            if (!neighbors) continue;

            for (const neighbor of neighbors) {
              if (p === neighbor) continue;
              const pairKey =
                p.x < neighbor.x
                  ? `${p.x},${p.y}-${neighbor.x},${neighbor.y}`
                  : `${neighbor.x},${neighbor.y}-${p.x},${p.y}`;
              if (checked.has(pairKey)) continue;
              checked.add(pairKey);

              const distX = p.x - neighbor.x;
              const distY = p.y - neighbor.y;
              const distSq = distX * distX + distY * distY;
              if (distSq < MAX_LINK_DISTANCE * MAX_LINK_DISTANCE) {
                const distance = Math.sqrt(distSq);
                const opacity = 1 - distance / MAX_LINK_DISTANCE;
                ctx.strokeStyle = `rgba(136, 179, 247, ${opacity})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(neighbor.x, neighbor.y);
                ctx.stroke();
              }
            }
          }
        }
      }
    }

    function animate(timestamp = 0) {
      if (timestamp - lastFrame >= frameInterval) {
        lastFrame = timestamp;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particlesArray.forEach(p => {
          p.update();
          p.draw();
        });
        connectParticles();
      }
      raf = requestAnimationFrame(animate);
    }

    init();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.particleCanvas} />;
}
