// src/components/destiny-map/fun-insights/components/PremiumReportCTA.tsx
// AI Premium Report CTA Component for FunInsights tabs

'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'

export type ReportSection =
  | 'personality'
  | 'love'
  | 'career'
  | 'fortune'
  | 'health'
  | 'karma'
  | 'timing'
  | 'hidden'
  | 'comprehensive'

interface PremiumReportCTAProps {
  section: ReportSection
  /** Matrix data to be used for the AI report */
  matrixData?: Record<string, unknown>
  /** Compact variant for smaller spaces */
  compact?: boolean
  /** Class name for styling */
  className?: string
}

const SECTION_INFO: Record<
  ReportSection,
  { emoji: string; ko: string; en: string; desc: { ko: string; en: string } }
> = {
  personality: {
    emoji: '🌟',
    ko: '성격',
    en: 'Personality',
    desc: {
      ko: 'AI가 당신의 숨겨진 성격과 잠재력을 심층 분석합니다',
      en: 'AI analyzes your hidden personality and potential',
    },
  },
  love: {
    emoji: '💕',
    ko: '연애',
    en: 'Love',
    desc: {
      ko: 'AI가 당신의 연애 스타일과 인연 타이밍을 분석합니다',
      en: 'AI analyzes your love style and relationship timing',
    },
  },
  career: {
    emoji: '💼',
    ko: '커리어',
    en: 'Career',
    desc: {
      ko: 'AI가 당신의 직업 적성과 성공 시기를 분석합니다',
      en: 'AI analyzes your career aptitude and success timing',
    },
  },
  fortune: {
    emoji: '🔮',
    ko: '운세',
    en: 'Fortune',
    desc: {
      ko: 'AI가 당신의 종합 운세와 행운 포인트를 분석합니다',
      en: 'AI analyzes your overall fortune and lucky points',
    },
  },
  health: {
    emoji: '💪',
    ko: '건강',
    en: 'Health',
    desc: {
      ko: 'AI가 당신의 건강 취약점과 치유 방법을 분석합니다',
      en: 'AI analyzes your health vulnerabilities and healing methods',
    },
  },
  karma: {
    emoji: '🌌',
    ko: '카르마',
    en: 'Karma',
    desc: {
      ko: 'AI가 당신의 영혼 패턴과 카르마를 심층 분석합니다',
      en: 'AI analyzes your soul patterns and karma',
    },
  },
  timing: {
    emoji: '⏰',
    ko: '타이밍',
    en: 'Timing',
    desc: {
      ko: 'AI가 당신의 인생 주요 시기를 정밀 분석합니다',
      en: "AI analyzes your life's key timing periods",
    },
  },
  hidden: {
    emoji: '🌑',
    ko: '숨겨진 자아',
    en: 'Hidden Self',
    desc: {
      ko: 'AI가 당신의 무의식과 그림자 자아를 분석합니다',
      en: 'AI analyzes your unconscious and shadow self',
    },
  },
  comprehensive: {
    emoji: '📜',
    ko: '종합 리포트',
    en: 'Full Report',
    desc: {
      ko: 'AI가 모든 영역을 종합 분석하여 심층 리포트를 제공합니다',
      en: 'AI provides a comprehensive analysis across all domains',
    },
  },
}

export default function PremiumReportCTA({
  section,
  matrixData,
  compact = false,
  className = '',
}: PremiumReportCTAProps) {
  const { status } = useSession()
  const { locale } = useI18n()
  const router = useRouter()
  const isKo = locale === 'ko'
  const [isHovered, setIsHovered] = useState(false)
  const premiumDisabledForQa = true

  const info = SECTION_INFO[section] || SECTION_INFO.comprehensive

  const handleClick = useCallback(() => {
    // Store return URL and section preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('checkout_return_url', window.location.pathname)
      localStorage.setItem('ai_report_section', section)
      if (matrixData) {
        localStorage.setItem('ai_report_matrix_data', JSON.stringify(matrixData))
      }
    }

    // If not logged in, redirect to login
    if (status !== 'authenticated') {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname))
      return
    }

    // Navigate to pricing or dedicated AI report page
    router.push('/pricing?feature=ai-report')
  }, [section, matrixData, status, router])

  // Temporarily disabled for QA checks requested by product.
  if (premiumDisabledForQa) {
    return null
  }

  if (compact) {
    return (
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          group relative w-full px-4 py-3 rounded-xl
          bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-indigo-600/20
          border border-violet-500/30 hover:border-violet-400/50
          transition-all duration-300 ease-out
          hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/20
          ${className}
        `}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{info.emoji}</span>
            <span className="text-sm font-medium text-violet-200">
              {isKo ? 'AI 심층 분석' : 'AI Deep Analysis'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-violet-300">
            <span className="text-xs">✦</span>
            <span className="text-sm font-medium">{isKo ? '1 크레딧' : '1 Credit'}</span>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative cursor-pointer overflow-hidden
        rounded-2xl p-6
        bg-gradient-to-br from-violet-900/40 via-purple-900/30 to-indigo-900/40
        border border-violet-500/30 hover:border-violet-400/50
        transition-all duration-500 ease-out
        hover:shadow-xl hover:shadow-violet-500/20
        ${className}
      `}
    >
      {/* Background shimmer effect */}
      <div
        className={`
          absolute inset-0 opacity-0 group-hover:opacity-100
          bg-gradient-to-r from-transparent via-violet-400/10 to-transparent
          transition-opacity duration-700
          ${isHovered ? 'animate-shimmer' : ''}
        `}
        style={{
          backgroundSize: '200% 100%',
          animation: isHovered ? 'shimmer 2s infinite' : 'none',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 border border-violet-400/30">
            <span className="text-2xl">{info.emoji}</span>
          </div>
          <div>
            <h4 className="text-lg font-bold text-violet-100">
              {isKo ? `${info.ko} AI 심층 분석` : `${info.en} AI Deep Analysis`}
            </h4>
            <div className="flex items-center gap-2 text-violet-300/80 text-sm">
              <span className="flex items-center gap-1">
                <span className="text-amber-400">✦</span>
                <span>{isKo ? '1 크레딧' : '1 Credit'}</span>
              </span>
              <span className="text-violet-500">•</span>
              <span>{isKo ? 'AI 생성' : 'AI Generated'}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-violet-200/70 mb-4">{isKo ? info.desc.ko : info.desc.en}</p>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { ko: '개인 맞춤 분석', en: 'Personalized Analysis' },
            { ko: '실천 가이드', en: 'Action Guide' },
            { ko: '상세 인사이트', en: 'Detailed Insights' },
          ].map((feature, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/20"
            >
              {isKo ? feature.ko : feature.en}
            </span>
          ))}
        </div>

        {/* CTA Button */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-violet-300/60">
            {status !== 'authenticated'
              ? isKo
                ? '로그인 후 이용 가능'
                : 'Login required'
              : isKo
                ? '지금 바로 분석받기'
                : 'Get your analysis now'}
          </span>
          <div
            className={`
            flex items-center gap-2 px-4 py-2 rounded-lg
            bg-gradient-to-r from-violet-600 to-purple-600
            text-white font-medium text-sm
            transition-all duration-300
            group-hover:from-violet-500 group-hover:to-purple-500
            group-hover:shadow-lg group-hover:shadow-violet-500/30
          `}
          >
            <span>{isKo ? 'AI 분석 받기' : 'Get AI Report'}</span>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-transparent rounded-full blur-2xl transform translate-x-8 -translate-y-8" />
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  )
}

export { PremiumReportCTA }
