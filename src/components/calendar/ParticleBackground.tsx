"use client";

// src/components/calendar/ParticleBackground.tsx
import React, { useRef } from 'react';
import { useParticleAnimation } from '@/hooks/calendar/useParticleAnimation';
import styles from './DestinyCalendar.module.css';

interface ParticleBackgroundProps {
  enabled: boolean;
}

export default function ParticleBackground({ enabled }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useParticleAnimation(canvasRef, {
    enabled,
    particleCount: 60,
    maxLinkDistance: 120,
    baseSpeed: 0.25,
    particleColor: '#63d2ff',
  });

  if (!enabled) return null;

  return <canvas ref={canvasRef} className={styles.particleCanvas} />;
}
