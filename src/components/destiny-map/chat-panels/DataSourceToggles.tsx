'use client'

import React from 'react'
import type { LangKey } from '../chat-i18n'
import type { DestinySources } from '../chat-types'
import styles from './DataSourceToggles.module.css'

interface DataSourceTogglesProps {
  sources: DestinySources
  onChange: (next: DestinySources) => void
  lang: LangKey
  disabled?: boolean
}

const LABELS: Record<LangKey, { saju: string; astro: string; group: string }> = {
  ko: { saju: '사주', astro: '점성', group: '상담에 사용할 데이터' },
  en: { saju: 'Saju', astro: 'Astrology', group: 'Data used for this reading' },
}

/**
 * 운명상담사 입력창 위에 끼는 데이터 소스 체크박스 — 이번 답변에 사주/점성 중
 * 무엇을 넣을지 고른다. 둘 다 끄면 빈 컨텍스트라 의미가 없으므로, 마지막 하나는
 * 끄지 못하게 막는다(서버도 둘 다 false 면 둘 다로 폴백하지만 UI 에서 먼저 차단).
 */
export const DataSourceToggles = React.memo(function DataSourceToggles({
  sources,
  onChange,
  lang,
  disabled = false,
}: DataSourceTogglesProps) {
  const L = LABELS[lang] ?? LABELS.en
  const toggle = (key: keyof DestinySources) => {
    const next = { ...sources, [key]: !sources[key] }
    // 최소 하나는 항상 켜둔다 — 마지막 체크를 끄려 하면 무시.
    if (!next.saju && !next.astro) return
    onChange(next)
  }
  return (
    <div className={styles.toggles} role="group" aria-label={L.group}>
      <label className={styles.toggle} data-active={sources.saju || undefined}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={sources.saju}
          disabled={disabled}
          onChange={() => toggle('saju')}
        />
        <span>{L.saju}</span>
      </label>
      <label className={styles.toggle} data-active={sources.astro || undefined}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={sources.astro}
          disabled={disabled}
          onChange={() => toggle('astro')}
        />
        <span>{L.astro}</span>
      </label>
    </div>
  )
})
