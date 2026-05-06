'use client'

/**
 * CalendarV2 page client — fetches user's signal pool from the existing
 * report endpoint and hands it to the layer-first calendar UI. Falls
 * back to a "프로필 먼저 완성해주세요" panel when signals aren't
 * available yet.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CalendarV2 from '@/components/calendar/v2/CalendarV2'
import type { NormalizedSignal } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'

interface SignalSource {
  signals: NormalizedSignal[]
  loading: boolean
  error: string | null
}

export default function CalendarV2PageClient() {
  const router = useRouter()
  const [src, setSrc] = useState<SignalSource>({ signals: [], loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()

    async function load() {
      try {
        // Step 1 — pull user's birth profile.
        const meRes = await fetch('/api/me/saju', { signal: ac.signal })
        if (!meRes.ok) throw new Error(`/api/me/saju ${meRes.status}`)
        const meJson = (await meRes.json()) as {
          success?: boolean
          hasSaju?: boolean
          saju?: { birthDate?: string; birthTime?: string }
        }
        if (!meJson?.hasSaju || !meJson.saju?.birthDate) {
          if (!cancelled) {
            setSrc({
              signals: [],
              loading: false,
              error: '프로필을 먼저 완성해주세요. 생년월일·시간·성별이 있어야 캘린더가 채워져요.',
            })
          }
          return
        }

        // Step 2 — for the MVP, generate engine signals via the existing
        // ai-report POST. We only need signalSynthesis; the rest of the
        // payload is discarded.
        const reportRes = await fetch('/api/destiny-matrix/ai-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ac.signal,
          body: JSON.stringify({
            reportTier: 'free', // does not consume credits
            birthDate: meJson.saju.birthDate,
            birthTime: meJson.saju.birthTime || '12:00',
            lang: 'ko',
            includeDetailedData: false,
          }),
        })
        if (!reportRes.ok) {
          // Fall back to empty — calendar will show empty state but UI shell
          // still renders, which is the right UX vs hiding the page entirely.
          if (!cancelled) {
            setSrc({ signals: [], loading: false, error: null })
          }
          return
        }
        const reportJson = (await reportRes.json()) as {
          report?: { fullData?: { signalSynthesis?: { normalizedSignals?: NormalizedSignal[] } } }
        }
        const signals =
          reportJson.report?.fullData?.signalSynthesis?.normalizedSignals || []
        if (!cancelled) setSrc({ signals, loading: false, error: null })
      } catch (err) {
        if (cancelled) return
        if ((err as { name?: string })?.name === 'AbortError') return
        setSrc({
          signals: [],
          loading: false,
          error: '캘린더 데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
        })
      }
    }

    void load()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [])

  if (src.loading) {
    return (
      <main
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#06091a',
          color: 'rgba(229, 231, 240, 0.7)',
          fontFamily: 'var(--font-noto-kr), system-ui, sans-serif',
        }}
      >
        <span>캘린더 불러오는 중...</span>
      </main>
    )
  }

  if (src.error) {
    return (
      <main
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          background: '#06091a',
          color: '#fff',
          fontFamily: 'var(--font-noto-kr), system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 15, color: 'rgba(229, 231, 240, 0.85)', maxWidth: 360 }}>
          {src.error}
        </p>
        <button
          type="button"
          onClick={() => router.push('/profile')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: 14,
            border: '1px solid rgba(167, 139, 250, 0.4)',
            background: 'rgba(139, 92, 246, 0.18)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          프로필 작성하러 가기 →
        </button>
      </main>
    )
  }

  return <CalendarV2 signals={src.signals} />
}
