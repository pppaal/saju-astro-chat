'use client'

import React, { useState, useCallback, useEffect } from 'react'

/**
 * 입력창 아래 도구(📎 파일 / 🃏 타로 / ✨ 차트) 안내 힌트.
 *
 * 노출 조건:
 *   - 첫 assistant 답변이 끝난 뒤 ~ user 턴 3회까지
 *   - localStorage 의 dismiss 키가 없을 때
 *
 * Dismiss 조건:
 *   - × 버튼 클릭
 *   - 도구 사용 (외부에서 dismissToolHint() 호출 — 파일/타로/차트 핸들러)
 *
 * localStorage key 는 같은 사용자가 두 상담사에서 한 번씩 다시 보지 않게
 * counselor-scope 로 분리.
 */

const STORAGE_PREFIX = 'destinypal:tool-hint-dismissed:'

export function useToolHint(scope: 'destiny' | 'compat') {
  const storageKey = `${STORAGE_PREFIX}${scope}`
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissed(window.localStorage.getItem(storageKey) === '1')
  }, [storageKey])

  const dismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(storageKey, '1')
      } catch {
        /* ignore quota */
      }
    }
    setDismissed(true)
  }, [storageKey])

  return { dismissed, dismiss }
}

interface ToolHintProps {
  lang: 'ko' | 'en'
  variant?: 'destiny' | 'compat'
  onDismiss: () => void
}

export function ToolHint({ lang, variant = 'destiny', onDismiss }: ToolHintProps) {
  const isKo = lang === 'ko'
  const isCompat = variant === 'compat'
  const chartLabel = isKo ? (isCompat ? '궁합 차트' : '운세 차트') : isCompat ? 'Couple chart' : 'Destiny chart'

  return (
    <div
      style={{
        marginTop: 8,
        padding: '14px 16px',
        borderRadius: 12,
        background: 'rgba(160, 122, 60, 0.06)',
        border: '1px solid rgba(160, 122, 60, 0.18)',
        fontSize: 13,
        lineHeight: 1.65,
        color: '#57534e',
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={isKo ? '닫기' : 'Dismiss'}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: 0,
          background: 'transparent',
          color: '#a8a29e',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>
      <div style={{ fontWeight: 600, color: '#44403c', marginBottom: 6 }}>
        {isKo ? '💡 도구 안내' : '💡 Tools available'}
      </div>
      <div>
        <span style={{ display: 'inline-block', minWidth: 22 }}>📎</span>
        <strong>{isKo ? ' 파일' : ' Files'}</strong>
        {isKo
          ? ' — 이력서·메모·계획서 첨부하면 본인 차트와 엮어 더 구체 조언'
          : ' — attach a resume, notes, or plan; the counselor weaves it into your chart for sharper advice'}
      </div>
      <div>
        <span style={{ display: 'inline-block', minWidth: 22 }}>🃏</span>
        <strong>{isKo ? ' 타로' : ' Tarot'}</strong>
        {isKo ? ' — 다음 질문을 카드로 보기' : ' — see your next question as cards'}
      </div>
      <div>
        <span style={{ display: 'inline-block', minWidth: 22 }}>✨</span>
        <strong>{` ${chartLabel}`}</strong>
        {isKo ? ' — 시각화로 한눈에' : ' — visualized at a glance'}
      </div>
    </div>
  )
}
