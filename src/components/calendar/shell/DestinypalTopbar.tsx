'use client'

/* ============================================================
   destinypal · Topbar — 상단 brand + tier-name 표기.
   직역 출처: destinypal-extracted/js/app.jsx <div className="topbar"> 블록.
   - brand.mark: "destiny" + <em>pal</em>
   - brand.who:  생년월일·장소·일간 한 줄
   - tier-name:  현재 줌 단의 한글 + 영문·스케일
   ============================================================ */

import styles from '../styles/shell.module.css'

export interface DestinypalTopbarProps {
  whoBirthLine: string
  place: string
  ilganHanja: string
  tierKo: string
  tierEn: string
  tierScale: string
}

export function DestinypalTopbar({
  whoBirthLine,
  place,
  ilganHanja,
  tierKo,
  tierEn,
  tierScale,
}: DestinypalTopbarProps) {
  return (
    <div className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>
          destiny<em>pal</em>
        </span>
        <span className={styles.brandWho}>
          {whoBirthLine} · {place} · {ilganHanja}
        </span>
      </div>
      <div className={styles.tierName}>
        <span>{tierKo}의 흐름</span>
        <b>
          {tierEn} · {tierScale}
        </b>
      </div>
    </div>
  )
}

export default DestinypalTopbar
