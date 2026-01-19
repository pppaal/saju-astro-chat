import { useRef } from 'react';
import { useCanvasAnimation } from '@/hooks/useCanvasAnimation';
import styles from './DreamBackground.module.css';

export function DreamBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  useCanvasAnimation(canvasRef);

  return <canvas ref={canvasRef} className={styles.backgroundCanvas} />;
}
