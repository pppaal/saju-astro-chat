'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { logger } from "@/lib/logger";
import { LAYERS, getScoreLevel } from './matrixData';
import type { MatrixResult, PersonalInsight } from './matrixData';
import { MatrixIntroScreen } from './MatrixIntroScreen';
import { MatrixLoadingScreen } from './MatrixLoadingScreen';
import { MatrixResultView } from './MatrixResultView';

export default function MatrixJourneyPage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const [step, setStep] = useState<'intro' | 'loading' | 'result'>('intro');
  const [result, setResult] = useState<MatrixResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [revealedLayers, setRevealedLayers] = useState<Set<number>>(new Set());
  const _containerRef = useRef<HTMLDivElement>(null);

  const hasProfile = !!(profile.birthDate);
  const profileName = profile.name || '사용자';
  const activeLayer = LAYERS[activeIndex];

  const getLayerInsight = (layerNum: number): PersonalInsight | null => {
    if (!result || !result.highlights) return null;

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

  const handleStartAnalysis = async () => {
    if (!hasProfile) {
      router.push('/destiny-map');
      return;
    }

    setStep('loading');

    try {
      const res = await fetch('/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: profile.birthDate,
          birthTime: profile.birthTime || '12:00',
          birthCity: profile.birthCity,
          timezone: profile.timezone || 'Asia/Seoul',
          gender: profile.gender === 'Male' ? 'male' : profile.gender === 'Female' ? 'female' : 'male',
          lang: 'ko',
        }),
      });

      const data = await res.json();
      setResult(data);

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
      setStep('intro');
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
    if (touchStart === null) return;
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

  if (step === 'intro') {
    return (
      <MatrixIntroScreen
        hasProfile={hasProfile}
        profileName={profileName}
        profileBirthDate={profile.birthDate}
        profileLoading={profileLoading}
        onStart={handleStartAnalysis}
      />
    );
  }

  if (step === 'loading') {
    return <MatrixLoadingScreen />;
  }

  return (
    <MatrixResultView
      result={result}
      activeIndex={activeIndex}
      isFlipped={isFlipped}
      revealedLayers={revealedLayers}
      insight={insight}
      activeLayer={activeLayer}
      onGoToLayer={goToLayer}
      onFlip={() => setIsFlipped(!isFlipped)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onBack={() => setStep('intro')}
    />
  );
}
