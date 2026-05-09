'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { logger } from '@/lib/logger'

type CSSStyles = { readonly [key: string]: string }

type ActivityOption = 'meeting' | 'proposal' | 'engagement' | 'marriage' | 'travel'

const ACTIVITY_LABELS: Record<ActivityOption, string> = {
  meeting: '첫 만남',
  proposal: '고백/프로포즈',
  engagement: '약혼',
  marriage: '결혼',
  travel: '여행',
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  'meeting',
  'proposal',
  'engagement',
  'marriage',
  'travel',
]

interface OracleCard {
  position: 'present' | 'potential' | 'advice'
  id: number
  name: string
  nameKo: string
  image: string
  reversed: boolean
  keywordsKo: string[]
  meaningKo: string
  adviceKo: string
}

interface OracleHour {
  hourRange: string
  quality: 'excellent' | 'good' | 'neutral'
  reason: string
}

interface OracleDate {
  date: string
  dayOfWeek: string
  score: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  reasons: string[]
  warnings: string[]
  bestHour: OracleHour | null
}

interface OracleReading {
  connectionId: string
  asOf: string
  activity: ActivityOption
  tarot: { spread: 'relationship-3card'; seed: string; cards: OracleCard[] }
  auspicious: { activity: ActivityOption; windowDays: number; dates: OracleDate[] }
}

const POSITION_LABELS: Record<OracleCard['position'], string> = {
  present: '현재 관계',
  potential: '가능성',
  advice: '조언',
}

const CARD_BACK = '/images/tarot/card-back.webp'

interface MatchOracleViewProps {
  connectionId: string
  styles: CSSStyles
  /** Auto-flip cards as soon as data loads (used in celebration). */
  autoReveal?: boolean
}

export function MatchOracleView({
  connectionId,
  styles,
  autoReveal = false,
}: MatchOracleViewProps) {
  const [activity, setActivity] = useState<ActivityOption>('meeting')
  const [reading, setReading] = useState<OracleReading | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set())

  const loadReading = useCallback(
    async (selectedActivity: ActivityOption) => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/destiny-match/oracle/${encodeURIComponent(connectionId)}?activity=${selectedActivity}`,
        )
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error || '오라클을 불러오는데 실패했습니다')
        }
        // API wraps payload via apiSuccess → { success: true, data: ... }
        const payload: OracleReading = data?.data ?? data
        setReading(payload)
        setRevealedCards(new Set())
      } catch (err) {
        const msg = err instanceof Error ? err.message : '오라클 로드 실패'
        logger.error('[MatchOracleView] load failed:', { err })
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [connectionId],
  )

  useEffect(() => {
    loadReading(activity)
  }, [loadReading, activity])

  // Auto-reveal cards sequentially after data lands
  useEffect(() => {
    if (!reading || !autoReveal) {
      return
    }
    const timers: ReturnType<typeof setTimeout>[] = []
    reading.tarot.cards.forEach((_, idx) => {
      timers.push(
        setTimeout(
          () => setRevealedCards((prev) => new Set(prev).add(idx)),
          600 + idx * 700,
        ),
      )
    })
    return () => {
      timers.forEach(clearTimeout)
    }
  }, [reading, autoReveal])

  const handleFlip = (idx: number) => {
    setRevealedCards((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  return (
    <div className={styles.oracle}>
      {/* Activity selector */}
      <div className={styles.oracleActivities} role="tablist" aria-label="목적 선택">
        {ACTIVITY_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={activity === opt}
            className={`${styles.oracleActivity} ${
              activity === opt ? styles.oracleActivityActive : ''
            }`}
            onClick={() => setActivity(opt)}
          >
            {ACTIVITY_LABELS[opt]}
          </button>
        ))}
      </div>

      {/* Tarot spread */}
      <section className={styles.oracleSection} aria-label="관계 타로">
        <h3 className={styles.oracleSectionTitle}>
          <span aria-hidden="true">🔮</span> 운명의 카드 — 관계 3장 스프레드
        </h3>

        {isLoading && !reading ? (
          <div className={styles.oracleSkeleton}>카드를 섞는 중...</div>
        ) : reading ? (
          <div className={styles.oracleCards}>
            {reading.tarot.cards.map((card, idx) => {
              const isRevealed = revealedCards.has(idx)
              return (
                <button
                  key={card.position}
                  type="button"
                  className={styles.oracleCardWrap}
                  onClick={() => handleFlip(idx)}
                  aria-label={
                    isRevealed
                      ? `${POSITION_LABELS[card.position]}: ${card.nameKo}`
                      : `${POSITION_LABELS[card.position]} 카드 뒤집기`
                  }
                >
                  <div className={styles.oracleCardPosition}>
                    {POSITION_LABELS[card.position]}
                  </div>
                  <motion.div
                    className={styles.oracleCard}
                    animate={{ rotateY: isRevealed ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                  >
                    <div className={styles.oracleCardFace}>
                      <Image
                        src={CARD_BACK}
                        alt=""
                        width={120}
                        height={200}
                        className={styles.oracleCardImage}
                      />
                    </div>
                    <div
                      className={`${styles.oracleCardFace} ${styles.oracleCardFaceBack} ${
                        card.reversed ? styles.oracleCardReversed : ''
                      }`}
                    >
                      <Image
                        src={card.image}
                        alt={card.nameKo}
                        width={120}
                        height={200}
                        className={styles.oracleCardImage}
                      />
                    </div>
                  </motion.div>
                  <div className={styles.oracleCardName}>
                    {isRevealed ? (
                      <>
                        {card.nameKo}
                        {card.reversed && (
                          <span className={styles.oracleCardReversedTag}> · 역방향</span>
                        )}
                      </>
                    ) : (
                      '카드를 뒤집어보세요'
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : null}

        {/* Selected card meaning */}
        {reading && (
          <AnimatePresence mode="wait">
            {reading.tarot.cards.map((card, idx) =>
              revealedCards.has(idx) ? (
                <motion.div
                  key={card.position}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={styles.oracleCardMeaning}
                >
                  <div className={styles.oracleCardMeaningHeader}>
                    <strong>{POSITION_LABELS[card.position]}</strong>
                    <span> · {card.nameKo}</span>
                    {card.reversed && (
                      <span className={styles.oracleCardReversedTag}> (역방향)</span>
                    )}
                  </div>
                  <p className={styles.oracleCardMeaningText}>{card.meaningKo}</p>
                  {card.adviceKo && (
                    <p className={styles.oracleCardAdvice}>💡 {card.adviceKo}</p>
                  )}
                </motion.div>
              ) : null,
            )}
          </AnimatePresence>
        )}
      </section>

      {/* Auspicious dates */}
      <section className={styles.oracleSection} aria-label="택일 추천">
        <h3 className={styles.oracleSectionTitle}>
          <span aria-hidden="true">📅</span> 택일·택시간 — 다음 14일 Top 5
          <span className={styles.oracleSectionSub}>
            ({ACTIVITY_LABELS[activity]} 기준)
          </span>
        </h3>

        {isLoading ? (
          <div className={styles.oracleSkeleton}>좋은 날을 가려내는 중...</div>
        ) : error ? (
          <div className={styles.oracleError}>⚠ {error}</div>
        ) : reading && reading.auspicious.dates.length > 0 ? (
          <ul className={styles.oracleDates}>
            {reading.auspicious.dates.map((d) => (
              <li key={d.date} className={styles.oracleDate}>
                <div className={styles.oracleDateMain}>
                  <span
                    className={`${styles.oracleGrade} ${
                      styles[`oracleGrade_${d.grade}`] ?? ''
                    }`}
                    aria-label={`등급 ${d.grade}`}
                  >
                    {d.grade}
                  </span>
                  <div className={styles.oracleDateText}>
                    <strong>{formatDateKo(d.date)}</strong>
                    <span className={styles.oracleDateDow}>({d.dayOfWeek})</span>
                  </div>
                  <span className={styles.oracleDateScore}>{d.score}점</span>
                </div>
                {d.bestHour && (
                  <div className={styles.oracleDateHour}>
                    🕐 {d.bestHour.hourRange}
                    <span
                      className={`${styles.oracleHourQuality} ${
                        styles[`oracleHourQuality_${d.bestHour.quality}`] ?? ''
                      }`}
                    >
                      {qualityLabel(d.bestHour.quality)}
                    </span>
                    <span className={styles.oracleHourReason}>{d.bestHour.reason}</span>
                  </div>
                )}
                {d.reasons.length > 0 && (
                  <ul className={styles.oracleReasons}>
                    {d.reasons.slice(0, 2).map((r, i) => (
                      <li key={i}>· {r}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.oracleEmpty}>이 활동에 잘 맞는 날이 14일 내에 없습니다.</div>
        )}
      </section>
    </div>
  )
}

function qualityLabel(q: OracleHour['quality']): string {
  switch (q) {
    case 'excellent':
      return '최상'
    case 'good':
      return '양호'
    default:
      return '보통'
  }
}

function formatDateKo(iso: string): string {
  // iso = YYYY-MM-DD
  const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10))
  if (!y || !m || !d) {
    return iso
  }
  return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`
}
