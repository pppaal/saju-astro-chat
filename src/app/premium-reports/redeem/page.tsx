'use client'

/**
 * Post-checkout landing page for premium-report purchases.
 *
 * Flow:
 *   1. User pays on Stripe → Stripe redirects to this page with
 *      `?session_id=cs_xxx` (success_url set in /api/checkout).
 *   2. We call /api/premium-reports/redeem to verify payment and get the
 *      SKU/period that was purchased.
 *   3. If purchase is already consumed, jump to the existing report.
 *   4. Otherwise we trigger /api/destiny-matrix/ai-report with the saved
 *      profile + `purchaseSessionId` so the route bypasses credit
 *      deduction and pins the generated report to this purchase.
 *   5. Save snapshot (legacy + ultimateComputed + ultimateCore) and
 *      navigate to /premium-reports/result/{reportId}.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useUserProfile } from '@/hooks/useUserProfile'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import { savePremiumReportSnapshot } from '@/lib/premium-reports/reportSnapshot'
import {
  extractMatrixHints,
  fetchPremiumSajuData,
  fetchUltimateComputed,
  fetchUltimateCore,
  flattenLegacySections,
  loadStoredReportProfile,
} from '@/app/premium-reports/_lib/shared'
import type {
  UltimateComputed,
  UltimateCore,
} from '@/lib/premium-reports/ultimateReport'

type RedeemPeriod = 'monthly' | 'yearly' | 'comprehensive'

interface RedeemResponse {
  success?: boolean
  data?: {
    status: 'paid' | 'consumed'
    sku: 'monthly' | 'yearly' | 'lifetime'
    period: RedeemPeriod
    sessionId: string
    consumedReportId?: string | null
    paidAt?: string | null
    expiresAt?: string | null
  }
  error?: { code?: string; message?: string }
}

function formatTargetDate(period: RedeemPeriod): string {
  const now = new Date()
  if (period === 'monthly') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }
  if (period === 'yearly') {
    return `${now.getFullYear()}-01-01`
  }
  return `${now.getFullYear()}-01-01`
}

function formatPeriodLabel(period: RedeemPeriod): string {
  const now = new Date()
  if (period === 'monthly') return `${now.getFullYear()}년 ${now.getMonth() + 1}월`
  if (period === 'yearly') return `${now.getFullYear()}년`
  return '인생 전체'
}

export default function RedeemPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams?.get('session_id') ?? ''
  const { status: authStatus } = useSession()
  const { profile, isLoading: profileLoading } = useUserProfile()
  const [stage, setStage] = useState<'verifying' | 'generating' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const startedRef = useRef(false)

  const handleFlow = useCallback(async () => {
    if (!sessionId) {
      setStage('error')
      setErrorMessage('결제 세션 정보가 없습니다.')
      return
    }
    setStage('verifying')

    let redeemData: RedeemResponse['data'] | null = null
    try {
      const verifyRes = await fetch(
        `/api/premium-reports/redeem?session_id=${encodeURIComponent(sessionId)}`,
        { cache: 'no-store' }
      )
      const verifyJson = (await verifyRes.json()) as RedeemResponse
      if (!verifyRes.ok || !verifyJson?.success || !verifyJson.data) {
        setStage('error')
        setErrorMessage(
          verifyJson?.error?.message ||
            '결제 확인에 실패했습니다. 잠시 후 다시 시도해주세요.'
        )
        return
      }
      redeemData = verifyJson.data
    } catch {
      setStage('error')
      setErrorMessage('결제 확인 중 네트워크 오류가 발생했습니다.')
      return
    }

    if (redeemData.status === 'consumed' && redeemData.consumedReportId) {
      router.replace(
        `/premium-reports/result/${redeemData.consumedReportId}?type=${redeemData.period}`
      )
      return
    }

    setStage('generating')

    const stored = loadStoredReportProfile()
    const finalBirthDate = stored?.birthDate || profile.birthDate
    if (!finalBirthDate) {
      setStage('error')
      setErrorMessage(
        '생년월일 정보가 없어 리포트를 생성할 수 없습니다. 프로필을 확인해주세요.'
      )
      return
    }
    const finalName = stored?.name || profile.name || '사용자'
    const finalBirthTime = stored?.birthTime || profile.birthTime || undefined
    const finalTimezone = stored?.timezone || profile.timezone || undefined
    const finalCity = stored?.birthCity || profile.birthCity || undefined
    const finalGender = stored?.gender || undefined
    const finalLat = stored?.latitude ?? profile.latitude ?? undefined
    const finalLng = stored?.longitude ?? profile.longitude ?? undefined

    let dayMasterElement: string | undefined
    try {
      const sajuData = await fetchPremiumSajuData()
      dayMasterElement = sajuData?.dayMasterElement || undefined
    } catch {
      // ignore — backend can compute from birth date
    }

    const period = redeemData.period
    const targetDate = formatTargetDate(period)

    let aiReportResponse: { success?: boolean; report?: { id?: string }; error?: { message?: string } }
    try {
      const aiRes = await fetch('/api/destiny-matrix/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportTier: 'premium',
          period,
          targetDate: period === 'comprehensive' ? undefined : targetDate,
          purchaseSessionId: redeemData.sessionId,
          ...(dayMasterElement ? { dayMasterElement } : {}),
          name: finalName,
          birthDate: finalBirthDate,
          birthTime: finalBirthTime,
          timezone: finalTimezone,
          birthCity: finalCity,
          gender: finalGender,
          latitude: finalLat,
          longitude: finalLng,
          lang: 'ko',
        }),
      })
      aiReportResponse = await aiRes.json()
    } catch {
      setStage('error')
      setErrorMessage('리포트 생성 중 네트워크 오류가 발생했습니다.')
      return
    }

    if (!aiReportResponse?.success || !aiReportResponse.report?.id) {
      setStage('error')
      setErrorMessage(
        aiReportResponse?.error?.message ||
          '리포트 생성에 실패했습니다. 고객센터에 문의해주세요.'
      )
      return
    }

    // Hydrate snapshot with computed + LLM-authored core for the new visual.
    let computed: UltimateComputed | null = null
    try {
      computed = (await fetchUltimateComputed({
        birthDate: finalBirthDate,
        birthTime: finalBirthTime,
        gender: finalGender,
        timezone: finalTimezone,
        latitude: finalLat,
        longitude: finalLng,
      })) as UltimateComputed | null
    } catch {
      // optional — fallback adapter still works
    }

    let ultimateCore: UltimateCore | null = null
    if (computed) {
      try {
        ultimateCore = (await fetchUltimateCore({
          period,
          periodLabel: formatPeriodLabel(period),
          targetDate,
          computed,
          legacySections: flattenLegacySections(aiReportResponse.report),
          matrixHints: extractMatrixHints(aiReportResponse.report),
        })) as UltimateCore | null
      } catch {
        // optional — adapter falls back from legacy sections
      }
    }

    savePremiumReportSnapshot({
      reportId: aiReportResponse.report.id,
      reportType: period,
      period,
      createdAt: new Date().toISOString(),
      report: aiReportResponse.report as Record<string, unknown>,
      ...(computed ? { ultimateComputed: computed } : {}),
      ...(ultimateCore ? { ultimateCore } : {}),
    })

    router.replace(`/premium-reports/result/${aiReportResponse.report.id}?type=${period}`)
  }, [profile, router, sessionId])

  useEffect(() => {
    if (authStatus === 'loading' || profileLoading) return
    if (authStatus === 'unauthenticated') {
      router.replace(
        `/auth/signin?callbackUrl=${encodeURIComponent(`/premium-reports/redeem?session_id=${sessionId}`)}`
      )
      return
    }
    if (startedRef.current) return
    startedRef.current = true
    void handleFlow()
  }, [authStatus, handleFlow, profileLoading, router, sessionId])

  if (authStatus === 'loading' || profileLoading || stage !== 'error') {
    return <UnifiedServiceLoading kind="aiReport" locale="ko" />
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center space-y-5">
        <h1 className="text-xl font-bold">리포트 발급에 문제가 있어요</h1>
        <p className="text-sm leading-relaxed text-zinc-300">
          {errorMessage || '잠시 후 다시 시도해주세요.'}
        </p>
        <div className="text-xs text-zinc-500">결제 세션: {sessionId.slice(0, 18)}…</div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              startedRef.current = false
              void handleFlow()
            }}
            className="w-full rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
          >
            다시 시도하기
          </button>
          <button
            type="button"
            onClick={() => router.push('/premium-reports')}
            className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500"
          >
            리포트 목록으로
          </button>
        </div>
      </div>
    </div>
  )
}
