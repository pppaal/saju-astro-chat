'use client'

import { useI18n } from '@/i18n/I18nProvider'
import styles from './EngineMoatBanner.module.css'

/**
 * 해자(差別點) 배너 — "AI가 찍어주는 게 아니라, 검증된 엔진이 계산한다"는
 * 단 하나의 차별점을 한눈에 전달한다. 도메인 깊이(결정론 엔진·실제 천문·
 * 사주×점성 교차검증)는 코드엔 있지만 손님 눈엔 안 보여 ChatGPT처럼 읽히던
 * 전환 킬러를 정조준. 가격표 위 + /free 허브 등 결정 지점에 배치.
 */
export default function EngineMoatBanner() {
  const { locale } = useI18n()
  const ko = locale !== 'en'

  const points = ko
    ? [
        { icon: '⚙️', title: '결정론 엔진', desc: '같은 사주는 언제 봐도 같은 판정. 그날 기분 따라 안 바뀝니다.' },
        { icon: '🔭', title: '실제 천문 계산', desc: '24절기·진태양시까지 분 단위. 별자리는 스위스 천체력 기반.' },
        { icon: '🔗', title: '사주 × 별자리 교차검증', desc: '두 체계가 서로 보강·상충하는 지점까지 코드가 짚어줍니다.' },
      ]
    : [
        { icon: '⚙️', title: 'Deterministic engine', desc: 'The same chart always yields the same reading — not mood-of-the-day output.' },
        { icon: '🔭', title: 'Real astronomy', desc: 'Solar terms & true solar time to the minute; charts from Swiss Ephemeris.' },
        { icon: '🔗', title: 'Saju × astrology cross-check', desc: 'The code surfaces where the two systems reinforce or contradict each other.' },
      ]

  return (
    <section className={styles.banner} aria-label={ko ? '왜 다른가' : 'Why this is different'}>
      <span className={styles.eyebrow}>{ko ? '왜 다를까' : 'Why this is different'}</span>
      <h2 className={styles.title}>
        {ko ? (
          <>
            AI가 찍어주는 게 아니라, <strong>엔진이 계산</strong>합니다
          </>
        ) : (
          <>
            Not an AI guessing — a <strong>verified engine computing</strong>
          </>
        )}
      </h2>
      <p className={styles.lede}>
        {ko
          ? '사주팔자·대운, 별자리 차트를 코드가 먼저 결정론적으로 판정하고, AI는 그 결과를 따뜻하고 읽기 쉽게 풀어줄 뿐입니다.'
          : 'The code computes your four-pillars, luck cycles and natal chart deterministically first — the AI only turns that judgment into warm, readable language.'}
      </p>
      <ul className={styles.points}>
        {points.map((p) => (
          <li key={p.title} className={styles.point}>
            <span className={styles.pointIcon} aria-hidden="true">
              {p.icon}
            </span>
            <span className={styles.pointText}>
              <strong className={styles.pointTitle}>{p.title}</strong>
              <span className={styles.pointDesc}>{p.desc}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
