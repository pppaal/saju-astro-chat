'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useUserProfile } from '@/hooks/useUserProfile'
import Link from 'next/link'
import DateTimePicker from '@/components/ui/DateTimePicker'

interface SajuData {
  dayMasterElement: string
  dayMaster: string
  birthDate: string
  birthTime?: string
}

const THEME_INFO = {
  love: {
    label: '사랑 운세',
    emoji: '💕',
    description: '연애, 결혼, 인연에 대한 심층 분석',
    credits: 2,
    color: 'from-pink-500 to-rose-500',
    sections: ['심층 분석', '인연 패턴', '타이밍', '궁합 분석', '실천 가이드'],
  },
  career: {
    label: '커리어 운세',
    emoji: '💼',
    description: '직장, 사업, 진로에 대한 심층 분석',
    credits: 2,
    color: 'from-blue-500 to-indigo-500',
    sections: ['심층 분석', '성공 패턴', '타이밍', '전략 제안', '실천 가이드'],
  },
  wealth: {
    label: '재물 운세',
    emoji: '💰',
    description: '재운, 투자, 재테크에 대한 심층 분석',
    credits: 2,
    color: 'from-yellow-500 to-amber-500',
    sections: ['심층 분석', '재물 패턴', '타이밍', '투자 전략', '실천 가이드'],
  },
  health: {
    label: '건강 운세',
    emoji: '🏥',
    description: '건강, 체력, 웰빙에 대한 심층 분석',
    credits: 2,
    color: 'from-green-500 to-emerald-500',
    sections: ['심층 분석', '건강 패턴', '타이밍', '예방 가이드', '실천 가이드'],
  },
  family: {
    label: '가족 운세',
    emoji: '👨‍👩‍👧‍👦',
    description: '가정, 부모, 자녀 관계에 대한 심층 분석',
    credits: 2,
    color: 'from-purple-500 to-violet-500',
    sections: ['심층 분석', '가족 역학', '타이밍', '조화 방안', '실천 가이드'],
  },
}

type ThemeType = keyof typeof THEME_INFO

export default function ThemedReportPage() {
  const router = useRouter()
  const { status } = useSession()
  const { profile, isLoading: profileLoading } = useUserProfile()

  const [selectedTheme, setSelectedTheme] = useState<ThemeType | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sajuData, setSajuData] = useState<SajuData | null>(null)
  const [sajuLoading, setSajuLoading] = useState(false)

  // 사용자 입력 정보 (프로필이 없는 경우 직접 입력)
  const [manualName, setManualName] = useState('')
  const [manualBirthDate, setManualBirthDate] = useState('')
  const [manualBirthTime, setManualBirthTime] = useState('')
  const [useCustomInfo, setUseCustomInfo] = useState(false)

  // 사주 정보 로드
  const loadSajuData = useCallback(async () => {
    if (status !== 'authenticated') {
      return
    }

    setSajuLoading(true)
    try {
      const res = await fetch('/api/me/saju')
      const data = await res.json()
      if (data.success && data.hasSaju) {
        setSajuData(data.saju)
      }
    } catch {
      // 사주 로드 실패 시 무시 (기본값 사용)
    } finally {
      setSajuLoading(false)
    }
  }, [status])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/premium-reports/themed')
    }
  }, [status, router])

  useEffect(() => {
    loadSajuData()
  }, [loadSajuData])

  const handleGenerate = async () => {
    if (!selectedTheme) {
      setError('테마를 선택해주세요.')
      return
    }

    // 프로필 또는 수동 입력 정보 사용
    const finalName = profile.name || manualName || '사용자'
    const finalBirthDate = profile.birthDate || manualBirthDate

    if (!finalBirthDate) {
      setError('생년월일을 입력해주세요.')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/destiny-matrix/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: selectedTheme,
          dayMasterElement: sajuData?.dayMasterElement || '목',
          name: finalName,
          birthDate: finalBirthDate,
          birthTime: profile.birthTime || manualBirthTime || undefined,
          lang: 'ko',
        }),
      })

      const data = await response.json()

      if (!data.success) {
        if (data.error?.code === 'INSUFFICIENT_CREDITS') {
          router.push('/pricing?reason=credits')
          return
        }
        throw new Error(data.error?.message || '리포트 생성에 실패했습니다.')
      }

      // 성공 - 결과 페이지로 이동
      router.push(`/premium-reports/result/${data.report.id}?type=themed`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (status === 'loading' || profileLoading || sajuLoading) {
    return (
      <div className="min-h-[100svh] bg-slate-900 flex items-center justify-center">
        <div className="text-white">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/premium-reports"
            className="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1"
          >
            ← 리포트 선택으로
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4">테마별 심화 운세</h1>
          <p className="text-gray-400 mt-2">관심있는 분야를 선택하여 깊이있는 분석을 받아보세요</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-20">
        {/* Theme Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {(Object.entries(THEME_INFO) as [ThemeType, (typeof THEME_INFO)[ThemeType]][]).map(
            ([key, theme]) => (
              <button
                key={key}
                onClick={() => setSelectedTheme(key)}
                className={`p-6 rounded-xl border-2 transition-all text-left focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  selectedTheme === key
                    ? `border-white bg-gradient-to-br ${theme.color} bg-opacity-30`
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                }`}
              >
                <div className="text-4xl mb-3">{theme.emoji}</div>
                <h3 className="text-lg font-bold text-white mb-1">{theme.label}</h3>
                <p className="text-gray-400 text-sm mb-3">{theme.description}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-purple-400">✦ {theme.credits} 크레딧</span>
                </div>
              </button>
            )
          )}
        </div>

        {/* Selected Theme Detail */}
        {selectedTheme && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>{THEME_INFO[selectedTheme].emoji}</span>
              {THEME_INFO[selectedTheme].label} 분석 내용
            </h2>
            <div className="flex flex-wrap gap-2">
              {THEME_INFO[selectedTheme].sections.map((section) => (
                <span
                  key={section}
                  className="px-3 py-1 rounded-full bg-slate-700 text-gray-300 text-sm"
                >
                  {section}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Profile Info */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">분석 대상 정보</h2>
            {profile.birthDate && (
              <button
                onClick={() => setUseCustomInfo(!useCustomInfo)}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                {useCustomInfo ? '프로필 사용' : '다른 정보 입력'}
              </button>
            )}
          </div>
          {profile.birthDate && !useCustomInfo ? (
            <div className="space-y-2 text-gray-300">
              <p>
                <span className="text-gray-500">이름:</span> {profile.name || '미입력'}
              </p>
              <p>
                <span className="text-gray-500">생년월일:</span> {profile.birthDate}
              </p>
              {profile.birthTime && (
                <p>
                  <span className="text-gray-500">출생시간:</span> {profile.birthTime}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">프로필에 저장된 정보를 사용합니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">이름 (선택)</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <DateTimePicker
                  value={manualBirthDate}
                  onChange={setManualBirthDate}
                  label="생년월일 (필수)"
                  required
                  locale="ko"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  출생시간 (선택)
                </label>
                <input
                  type="time"
                  value={manualBirthTime}
                  onChange={(e) => setManualBirthTime(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">더 정확한 분석을 위해 입력하세요</p>
              </div>
              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-gray-400">
                  프로필에 정보가 없습니다. 위 정보를 입력하거나{' '}
                  <Link
                    href="/destiny-map"
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    운세 분석에서 프로필 설정
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={
            isGenerating ||
            (!(profile.birthDate && !useCustomInfo) && !manualBirthDate) ||
            !selectedTheme
          }
          className={`w-full p-4 rounded-xl font-bold text-white flex items-center justify-center gap-3 transition-all focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
            isGenerating ||
            (!(profile.birthDate && !useCustomInfo) && !manualBirthDate) ||
            !selectedTheme
              ? 'bg-slate-600 cursor-not-allowed'
              : `bg-gradient-to-r ${selectedTheme ? THEME_INFO[selectedTheme].color : 'from-purple-500 to-pink-500'} hover:opacity-90`
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>AI가 분석 중...</span>
            </>
          ) : (
            <>
              <span>
                {selectedTheme
                  ? `${THEME_INFO[selectedTheme].label} 생성하기`
                  : '테마를 선택해주세요'}
              </span>
              {selectedTheme && (
                <span className="text-sm opacity-80">
                  ✦ {THEME_INFO[selectedTheme].credits} 크레딧
                </span>
              )}
            </>
          )}
        </button>

        {/* Info */}
        <p className="text-gray-500 text-sm text-center mt-4">
          생성된 리포트는 마이페이지에서 다시 확인할 수 있습니다.
        </p>
      </main>
    </div>
  )
}
