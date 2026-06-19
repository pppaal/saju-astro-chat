'use client'

// 오늘의 타로 — 하루 1장 무료 "맛보기" 데일리. 재방문 습관 루프 + 매일 공유거리.
// GET 으로 오늘 카드가 이미 있으면 바로 보여주고, 없으면 "오늘의 카드 뽑기"
// 버튼 → POST 로 1장 뽑아 짧게 해석. 크레딧 차감 없음(서버에서 무료 처리).
//
// 일부러 얕게 보여준다: 한 줄 후크 + 2문장. 깊은 해석은 유료 리딩의 몫이라,
// 맨 아래 "질문하고 더 깊이 보기" CTA 로 전환을 유도한다.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Loader2 } from 'lucide-react'
import { useI18n } from '@/i18n/I18nProvider'
import { apiFetch } from '@/lib/api'
import { tarotLogger } from '@/lib/logger'
import { ShareTarotButton } from '@/components/tarot/ShareTarotButton'
import type { ShareCardData } from '@/components/tarot/TarotShareCard'

interface DailyReading {
  date: string
  card: { name: string; nameKo: string; isReversed: boolean; image: string }
  hook: string
  message: string
}

const GOLD = '#e8cc8a'
const GOLD_SOFT = '#d4b572'
const MUTED = '#9aa3b8'

export default function DailyTarotPage() {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const [reading, setReading] = useState<DailyReading | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 마운트 시 오늘 카드가 이미 있는지 확인(무료 GET).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch('/api/tarot/daily', { method: 'GET' })
        const json = (await res.json().catch(() => null)) as {
          data?: { ready?: boolean; reading?: DailyReading }
        } | null
        const data = json?.data
        if (!cancelled && data?.ready && data.reading) setReading(data.reading)
      } catch {
        /* 게스트/네트워크 — 버튼으로 폴백 */
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const draw = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await apiFetch('/api/tarot/daily', { method: 'POST' })
      const json = (await res.json().catch(() => null)) as {
        data?: { reading?: DailyReading }
      } | null
      const r = json?.data?.reading
      if (res.status === 401) {
        setError(isKo ? '로그인 후 이용할 수 있어요.' : 'Please sign in to use this.')
        return
      }
      if (!res.ok || !r) {
        setError(
          isKo
            ? '카드를 뽑지 못했어요. 잠시 후 다시 시도해 주세요.'
            : 'Could not draw a card. Please try again.'
        )
        return
      }
      setReading(r)
    } catch (err) {
      tarotLogger.error('[daily] draw failed', err instanceof Error ? err : undefined)
      setError(isKo ? '네트워크 오류가 발생했어요.' : 'A network error occurred.')
    } finally {
      setLoading(false)
    }
  }, [isKo])

  const shareData: ShareCardData | null = reading
    ? {
        question: isKo ? '오늘의 타로' : "Today's Tarot",
        spreadTitle: isKo ? '오늘의 타로' : "Today's Tarot",
        cards: [
          {
            image: reading.card.image,
            name: isKo ? reading.card.nameKo || reading.card.name : reading.card.name,
            isReversed: reading.card.isReversed,
          },
        ],
        keyMessage: reading.hook || reading.message || '',
        isKo,
      }
    : null

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(900px 620px at 25% 8%, rgba(99,124,200,0.16), transparent 60%),' +
          'radial-gradient(820px 700px at 85% 100%, rgba(212,181,114,0.14), transparent 60%),' +
          'linear-gradient(160deg, #0b1022 0%, #070a1a 58%, #0a0e1f 100%)',
        color: '#f1f3f9',
      }}
    >
      <div
        style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px 80px', textAlign: 'center' }}
      >
        <Link href="/tarot" style={{ color: GOLD_SOFT, textDecoration: 'none', fontSize: 13 }}>
          ← {isKo ? '타로 홈' : 'Tarot home'}
        </Link>

        <p
          style={{
            marginTop: 24,
            fontSize: 12,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: GOLD_SOFT,
          }}
        >
          {isKo ? '오늘의 타로 · 무료' : "TODAY'S TAROT · FREE"}
        </p>
        <h1 style={{ marginTop: 8, fontSize: 26, fontWeight: 700 }}>
          {isKo ? '하루 한 장, 오늘의 메시지' : 'One card, one message for today'}
        </h1>

        {checking ? (
          <div style={{ marginTop: 48, color: MUTED }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ display: 'inline-block' }} />
          </div>
        ) : !reading ? (
          <div style={{ marginTop: 40 }}>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 24 }}>
              {isKo
                ? '오늘 하루를 위한 카드 한 장을 무료로 뽑아보세요.'
                : 'Draw one free card for your day.'}
            </p>
            <button
              type="button"
              onClick={() => void draw()}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                borderRadius: 999,
                background: GOLD,
                color: '#1a1305',
                fontWeight: 700,
                fontSize: 16,
                border: 'none',
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading
                ? isKo
                  ? '뽑는 중…'
                  : 'Drawing…'
                : isKo
                  ? '오늘의 카드 뽑기'
                  : "Draw today's card"}
            </button>
            {error && <p style={{ marginTop: 16, fontSize: 12, color: '#fda4af' }}>{error}</p>}
          </div>
        ) : (
          <div style={{ marginTop: 32 }}>
            <div
              style={{
                width: 168,
                height: 269,
                margin: '0 auto',
                borderRadius: 14,
                overflow: 'hidden',
                border: '1px solid rgba(212,181,114,0.4)',
                transform: reading.card.isReversed ? 'rotate(180deg)' : 'none',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reading.card.image}
                alt={reading.card.name}
                width={168}
                height={269}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <p style={{ marginTop: 12, fontSize: 14, color: MUTED }}>
              {isKo ? reading.card.nameKo || reading.card.name : reading.card.name}
              {reading.card.isReversed ? (isKo ? ' (역방향)' : ' (reversed)') : ''}
            </p>

            {reading.hook ? (
              <p
                style={{
                  marginTop: 20,
                  fontSize: 22,
                  fontWeight: 700,
                  color: GOLD,
                  lineHeight: 1.4,
                  wordBreak: 'keep-all',
                }}
              >
                {reading.hook}
              </p>
            ) : null}

            {reading.message ? (
              <p
                style={{
                  marginTop: 16,
                  fontSize: 16,
                  lineHeight: 1.8,
                  color: '#dfe3ee',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {reading.message}
              </p>
            ) : null}

            {shareData ? (
              <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
                <ShareTarotButton data={shareData} language={locale} body={reading.message} />
              </div>
            ) : null}

            {/* 맛보기의 핵심 — 더 깊은 해석은 유료 리딩으로. 가장 눈에 띄는 CTA. */}
            <div
              style={{
                marginTop: 32,
                padding: 20,
                borderRadius: 16,
                background: 'rgba(212,181,114,0.08)',
                border: '1px solid rgba(212,181,114,0.28)',
              }}
            >
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7 }}>
                {isKo
                  ? '이건 오늘의 맛보기 한 장이에요. 진짜 궁금한 건 직접 물어보세요 — 더 깊고 구체적인 해석을 드려요.'
                  : 'This is just a taste for today. Ask what you really want to know for a deeper, more specific reading.'}
              </p>
              <Link
                href="/tarot"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 16,
                  padding: '12px 24px',
                  borderRadius: 999,
                  background: GOLD,
                  color: '#1a1305',
                  textDecoration: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {isKo ? '질문하고 더 깊이 보기 →' : 'Ask a question for a deeper read →'}
              </Link>
            </div>

            <p style={{ marginTop: 20, fontSize: 12, color: MUTED }}>
              {isKo ? '내일 또 새로운 카드가 기다려요.' : 'A new card awaits tomorrow.'}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
