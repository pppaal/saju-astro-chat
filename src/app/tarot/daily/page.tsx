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
import { bumpStreakForToday } from '@/lib/tarot/dailyStreak'
import { cleanShareHook, pickKeyMessage } from '@/components/tarot/shareCardData'
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

// 로그인 없이도 "오늘의 카드"가 같은 기기에선 같은 1장으로 고정되게, 안정적
// 게스트 id 를 localStorage 에 두고 요청 헤더로 보낸다(서버 캐시·결정적 추첨 키).
function getGuestId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let g = localStorage.getItem('dp_guest')
    if (!g || !/^[A-Za-z0-9_-]{8,64}$/.test(g)) {
      const rnd = (
        globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
      ).replace(/-/g, '')
      g = rnd.slice(0, 24)
      localStorage.setItem('dp_guest', g)
    }
    return g
  } catch {
    return ''
  }
}

function dailyHeaders(): Record<string, string> {
  const g = getGuestId()
  return g ? { 'x-dp-guest': g } : {}
}

export default function DailyTarotPage() {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const [reading, setReading] = useState<DailyReading | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streak, setStreak] = useState<number | null>(null)

  const draw = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await apiFetch('/api/tarot/daily', { method: 'POST', headers: dailyHeaders() })
      const json = (await res.json().catch(() => null)) as {
        data?: { reading?: DailyReading }
      } | null
      const r = json?.data?.reading
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

  // 마운트: 오늘 카드가 있으면 바로 보여주고, 없으면 *자동으로* 뽑는다.
  // (진입 칩 → 페이지 → 또 "뽑기" 버튼 누르는 중복 단계 제거: 들어오면 바로 로딩→결과.)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch('/api/tarot/daily', { method: 'GET', headers: dailyHeaders() })
        const json = (await res.json().catch(() => null)) as {
          data?: { ready?: boolean; reading?: DailyReading }
        } | null
        const data = json?.data
        if (cancelled) return
        if (data?.ready && data.reading) {
          setReading(data.reading)
          setChecking(false)
          return
        }
        // 아직 안 뽑음 → 자동 뽑기로 바로 결과까지.
        void draw()
        setChecking(false)
      } catch {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // draw 는 [isKo] 로만 바뀌고 마운트 1회 자동 뽑기면 충분 — 의존성에서 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 오늘 카드를 보게 되면(캐시/신규 무관) 연속 뽑기 스트릭을 갱신한다.
  useEffect(() => {
    if (!reading?.date) return
    const n = bumpStreakForToday(reading.date)
    if (n > 0) setStreak(n)
  }, [reading?.date])

  // 공유 카드 상단 라벨이 이미 "오늘의 타로"라, 질문/푸터까지 같은 문구를 쓰면
  // 한 카드에 "오늘의 타로"가 세 번 박힌다. 질문은 날짜로, 푸터는 "오늘의 카드"로
  // 바꿔 중복을 없앤다.
  const dateLabel = reading
    ? new Date(`${reading.date}T00:00:00`).toLocaleDateString(isKo ? 'ko-KR' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''
  // 데일리 라우트는 hook 을 날것으로 저장한다. 공유 카드(이미지)에선 일반 리딩과
  // 동일하게 정리한다: 마크다운/따옴표 제거 + 길이 컷(cleanShareHook). 비면
  // 본문 첫 문장으로 폴백. 이미지에 별표·따옴표가 그대로 박히는 걸 막는다.
  const dailyHook = reading ? cleanShareHook(reading.hook) : ''
  const shareData: ShareCardData | null = reading
    ? {
        question: dateLabel,
        spreadTitle: isKo ? '오늘의 카드' : 'Card of the day',
        cards: [
          {
            image: reading.card.image,
            name: isKo ? reading.card.nameKo || reading.card.name : reading.card.name,
            isReversed: reading.card.isReversed,
          },
        ],
        keyMessage: dailyHook || pickKeyMessage(reading.message),
        // 데일리만 상단 라벨을 "오늘의 타로"로(일반 리딩은 "타로 리딩" 기본값).
        eyebrow: isKo ? '오늘의 타로' : "TODAY'S TAROT",
        // 티저(본문 발췌)는 싣지 않는다 — 공유 이미지에서 "…"로 잘린 본문은
        // 궁금증 갭이 아니라 "미완성"으로 읽힌다(스크린샷엔 클릭할 대상이 없음).
        // 카드엔 완결된 후크 한 줄만. 본문은 페이지/유료 리딩에서 읽게 한다.
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

        {checking || loading ? (
          <div
            style={{
              marginTop: 56,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} />
            <p style={{ color: MUTED, fontSize: 14 }}>
              {isKo ? '오늘의 카드를 뽑고 있어요…' : 'Drawing your card of the day…'}
            </p>
          </div>
        ) : !reading ? (
          // 자동 뽑기가 실패한 경우에만 노출 — 재시도.
          <div style={{ marginTop: 40 }}>
            <p style={{ color: '#fda4af', fontSize: 13, marginBottom: 20 }}>
              {error ||
                (isKo
                  ? '카드를 뽑지 못했어요. 다시 시도해 주세요.'
                  : 'Could not draw a card. Please try again.')}
            </p>
            <button
              type="button"
              onClick={() => void draw()}
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
                cursor: 'pointer',
              }}
            >
              <Sparkles className="w-4 h-4" />
              {isKo ? '다시 시도' : 'Try again'}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 32 }}>
            {/* 연속 뽑기 스트릭 — 재방문 습관 루프. 2일부터 노출("연속"이 자연스럽게). */}
            {streak && streak >= 2 ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 20,
                  padding: '7px 16px',
                  borderRadius: 999,
                  background: 'rgba(232,204,138,0.12)',
                  border: '1px solid rgba(232,204,138,0.4)',
                  color: GOLD,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                🔥 {isKo ? `${streak}일 연속` : `${streak}-day streak`}
              </div>
            ) : null}
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
                  // 한국어는 단어 중간 분리 방지, 영어는 긴 토큰이 넘칠 때만 끊기.
                  wordBreak: 'keep-all',
                  overflowWrap: 'anywhere',
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
                }}
              >
                {/* 한 문단으로 흐르게 — 모델이 넣은 줄바꿈/빈 줄은 한 칸으로 정리(뚝뚝 끊김 방지). */}
                {reading.message.replace(/\s*\n+\s*/g, ' ').trim()}
              </p>
            ) : null}

            {shareData ? (
              <div
                style={{
                  marginTop: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* 반복형 재공유 훅 — "오늘 내 카드는 이거, 넌?"으로 매일 공유 동기를 만든다. */}
                <div style={{ maxWidth: 340, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#f0e6c8' }}>
                    {isKo
                      ? '오늘 내 카드는 이거 — 친구는? 👀'
                      : "Here's my card today — and yours? 👀"}
                  </p>
                  <p
                    style={{
                      margin: '5px 0 0',
                      fontSize: 12.5,
                      lineHeight: 1.6,
                      color: 'rgba(223,227,238,0.72)',
                    }}
                  >
                    {isKo
                      ? '공유하면 친구도 로그인 없이 오늘의 카드를 무료로 받아봐요.'
                      : 'Share it — your friends get their own daily card, free, no sign-up.'}
                  </p>
                </div>
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
