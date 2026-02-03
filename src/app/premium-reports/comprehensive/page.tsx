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

export default function ComprehensiveReportPage() {
  const router = useRouter()
  const { status } = useSession()
  const { profile, isLoading: profileLoading } = useUserProfile()

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
      router.push('/auth/signin?callbackUrl=/premium-reports/comprehensive')
    }
  }, [status, router])

  useEffect(() => {
    loadSajuData()
  }, [loadSajuData])

  const handleGenerate = async () => {
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
          period: 'comprehensive',
          dayMasterElement: sajuData?.dayMasterElement || '목',
          name: finalName,
          birthDate: finalBirthDate,
          birthTime: profile.birthTime || manualBirthTime || undefined,
          detailLevel: 'comprehensive',
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
      router.push(`/premium-reports/result/${data.report.id}?type=comprehensive`)
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
        <div className="max-w-2xl mx-auto">
          <Link
            href="/premium-reports"
            className="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1"
          >
            ← 리포트 선택으로
          </Link>
          <div className="mt-4 p-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 bg-opacity-20">
            <div className="flex items-center gap-4">
              <span className="text-5xl">📜</span>
              <div>
                <h1 className="text-2xl font-bold text-white">종합 운세 리포트</h1>
                <p className="text-white/80">전체 운명 분석 + 인생 가이드</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-20">
        {/* Features */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">포함 내용</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 text-gray-300 text-sm">
              <span className="text-amber-400 mt-0.5">✓</span>
              <span>성격 및 기질 심층 분석</span>
            </div>
            <div className="flex items-start gap-2 text-gray-300 text-sm">
              <span className="text-amber-400 mt-0.5">✓</span>
              <span>커리어 및 재물운</span>
            </div>
            <div className="flex items-start gap-2 text-gray-300 text-sm">
              <span className="text-amber-400 mt-0.5">✓</span>
              <span>사랑 및 관계 운세</span>
            </div>
            <div className="flex items-start gap-2 text-gray-300 text-sm">
              <span className="text-amber-400 mt-0.5">✓</span>
              <span>건강 및 웰빙</span>
            </div>
            <div className="flex items-start gap-2 text-gray-300 text-sm">
              <span className="text-amber-400 mt-0.5">✓</span>
              <span>강점 및 약점 분석</span>
            </div>
            <div className="flex items-start gap-2 text-gray-300 text-sm">
              <span className="text-amber-400 mt-0.5">✓</span>
              <span>인생 조언 및 가이드</span>
            </div>
          </div>
        </div>

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
          disabled={isGenerating || (!(profile.birthDate && !useCustomInfo) && !manualBirthDate)}
          className={`w-full p-4 rounded-xl font-bold text-white flex items-center justify-center gap-3 transition-all focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
            isGenerating || (!(profile.birthDate && !useCustomInfo) && !manualBirthDate)
              ? 'bg-slate-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>AI가 종합 분석 중...</span>
            </>
          ) : (
            <>
              <span>종합 리포트 생성하기</span>
              <span className="text-sm opacity-80">✦ 3 크레딧</span>
            </>
          )}
        </button>

        {/* Info */}
        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <p className="text-amber-200 text-sm">
            종합 리포트는 모든 영역을 심층 분석하며, PDF 다운로드를 지원합니다.
          </p>
        </div>

        <p className="text-gray-500 text-sm text-center mt-4">
          생성된 리포트는 마이페이지에서 다시 확인할 수 있습니다.
        </p>
      </main>
    </div>
  )
}
