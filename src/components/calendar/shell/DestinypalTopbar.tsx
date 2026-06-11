'use client'

/* ============================================================
   destinypal · Topbar — 상단 brand + tier-name 표기.
   직역 출처: destinypal-extracted/js/app.jsx <div className="topbar"> 블록.
   - brand.mark: "destiny" + <em>pal</em>
   - brand.who:  생년월일·장소·일간 한 줄
   - tier-name:  현재 줌 단의 라벨 + 영문·스케일 (locale 대응)
   ============================================================ */

import styles from '../styles/shell.module.css'
import { useI18n } from '@/i18n/I18nProvider'

export interface DestinypalTopbarProps {
  whoBirthLine: string
  place: string
  ilganHanja: string
  tierKo: string
  tierEn: string
  tierScale: string
}

// 영문 줌 단 친근 라벨 — 각 tier H1 과 결을 맞춘다.
const EN_TIER_LABEL: Record<string, string> = {
  LIFETIME: 'Lifetime',
  DECADE: 'This decade',
  YEARLY: 'This year',
  MONTHLY: 'This month',
  DAILY: 'Today',
}

// 한글 스케일("84년"/"12달"/"30일"/"24시") → 영문.
function scaleEn(s: string): string {
  return s
    .replace(/년/g, 'y')
    .replace(/달/g, 'mo')
    .replace(/일(?!간)/g, 'd')
    .replace(/시(?!간)/g, 'h')
}

export function DestinypalTopbar({
  whoBirthLine,
  place,
  ilganHanja,
  tierKo,
  tierEn,
  tierScale,
}: DestinypalTopbarProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
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
        <span>{ko ? `${tierKo}의 흐름` : (EN_TIER_LABEL[tierEn] ?? tierEn)}</span>
        <b>
          {tierEn} · {ko ? tierScale : scaleEn(tierScale)}
        </b>
      </div>
    </div>
  )
}

export default DestinypalTopbar
