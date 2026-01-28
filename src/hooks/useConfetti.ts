import { useState, useCallback } from 'react';
import type { ConfettiParticle } from '@/components/shared/ConfettiAnimation';

const DEFAULT_COLORS = ['#a8edea', '#fed6e3', '#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];

export function useConfetti(colors: string[] = DEFAULT_COLORS) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);

  const createConfetti = useCallback(() => {
    const particles: ConfettiParticle[] = Array.from({ length: 150 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      speedY: 2 + Math.random() * 3,
      speedX: (Math.random() - 0.5) * 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    }));

    setConfettiParticles(particles);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  }, [colors]);

  return { showConfetti, confettiParticles, createConfetti };
}
