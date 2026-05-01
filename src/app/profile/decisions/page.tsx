'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { logger } from '@/lib/logger'
import styles from './decisions.module.css'

type DecisionType =
  | 'career_change'
  | 'marriage'
  | 'move'
  | 'investment'
  | 'health'
  | 'other'

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

const TYPE_LABEL: Record<string, string> = {
  career_change: '커리어 전환',
  marriage: '결혼',
  move: '이주',
  investment: '투자',
  health: '건강',
  other: '기타',
}

const OUTCOME_LABEL: Record<string, string> = {
  good: '좋은 결과',
  mixed: '혼합',
  bad: '아쉬운 결과',
  pending: '평가 전',
}

export default function DecisionsPage() {
  const { data: session, status } = useSession()
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
      setError('목록을 불러올 수 없어요')
    } finally {
      setLoading(false)
    }
  }, [])

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
      setError('저장에 실패했어요')
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
      setError('평가 저장에 실패했어요')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return <div className={styles.page}><div className={styles.loading}>불러오는 중...</div></div>
  }
  if (status !== 'authenticated' || !session) {
    return (
      <div className={styles.page}>
        <div className={styles.loginPrompt}>
          <h1>결정 기록</h1>
          <p>사주·점성 분석 결정을 추적하려면 로그인이 필요해요.</p>
          <Link href={signInUrl} className={styles.loginBtn}>로그인</Link>
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
          <h1 className={styles.title}>나의 결정 기록</h1>
          <p className={styles.subtitle}>
            사주·점성 분석을 한 결정과 결과를 기록해두면 다음 분석에 학습 데이터로 반영돼요.
          </p>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        {/* 새 결정 입력 */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>새 결정 기록</h2>
          <form onSubmit={logDecision} className={styles.form}>
            <label className={styles.label}>
              <span>분야</span>
              <select
                value={decisionType}
                onChange={(e) => setDecisionType(e.target.value as DecisionType)}
                className={styles.select}
              >
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              <span>결정 내용</span>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="예: 대기업에서 스타트업으로 이직하기로 결정"
                className={styles.textarea}
                maxLength={500}
                rows={3}
              />
            </label>
            <button type="submit" disabled={submitting || !context.trim()} className={styles.submitBtn}>
              {submitting ? '저장 중...' : '기록하기'}
            </button>
          </form>
        </section>

        {/* 평가 대기 */}
        {pending.length > 0 && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>평가 대기 ({pending.length})</h2>
            <p className={styles.helper}>3-6개월 지났어요. 어떻게 됐는지 후기를 남겨주시면 다음 분석이 더 정확해져요.</p>
            <ul className={styles.list}>
              {pending.map((p) => (
                <li key={p.id} className={styles.item}>
                  <div className={styles.itemHead}>
                    <span className={styles.itemType}>{TYPE_LABEL[p.decisionType] || p.decisionType}</span>
                    <span className={styles.itemDate}>
                      {p.decidedAt ? new Date(p.decidedAt).toLocaleDateString('ko-KR') : ''}
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
                        <option value="good">좋은 결과</option>
                        <option value="mixed">혼합</option>
                        <option value="bad">아쉬운 결과</option>
                      </select>
                      <textarea
                        placeholder="후기 (선택)"
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
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => setEvaluatingId(null)}
                          className={styles.cancelBtn}
                        >
                          취소
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
                      후기 남기기
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 전체 history */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>지난 결정 ({history.length})</h2>
          {loading ? (
            <p className={styles.helper}>불러오는 중...</p>
          ) : history.length === 0 ? (
            <p className={styles.helper}>아직 기록된 결정이 없어요. 첫 결정을 위에 기록해보세요.</p>
          ) : (
            <ul className={styles.list}>
              {history.map((h, i) => (
                <li key={i} className={styles.item}>
                  <div className={styles.itemHead}>
                    <span className={styles.itemType}>{TYPE_LABEL[h.decisionType] || h.decisionType}</span>
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
