'use client'

import React from 'react'
import { repairMojibakeText } from '@/lib/text/mojibake'

/**
 * "이어서 물어보기" — LLM 의 ||FOLLOWUP|| 마커에서 파싱한 후속질문 칩들.
 *
 * 두 상담사 (운명 / 궁합) 가 동일 UI 라 공용. styles 객체로 CSS module 클래스를
 * 주입받아 각 페이지의 light/dark 톤 그대로 적용.
 *
 * 노출 조건은 호출자가 결정 (questions.length > 0 + !loading + 답변 있음 등).
 */
interface FollowUpChipsProps {
  questions: string[]
  lang: 'ko' | 'en'
  onPick: (question: string) => void
  styles: {
    followUpContainer: string
    followUpLabel: string
    followUpButtons: string
    followUpChip: string
    followUpIcon: string
  }
}

export const FollowUpChips = React.memo(function FollowUpChips({
  questions,
  lang,
  onPick,
  styles,
}: FollowUpChipsProps) {
  if (questions.length === 0) return null
  return (
    <div className={styles.followUpContainer}>
      <span className={styles.followUpLabel}>
        {lang === 'ko' ? '이어서 물어보기' : 'Continue asking'}
      </span>
      <div className={styles.followUpButtons}>
        {questions.map((q, idx) => (
          <button
            key={`${idx}-${q}`}
            type="button"
            className={styles.followUpChip}
            onClick={() => onPick(q)}
          >
            <span className={styles.followUpIcon} aria-hidden="true">
              💬
            </span>
            {repairMojibakeText(q)}
          </button>
        ))}
      </div>
    </div>
  )
})
