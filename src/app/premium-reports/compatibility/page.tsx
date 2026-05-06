'use client'

/**
 * Premium Compatibility Report — 3-layer 사주·점성 분석 + LLM 매거진 톤 윤문.
 *
 * Flow:
 *   1. 두 사람의 사주 기본 정보 입력
 *   2. POST /api/destiny-matrix/compatibility-3layer { withNarrative: true }
 *   3. 엔진 결과 + LLM narrative 한 페이지에 렌더 (별도 result 라우트 없음)
 *
 * 결제는 추후 결제 PR이 들어오면 본 페이지의 "분석하기" CTA를 Stripe
 * 체크아웃으로 교체하면 됨. 지금은 로그인 인증만 가드.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import CompatibilityReportView from './_components/CompatibilityReportView'
import type { ThreeLayerCompatibility } from '@/lib/destiny-matrix/compatibility'
import type { CompatibilityNarrative } from '@/lib/destiny-matrix/compatibility/narrativeTypes'

interface PersonForm {
  label: string
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
}

const DEFAULT_PERSON: PersonForm = {
  label: '',
  birthDate: '',
  birthTime: '12:00',
  gender: 'male',
}

interface ApiResult extends ThreeLayerCompatibility {
  narrative?: CompatibilityNarrative | null
  narrativeMeta?: {
    modelUsed?: string
    tokensUsed?: number
    warnings?: string[]
    error?: string
  }
}

function isValidPerson(p: PersonForm): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate) && /^\d{2}:\d{2}$/.test(p.birthTime)
}

export default function PremiumCompatibilityPage() {
  const router = useRouter()
  const { status } = useSession()
  const redirectedRef = useRef(false)

  const [personA, setPersonA] = useState<PersonForm>({ ...DEFAULT_PERSON, label: '나' })
  const [personB, setPersonB] = useState<PersonForm>({ ...DEFAULT_PERSON, label: '상대', gender: 'female' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApiResult | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true
      router.push('/auth/signin?callbackUrl=/premium-reports/compatibility')
    }
    if (status === 'authenticated') {
      redirectedRef.current = false
    }
  }, [router, status])

  const canSubmit = useMemo(
    () => isValidPerson(personA) && isValidPerson(personB) && !submitting,
    [personA, personB, submitting]
  )

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('두 사람의 생년월일과 출생시간을 정확히 입력해주세요.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/destiny-matrix/compatibility-3layer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: {
            birthDate: personA.birthDate,
            birthTime: personA.birthTime,
            gender: personA.gender,
          },
          personB: {
            birthDate: personB.birthDate,
            birthTime: personB.birthTime,
            gender: personB.gender,
          },
          labelA: personA.label || '나',
          labelB: personB.label || '상대',
          withNarrative: true,
        }),
      })
      const data = (await res.json()) as ApiResult & { error?: { message?: string } }
      if (!res.ok || (data as { error?: unknown }).error) {
        const errorObj = (data as { error?: { message?: string } | string }).error
        const msg =
          typeof errorObj === 'string'
            ? errorObj
            : typeof errorObj === 'object' && errorObj && 'message' in errorObj
              ? errorObj.message
              : '궁합 분석에 실패했습니다.'
        throw new Error(msg)
      }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return <UnifiedServiceLoading kind="aiReport" locale="ko" />
  }

  if (result) {
    return (
      <CompatibilityReportView
        result={result}
        labelA={personA.label || '나'}
        labelB={personB.label || '상대'}
        onReset={() => {
          setResult(null)
          setError(null)
        }}
      />
    )
  }

  return (
    <>
      {submitting && (
        <div className="fixed inset-0 z-[120]">
          <UnifiedServiceLoading kind="aiReport" locale="ko" />
        </div>
      )}
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1a1c2e_0%,#0a0a14_60%)] text-slate-100">
        <div className="mx-auto max-w-3xl px-6 pb-20 pt-16 sm:pt-24">
          <header className="space-y-5 text-center">
            <div className="flex justify-center">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]"
                style={{
                  borderColor: 'rgba(244,114,182,0.4)',
                  color: '#f472b6',
                  background: 'rgba(244,114,182,0.12)',
                }}
              >
                Premium · Compatibility
              </span>
            </div>
            <h1
              className="text-balance bg-[linear-gradient(135deg,#fff_0%,#f0abfc_100%)] bg-clip-text text-4xl font-semibold leading-[1.1] text-transparent md:text-5xl"
              style={{ letterSpacing: '-0.025em', wordBreak: 'keep-all' }}
            >
              두 사람의 궁합 리포트
            </h1>
            <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-slate-400">
              사주 정합도 + 점성 시너스트리 + 합쳐진 에너지 3가지 관점에서 분석하고,
              매거진 톤으로 풀어드립니다.
            </p>
          </header>

          <main className="mt-10 space-y-6">
            <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-xl">
              <h2 className="mb-5 text-base font-extrabold tracking-tight text-white">
                두 사람의 정보 입력
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                <PersonInput
                  label="첫 번째 사람"
                  value={personA}
                  onChange={setPersonA}
                  defaultName="나"
                />
                <PersonInput
                  label="두 번째 사람"
                  value={personB}
                  onChange={setPersonB}
                  defaultName="상대"
                />
              </div>
            </section>

            {error && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4 text-base font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 hover:from-rose-400 hover:to-pink-400"
            >
              {submitting ? '분석 중...' : '궁합 분석하기'}
            </button>

            <p className="text-center text-xs text-slate-500">
              두 사람의 사주 데이터를 즉시 분석합니다. 분석 결과는 저장되지 않습니다.
            </p>
          </main>
        </div>
      </div>
    </>
  )
}

interface PersonInputProps {
  label: string
  value: PersonForm
  onChange: (v: PersonForm) => void
  defaultName: string
}

function PersonInput({ label, value, onChange, defaultName }: PersonInputProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">{label}</div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-zinc-400">호칭</label>
        <input
          type="text"
          value={value.label}
          placeholder={defaultName}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-rose-400/40 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-zinc-400">생년월일</label>
        <input
          type="date"
          value={value.birthDate}
          onChange={(e) => onChange({ ...value, birthDate: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-rose-400/40 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-zinc-400">출생시간</label>
        <input
          type="time"
          value={value.birthTime}
          onChange={(e) => onChange({ ...value, birthTime: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-rose-400/40 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-zinc-400">성별</label>
        <div className="flex gap-2">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onChange({ ...value, gender: g })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                value.gender === g
                  ? 'border-rose-400/40 bg-rose-500/15 text-rose-100'
                  : 'border-white/10 bg-black/30 text-zinc-400 hover:border-white/30'
              }`}
            >
              {g === 'male' ? '남성' : '여성'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
