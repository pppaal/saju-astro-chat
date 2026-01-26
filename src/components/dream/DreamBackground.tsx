import { useRef } from 'react';
import { useCanvasAnimation } from '@/hooks/useCanvasAnimation';
import styles from './DreamBackground.module.css';

interface DreamBackgroundProps {
  birthDate?: string;
}

export function DreamBackground({ birthDate }: DreamBackgroundProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  useCanvasAnimation(canvasRef, birthDate);

  return <canvas ref={canvasRef} className={styles.backgroundCanvas} />;
}
