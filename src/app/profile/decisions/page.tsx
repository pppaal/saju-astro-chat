'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { logger } from '@/lib/logger'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './decisions.module.css'

type DecisionType = 'career_change' | 'marriage' | 'move' | 'investment' | 'health' | 'other'

type DecisionOutcome = 'good' | 'mixed' | 'bad' | 'pending'

interface DecisionItem {
  decisionType: string
  context: string
  recommendedAction: string | null
  outcome: string | null
  outcomeNote: string | null
  decidedAt: string | null
  evaluatedAt: string | null
}

interface PendingItem {
  id: string
  decisionType: string
  context: string
  decidedAt: string | null
  reviewAt: string | null
}

const TYPE_LABELS: Record<'ko' | 'en', Record<string, string>> = {
  ko: {
    career_change: '커리어 전환',
    marriage: '결혼',
    move: '이주',
    investment: '투자',
    health: '건강',
    other: '기타',
  },
  en: {
    career_change: 'Career change',
    marriage: 'Marriage',
    move: 'Relocation',
    investment: 'Investment',
    health: 'Health',
    other: 'Other',
  },
}

const OUTCOME_LABELS: Record<'ko' | 'en', Record<string, string>> = {
  ko: {
    good: '좋은 결과',
    mixed: '혼합',
    bad: '아쉬운 결과',
    pending: '평가 전',
  },
  en: {
    good: 'Good outcome',
    mixed: 'Mixed',
    bad: 'Disappointing',
    pending: 'Pending',
  },
}

export default function DecisionsPage() {
  const { data: session, status } = useSession()
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const TYPE_LABEL = TYPE_LABELS[isKo ? 'ko' : 'en']
  const OUTCOME_LABEL = OUTCOME_LABELS[isKo ? 'ko' : 'en']
  const [history, setHistory] = useState<DecisionItem[]>([])
  const [pending, setPending] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 새 결정 입력 폼
  const [decisionType, setDecisionType] = useState<DecisionType>('career_change')
  const [context, setContext] = useState('')

  // 평가 모드 (pending → outcome)
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<DecisionOutcome>('good')
  const [outcomeNote, setOutcomeNote] = useState('')

  const signInUrl = buildSignInUrl('/profile/decisions')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/me/decisions', { cache: 'no-store' })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setHistory(data?.data?.history || [])
      setPending(data?.data?.pending || [])
    } catch (e) {
      logger.error('[decisions page] fetch failed', e)
      setError(isKo ? '목록을 불러올 수 없어요' : "Couldn't load your decisions")
    } finally {
      setLoading(false)
    }
  }, [isKo])

  useEffect(() => {
    if (status === 'authenticated') void fetchData()
  }, [status, fetchData])

  async function logDecision(e: React.FormEvent) {
    e.preventDefault()
    if (!context.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/me/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionType,
          context: context.trim(),
        }),
      })
      if (!res.ok) throw new Error('failed')
      setContext('')
      void fetchData()
    } catch (e) {
      logger.error('[decisions page] log failed', e)
      setError(isKo ? '저장에 실패했어요' : 'Failed to save.')
    } finally {
      setSubmitting(false)
    }
  }

  async function evaluateDecision(decisionId: string) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/me/decisions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionId,
          outcome,
          outcomeNote: outcomeNote.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('failed')
      setEvaluatingId(null)
      setOutcomeNote('')
      void fetchData()
    } catch (e) {
      logger.error('[decisions page] evaluate failed', e)
      setError(isKo ? '평가 저장에 실패했어요' : 'Failed to save your review.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>{isKo ? '불러오는 중...' : 'Loading...'}</div>
      </div>
    )
  }
  if (status !== 'authenticated' || !session) {
    return (
      <div className={styles.page}>
        <div className={styles.loginPrompt}>
          <h1>{isKo ? '결정 기록' : 'Decision log'}</h1>
          <p>
            {isKo
              ? '사주·점성 분석 결정을 추적하려면 로그인이 필요해요.'
              : 'Sign in to track decisions you made based on Saju and astrology readings.'}
          </p>
          <Link href={signInUrl} className={styles.loginBtn}>
            {isKo ? '로그인' : 'Sign in'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.backButtonContainer}>
        <BackButton />
      </div>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>{isKo ? '나의 결정 기록' : 'My decision log'}</h1>
          <p className={styles.subtitle}>
            {isKo
              ? '사주·점성 분석을 한 결정과 결과를 기록해두면 다음 분석에 학습 데이터로 반영돼요.'
              : 'Track the decisions and outcomes from your readings — future readings learn from this history.'}
          </p>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        {/* 새 결정 입력 */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{isKo ? '새 결정 기록' : 'Log a new decision'}</h2>
          <form onSubmit={logDecision} className={styles.form}>
            <label className={styles.label}>
              <span>{isKo ? '분야' : 'Area'}</span>
              <select
                value={decisionType}
                onChange={(e) => setDecisionType(e.target.value as DecisionType)}
                className={styles.select}
              >
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              <span>{isKo ? '결정 내용' : 'Decision'}</span>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={
                  isKo
                    ? '예: 대기업에서 스타트업으로 이직하기로 결정'
                    : 'e.g. Decided to leave a big company for a startup'
                }
                className={styles.textarea}
                maxLength={500}
                rows={3}
              />
            </label>
            <button
              type="submit"
              disabled={submitting || !context.trim()}
              className={styles.submitBtn}
            >
              {submitting
                ? isKo
                  ? '저장 중...'
                  : 'Saving...'
                : isKo
                  ? '기록하기'
                  : 'Log decision'}
            </button>
          </form>
        </section>

        {/* 평가 대기 */}
        {pending.length > 0 && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              {isKo ? '평가 대기' : 'Awaiting review'} ({pending.length})
            </h2>
            <p className={styles.helper}>
              {isKo
                ? '3-6개월 지났어요. 어떻게 됐는지 후기를 남겨주시면 다음 분석이 더 정확해져요.'
                : "It's been 3–6 months. Tell us how it went so future readings can learn from it."}
            </p>
            <ul className={styles.list}>
              {pending.map((p) => (
                <li key={p.id} className={styles.item}>
                  <div className={styles.itemHead}>
                    <span className={styles.itemType}>
                      {TYPE_LABEL[p.decisionType] || p.decisionType}
                    </span>
                    <span className={styles.itemDate}>
                      {p.decidedAt
                        ? new Date(p.decidedAt).toLocaleDateString(isKo ? 'ko-KR' : 'en-US')
                        : ''}
                    </span>
                  </div>
                  <div className={styles.itemBody}>{p.context}</div>
                  {evaluatingId === p.id ? (
                    <div className={styles.evalForm}>
                      <select
                        value={outcome}
                        onChange={(e) => setOutcome(e.target.value as DecisionOutcome)}
                        className={styles.select}
                      >
                        <option value="good">{OUTCOME_LABEL.good}</option>
                        <option value="mixed">{OUTCOME_LABEL.mixed}</option>
                        <option value="bad">{OUTCOME_LABEL.bad}</option>
                      </select>
                      <textarea
                        placeholder={isKo ? '후기 (선택)' : 'Notes (optional)'}
                        value={outcomeNote}
                        onChange={(e) => setOutcomeNote(e.target.value)}
                        maxLength={1000}
                        rows={2}
                        className={styles.textarea}
                      />
                      <div className={styles.evalActions}>
                        <button
                          type="button"
                          onClick={() => void evaluateDecision(p.id)}
                          disabled={submitting}
                          className={styles.submitBtn}
                        >
                          {isKo ? '저장' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEvaluatingId(null)}
                          className={styles.cancelBtn}
                        >
                          {isKo ? '취소' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEvaluatingId(p.id)
                        setOutcome('good')
                        setOutcomeNote('')
                      }}
                      className={styles.evalBtn}
                    >
                      {isKo ? '후기 남기기' : 'Add review'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 전체 history */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            {isKo ? '지난 결정' : 'Past decisions'} ({history.length})
          </h2>
          {loading ? (
            <p className={styles.helper}>{isKo ? '불러오는 중...' : 'Loading...'}</p>
          ) : history.length === 0 ? (
            <p className={styles.helper}>
              {isKo
                ? '아직 기록된 결정이 없어요. 첫 결정을 위에 기록해보세요.'
                : 'No decisions logged yet. Add your first one above.'}
            </p>
          ) : (
            <ul className={styles.list}>
              {history.map((h, i) => (
                <li key={i} className={styles.item}>
                  <div className={styles.itemHead}>
                    <span className={styles.itemType}>
                      {TYPE_LABEL[h.decisionType] || h.decisionType}
                    </span>
                    {h.outcome && (
                      <span className={`${styles.itemOutcome} ${styles[`outcome_${h.outcome}`]}`}>
                        {OUTCOME_LABEL[h.outcome] || h.outcome}
                      </span>
                    )}
                  </div>
                  <div className={styles.itemBody}>{h.context}</div>
                  {h.outcomeNote && <div className={styles.itemNote}>{h.outcomeNote}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
