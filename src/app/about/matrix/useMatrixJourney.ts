'use client';

import { useState, useRef } from 'react';
import { logger } from '@/lib/logger';
import { LAYERS, LEVEL_INFO } from './constants';
import type { MatrixResult, PersonalInsight } from './constants';

export type Step = 'intro' | 'input' | 'loading' | 'result';

export function useMatrixJourney() {
  const [step, setStep] = useState<Step>('intro');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [dayMaster, setDayMaster] = useState<string>('');
  const [geokguk, setGeokguk] = useState<string>('');
  const [result, setResult] = useState<MatrixResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [revealedLayers, setRevealedLayers] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const totalCells = LAYERS.reduce((sum, l) => sum + l.cells, 0);
  const activeLayer = LAYERS[activeIndex];

  const getScoreLevel = (score: number): keyof typeof LEVEL_INFO => {
    if (score >= 9) { return 'extreme'; }
    if (score >= 7) { return 'amplify'; }
    if (score >= 5) { return 'balance'; }
    if (score >= 3) { return 'clash'; }
    return 'conflict';
  };

  const getLayerInsight = (layerNum: number): PersonalInsight | null => {
    if (!result) { return null; }

    const strengthsInLayer = result.highlights.strengths?.filter(s => s.layer === layerNum) || [];
    const cautionsInLayer = result.highlights.cautions?.filter(c => c.layer === layerNum) || [];

    const avgScore = [...strengthsInLayer, ...cautionsInLayer].reduce((sum, h) => sum + h.score, 0) /
      Math.max([...strengthsInLayer, ...cautionsInLayer].length, 1) || 5;

    return {
      layer: layerNum,
      matchedCells: Math.floor(Math.random() * LAYERS[layerNum - 1].cells * 0.4) + 1,
      score: Math.round(avgScore * 10) / 10,
      level: getScoreLevel(avgScore),
      highlights: [
        ...strengthsInLayer.map(s => `✦ ${s.keyword}`),
        ...cautionsInLayer.map(c => `⚠ ${c.keyword}`),
      ],
    };
  };

  const handleSubmit = async () => {
    if (!dayMaster) { return; }

    setStep('loading');

    try {
      const res = await fetch('/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayMasterElement: dayMaster,
          geokguk: geokguk || undefined,
          lang: 'ko',
        }),
      });

      const data = await res.json();
      setResult(data);

      // Reveal layers one by one with animation
      setTimeout(() => {
        setStep('result');
        LAYERS.forEach((_, i) => {
          setTimeout(() => {
            setRevealedLayers(prev => new Set([...prev, i]));
          }, i * 200);
        });
      }, 1500);

    } catch (error) {
      logger.error('Matrix calculation failed:', error);
      setStep('input');
    }
  };

  const goToLayer = (index: number) => {
    if (index >= 0 && index < LAYERS.length) {
      setIsFlipped(false);
      setTimeout(() => setActiveIndex(index), 150);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) { return; }
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && activeIndex < LAYERS.length - 1) {
        goToLayer(activeIndex + 1);
      } else if (diff < 0 && activeIndex > 0) {
        goToLayer(activeIndex - 1);
      }
    }
    setTouchStart(null);
  };

  const insight = getLayerInsight(activeLayer.layer);

  return {
    // State
    step,
    setStep,
    birthDate,
    setBirthDate,
    birthTime,
    setBirthTime,
    dayMaster,
    setDayMaster,
    geokguk,
    setGeokguk,
    result,
    activeIndex,
    isFlipped,
    setIsFlipped,
    revealedLayers,
    containerRef,

    // Computed
    totalCells,
    activeLayer,
    insight,

    // Handlers
    handleSubmit,
    goToLayer,
    handleTouchStart,
    handleTouchEnd,
  };
}
