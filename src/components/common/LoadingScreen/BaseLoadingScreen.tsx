"use client";

/**
 * Base Loading Screen Component
 * Consolidates duplicate loading screen patterns across 4+ files
 *
 * Provides reusable components for:
 * - Particle/star background animation
 * - Orbital animation structure
 * - Loading steps display
 */

import { memo, type ReactNode, useEffect, useMemo, useState } from 'react';
import styles from './LoadingScreen.module.css';

// ============ Types ============

export interface LoadingStep {
  text: string;
  icon?: string;
}

export interface OrbitItem {
  icon: string;
  label?: string;
}

export interface LoadingScreenProps {
  title: string;
  subtitle?: string;
  steps?: LoadingStep[];
  orbitItems?: OrbitItem[];
  centerIcon?: string;
  particleCount?: number;
  className?: string;
  children?: ReactNode;
}

// ============ Particle Background ============

interface ParticleBackgroundProps {
  count?: number;
  className?: string;
}

export const ParticleBackground = memo(function ParticleBackground({
  count = 30,
  className = '',
}: ParticleBackgroundProps) {
  const particles = useMemo(() => {
    return [...Array(count)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`,
      size: `${Math.random() * 3 + 1}px`,
    }));
  }, [count]);

  return (
    <div className={`${styles.particles} ${className}`} aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className={styles.particle}
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.animationDelay,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
});

// ============ Orbital Animation ============

interface OrbitAnimationProps {
  centerIcon?: string;
  orbitItems?: OrbitItem[];
  className?: string;
}

export const OrbitAnimation = memo(function OrbitAnimation({
  centerIcon = '🌌',
  orbitItems = [],
  className = '',
}: OrbitAnimationProps) {
  return (
    <div className={`${styles.loadingOrbit} ${className}`}>
      <div className={styles.orbitCenter}>{centerIcon}</div>
      {orbitItems.length > 0 && (
        <div className={styles.orbitRing}>
          {orbitItems.slice(0, 8).map((item, i) => (
            <span
              key={i}
              className={styles.orbitIcon}
              style={{ '--orbit-delay': `${i * 0.5}s` } as React.CSSProperties}
              title={item.label}
            >
              {item.icon}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// ============ Loading Steps ============

interface LoadingStepsProps {
  steps: LoadingStep[];
  className?: string;
  /** 진행 단계 시간 분배 (초). 미지정 시 단계당 8초. */
  stepDurationSec?: number;
}

export const LoadingSteps = memo(function LoadingSteps({
  steps,
  className = '',
  stepDurationSec = 8,
}: LoadingStepsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!steps || steps.length === 0) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, stepDurationSec * 1000);
    return () => window.clearInterval(timer);
  }, [steps, stepDurationSec]);

  if (!steps || steps.length === 0) return null;

  return (
    <div className={`${styles.loadingSteps} ${className}`}>
      {steps.map((step, i) => {
        const isCompleted = i < activeIndex;
        const isActive = i === activeIndex;
        const isFuture = i > activeIndex;
        return (
          <span
            key={i}
            className={styles.loadingStep}
            style={{
              opacity: isFuture ? 0.35 : 1,
              fontWeight: isActive ? 600 : 400,
              color: isCompleted
                ? 'rgba(125, 211, 252, 0.95)'
                : isActive
                  ? 'rgba(255, 255, 255, 0.98)'
                  : undefined,
              transition: 'opacity 0.4s ease, color 0.4s ease',
            }}
          >
            {isCompleted ? (
              <span className={styles.stepIcon} aria-hidden>
                ✓
              </span>
            ) : (
              step.icon && <span className={styles.stepIcon}>{step.icon}</span>
            )}
            {step.text}
          </span>
        );
      })}
    </div>
  );
});

// ============ Main Loading Screen ============

/**
 * Complete loading screen with all animation components
 *
 * @example
 * <BaseLoadingScreen
 *   title="운명 매트릭스 분석 중..."
 *   steps={[
 *     { text: '동양 사주 데이터 처리', icon: '☯' },
 *     { text: '서양 점성술 매핑', icon: '🌟' },
 *   ]}
 *   orbitItems={[
 *     { icon: '☀️', label: 'Sun' },
 *     { icon: '🌙', label: 'Moon' },
 *   ]}
 *   centerIcon="🌌"
 * />
 */
export const BaseLoadingScreen = memo(function BaseLoadingScreen({
  title,
  subtitle,
  steps = [],
  orbitItems = [],
  centerIcon = '🌌',
  particleCount = 30,
  className = '',
  children,
}: LoadingScreenProps) {
  return (
    <div className={`${styles.loadingScreen} ${className}`}>
      <ParticleBackground count={particleCount} />

      <div className={styles.loadingContent}>
        <OrbitAnimation
          centerIcon={centerIcon}
          orbitItems={orbitItems}
        />

        <h2 className={styles.loadingTitle}>{title}</h2>

        {subtitle && (
          <p className={styles.loadingSubtitle}>{subtitle}</p>
        )}

        <LoadingSteps steps={steps} />

        {children}
      </div>
    </div>
  );
});

// ============ Pre-configured Loading Screens ============

/**
 * Destiny Matrix loading screen
 */
export const DestinyMatrixLoading = memo(function DestinyMatrixLoading() {
  return (
    <BaseLoadingScreen
      title="운명 매트릭스 분석 중..."
      steps={[
        { text: '동양 사주 데이터 처리', icon: '☯' },
        { text: '서양 점성술 매핑', icon: '🌟' },
        { text: '통합 분석 생성', icon: '✨' },
      ]}
      orbitItems={[
        { icon: '☀️', label: 'Sun' },
        { icon: '🌙', label: 'Moon' },
        { icon: '⭐', label: 'Stars' },
        { icon: '🔮', label: 'Crystal' },
        { icon: '☯', label: 'Yin-Yang' },
        { icon: '🌌', label: 'Galaxy' },
      ]}
      centerIcon="🌌"
    />
  );
});

/**
 * Counselor loading screen
 */
export const CounselorLoading = memo(function CounselorLoading() {
  return (
    <BaseLoadingScreen
      title="상담사 분석 준비 중..."
      steps={[
        { text: '사주 정보 로딩', icon: '📊' },
        { text: '점성술 차트 계산', icon: '🌠' },
        { text: '상담 컨텍스트 구성', icon: '💭' },
      ]}
      orbitItems={[
        { icon: '🎭', label: 'Persona' },
        { icon: '💫', label: 'Insight' },
        { icon: '🔮', label: 'Vision' },
        { icon: '📚', label: 'Knowledge' },
      ]}
      centerIcon="🔮"
    />
  );
});

/**
 * ICP Result loading screen
 */
export const ICPResultLoading = memo(function ICPResultLoading() {
  return (
    <BaseLoadingScreen
      title="이상형 분석 중..."
      steps={[
        { text: '성격 패턴 분석', icon: '🎯' },
        { text: '궁합 요소 계산', icon: '💕' },
      ]}
      orbitItems={[
        { icon: '❤️', label: 'Love' },
        { icon: '🌹', label: 'Romance' },
        { icon: '💑', label: 'Couple' },
        { icon: '✨', label: 'Match' },
      ]}
      centerIcon="💖"
    />
  );
});

export default BaseLoadingScreen;
