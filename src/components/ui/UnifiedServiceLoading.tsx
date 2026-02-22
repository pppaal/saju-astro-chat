'use client'

import { useEffect, useMemo, useState } from 'react'
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

const AI_REPORT_ESTIMATED_SECONDS = 45
const AI_REPORT_MAX_SECONDS = 120
const AI_REPORT_BAR_COUNT = 52

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

function AiReportBarcodeProgress({ locale }: { locale: Locale }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => Math.min(prev + 1, AI_REPORT_MAX_SECONDS))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const progressPercent = Math.min(
    96,
    Math.max(6, Math.round((elapsedSeconds / AI_REPORT_ESTIMATED_SECONDS) * 100))
  )

  const bars = useMemo(
    () =>
      Array.from({ length: AI_REPORT_BAR_COUNT }, (_, index) => {
        const normalized = ((index * 17 + 13) % 37) / 36
        return Math.round(28 + normalized * 64)
      }),
    []
  )

  const remaining = Math.max(AI_REPORT_ESTIMATED_SECONDS - elapsedSeconds, 0)
  const metaText =
    locale === 'ko'
      ? `예상 ${AI_REPORT_ESTIMATED_SECONDS}초 내외, 남은 시간 약 ${remaining}초`
      : `Expected around ${AI_REPORT_ESTIMATED_SECONDS}s, about ${remaining}s remaining`
  const elapsedText = locale === 'ko' ? `${elapsedSeconds}초 경과` : `${elapsedSeconds}s elapsed`
  const percentText =
    locale === 'ko' ? `진행률 ${progressPercent}%` : `Progress ${progressPercent}%`
  const statusText =
    elapsedSeconds <= AI_REPORT_ESTIMATED_SECONDS
      ? locale === 'ko'
        ? '근거를 교차 검증하며 최종 문장을 구성하고 있습니다.'
        : 'Cross-validating evidence and composing final narrative.'
      : locale === 'ko'
        ? '마무리 단계입니다. 곧 결과 페이지로 전환됩니다.'
        : 'Finalizing now. You will be redirected shortly.'

  return (
    <div className="mt-3 w-full max-w-lg rounded-2xl border border-cyan-300/25 bg-slate-950/55 p-3 backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between text-[11px] text-cyan-100/85">
        <span>{metaText}</span>
        <span className="font-semibold">
          {elapsedText} · {percentText}
        </span>
      </div>

      <div className="relative h-16 overflow-hidden rounded-lg border border-cyan-300/25 bg-slate-950/80">
        <div
          className="absolute inset-y-0 left-0 bg-cyan-400/12 transition-all duration-700"
          style={{ width: `${progressPercent}%` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 flex items-end gap-[2px] px-2 py-2">
          {bars.map((height, index) => {
            const threshold = Math.round(((index + 1) / AI_REPORT_BAR_COUNT) * 100)
            const active = progressPercent >= threshold
            return (
              <span
                key={`barcode-${index}`}
                className="w-[2px] rounded-sm transition-opacity duration-500"
                style={{
                  height: `${height}%`,
                  opacity: active ? 0.95 : 0.28,
                  background: active
                    ? 'linear-gradient(to top, rgba(103,232,249,0.7), rgba(147,197,253,0.95))'
                    : 'rgba(103,232,249,0.35)',
                }}
              />
            )
          })}
        </div>
        <div className="barcodeSweep" aria-hidden="true" />
      </div>

      <p className="mt-2 text-[11px] text-slate-300">{statusText}</p>

      <style jsx>{`
        .barcodeSweep {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.2) 45%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: translateX(-120%);
          animation: barcodeSweep 1.8s linear infinite;
        }

        @keyframes barcodeSweep {
          from {
            transform: translateX(-120%);
          }
          to {
            transform: translateX(120%);
          }
        }
      `}</style>
    </div>
  )
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
    >
      {kind === 'aiReport' && <AiReportBarcodeProgress locale={locale} />}
    </BaseLoadingScreen>
  )
}
