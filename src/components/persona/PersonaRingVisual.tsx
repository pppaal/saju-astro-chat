'use client';
import { useEffect, useRef } from 'react';

export default function PersonaRingVisual({ colors }: { colors: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.setProperty('--persona-c1', colors[0] || 'hsl(220, 90%, 65%)');
      ref.current.style.setProperty('--persona-c2', colors[1] || 'hsl(300, 90%, 65%)');
      ref.current.style.setProperty('--persona-c3', colors[2] || 'hsl(180, 90%, 65%)');
    }
  }, [colors]);

  return (
    <div ref={ref} className="fixed inset-0 -z-10 w-full h-full overflow-hidden">
      <div className="persona-container">
        <div className="persona-ring persona-c1" />
        <div className="persona-ring persona-c2" />
        <div className="persona-ring persona-c3" />
      </div>
      <div className="absolute inset-0 bg-gray-900/50" />
    </div>
  );
}