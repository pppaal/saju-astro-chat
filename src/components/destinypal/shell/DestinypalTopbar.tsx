'use client'

/**
 * DestinypalTopbar — 상단 brand + 현재 tier 표시.
 * 포팅 출처: destinypal-extracted/js-ink/app.jsx (topbar block)
 *
 * data.js 의 user 객체 (birthKo · place · ilgan.hanja) 를 받아 표시.
 * 모든 텍스트는 props 로 외부 주입 — 본 컴포넌트는 dumb.
 */

import * as React from 'react'
import shellStyles from '../styles/shell.module.css'

export interface DestinypalTopbarProps {
  /** 출생 한국어 표시 — '1995년 2월 9일 06:40' (콤마/공백 변환은 부모 책임). */
  whoBirthLine: string
  /** 출생지 — '서울'. */
  place: string
  /** 본명 일간 한자 — '辛'. */
  ilganHanja: string
  /** 현재 tier 한국어 — '인생' / '1년' 등. */
  tierKo: string
  /** 현재 tier 영문 라벨 — 'LIFETIME'. */
  tierEn: string
  /** 현재 tier 스케일 라벨 — '84년' 등. */
  tierScale: string
}

export function DestinypalTopbar({
  whoBirthLine,
  place,
  ilganHanja,
  tierKo,
  tierEn,
  tierScale,
}: DestinypalTopbarProps): React.ReactElement {
  const compactBirth = whoBirthLine
    .replace('년 ', '.')
    .replace('월 ', '.')
    .replace('일', '')
  return (
    <div className={shellStyles.topbar}>
      <div className={shellStyles.brand}>
        <span className={shellStyles.seal}>命</span>
        <span className={shellStyles.mark}>
          destiny<em>pal</em>
        </span>
        <span className={shellStyles.who}>
          萬歲曆 · {compactBirth} · {place} · {ilganHanja}
        </span>
      </div>
      <div className={shellStyles.tierName}>
        <span>{tierKo}의 흐름</span>
        <b>
          {tierEn} · {tierScale}
        </b>
      </div>
    </div>
  )
}

export default DestinypalTopbar
