'use client'

import {
  BaseLoadingScreen,
  type LoadingStep,
  type OrbitItem,
} from '@/components/common/LoadingScreen'

type Locale = 'ko' | 'en'
type LoadingKind = 'calendar' | 'aiReport'

interface UnifiedServiceLoadingProps {
  kind: LoadingKind
  locale?: Locale
  className?: string
}

interface LoadingConfig {
  title: string
  subtitle?: string
  centerIcon: string
  steps: LoadingStep[]
  orbitItems: OrbitItem[]
}

function getCalendarConfig(locale: Locale): LoadingConfig {
  if (locale === 'en') {
    return {
      title: 'Analyzing Your Destiny Calendar...',
      subtitle: 'Cross-verifying Saju and Astrology signals',
      centerIcon: '📅',
      steps: [
        { icon: '📅', text: 'Checking birth information' },
        { icon: '☯', text: 'Calculating Saju timing flow' },
        { icon: '🌟', text: 'Mapping Astrology transits' },
        { icon: '💫', text: 'Synthesizing 365-day fortune score' },
      ],
      orbitItems: [
        { icon: '☀️', label: 'Sun' },
        { icon: '🌙', label: 'Moon' },
        { icon: '🪐', label: 'Transit' },
        { icon: '☯', label: 'Saju' },
        { icon: '📈', label: 'Flow' },
      ],
    }
  }

  return {
    title: '운명 캘린더 분석 중...',
    subtitle: '사주와 점성술 신호를 교차 검증하고 있어요',
    centerIcon: '📅',
    steps: [
      { icon: '📅', text: '생년월일 정보를 확인하는 중' },
      { icon: '☯', text: '사주 타이밍 흐름 계산 중' },
      { icon: '🌟', text: '점성술 트랜싯 매핑 중' },
      { icon: '💫', text: '365일 운세 점수 통합 중' },
    ],
    orbitItems: [
      { icon: '☀️', label: '태양' },
      { icon: '🌙', label: '달' },
      { icon: '🪐', label: '트랜싯' },
      { icon: '☯', label: '사주' },
      { icon: '📈', label: '흐름' },
    ],
  }
}

function getAiReportConfig(locale: Locale): LoadingConfig {
  if (locale === 'en') {
    return {
      title: 'Generating AI Premium Report...',
      subtitle: 'Building a deep, realistic cross-analysis narrative',
      centerIcon: '📜',
      steps: [
        { icon: '🧠', text: 'Composing narrative framework' },
        { icon: '☯', text: 'Injecting Saju evidence' },
        { icon: '🌟', text: 'Injecting Astrology evidence' },
        { icon: '🧩', text: 'Cross-validating and finalizing action plan' },
      ],
      orbitItems: [
        { icon: '📜', label: 'Report' },
        { icon: '🧠', label: 'AI' },
        { icon: '☯', label: 'Saju' },
        { icon: '🌟', label: 'Astrology' },
        { icon: '🎯', label: 'Plan' },
      ],
    }
  }

  return {
    title: 'AI 프리미엄 리포트 생성 중...',
    subtitle: '깊이 있고 현실적인 교차 분석 리포트를 구성하고 있어요',
    centerIcon: '📜',
    steps: [
      { icon: '🧠', text: '리포트 서사 구조를 작성하는 중' },
      { icon: '☯', text: '사주 근거를 반영하는 중' },
      { icon: '🌟', text: '점성 근거를 반영하는 중' },
      { icon: '🧩', text: '교차 검증 후 실행 계획을 완성하는 중' },
    ],
    orbitItems: [
      { icon: '📜', label: '리포트' },
      { icon: '🧠', label: 'AI' },
      { icon: '☯', label: '사주' },
      { icon: '🌟', label: '점성' },
      { icon: '🎯', label: '실행' },
    ],
  }
}

function getConfig(kind: LoadingKind, locale: Locale): LoadingConfig {
  if (kind === 'calendar') {
    return getCalendarConfig(locale)
  }
  return getAiReportConfig(locale)
}

export default function UnifiedServiceLoading({
  kind,
  locale = 'ko',
  className,
}: UnifiedServiceLoadingProps) {
  const config = getConfig(kind, locale)

  return (
    <BaseLoadingScreen
      title={config.title}
      subtitle={config.subtitle}
      steps={config.steps}
      orbitItems={config.orbitItems}
      centerIcon={config.centerIcon}
      className={className}
    />
  )
}
