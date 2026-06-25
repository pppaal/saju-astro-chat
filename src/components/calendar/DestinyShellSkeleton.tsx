/**
 * DestinyShellSkeleton — 운흐름(/calendar, 월/일) · 인생 흐름(/destiny,
 * 인생·10년·1년) 셸의 로딩 스켈레톤. 서버 컴포넌트가 Swiss Ephemeris +
 * 사주/점성 빌드를 동기로 수행해 cold 진입이 느릴 수 있으므로, loading.tsx
 * 가 이 스켈레톤을 Suspense fallback 으로 띄워 레이아웃을 미리 잡아준다.
 *
 * 순수 표현용(CSS 애니메이션, JS 없음) — 'use client' 불필요. 셸의 파치먼트
 * 라이트 테마(--dp-bg #ece2cd)에 맞춰 흰 깜빡임 없이 자연스럽게 이어진다.
 */

import styles from './DestinyShellSkeleton.module.css'

export default function DestinyShellSkeleton() {
  return (
    <div className={styles.wrap} role="status" aria-label="Loading" aria-busy="true">
      <div className={styles.inner}>
        {/* 상단 바 */}
        <div className={styles.topbar}>
          <div className={`${styles.logo} ${styles.sk}`} />
          <div className={styles.topbarLines}>
            <div className={styles.sk} style={{ height: 12, width: '46%', borderRadius: 8 }} />
            <div className={styles.sk} style={{ height: 10, width: '28%', borderRadius: 8 }} />
          </div>
          <div className={`${styles.sk} ${styles.bar}`} style={{ height: 28, width: 84 }} />
        </div>

        {/* 히어로 티어 카드 */}
        <div className={`${styles.card} ${styles.hero}`}>
          <div className={styles.sk} style={{ height: 16, width: '38%', borderRadius: 8 }} />
          <div className={styles.sk} style={{ height: 12, width: '72%', borderRadius: 8 }} />
          <div className={styles.sk} style={{ height: 12, width: '64%', borderRadius: 8 }} />
          <div
            className={styles.sk}
            style={{ height: 96, width: '100%', borderRadius: 14, marginTop: 4 }}
          />
        </div>

        {/* 하위 티어 카드들 */}
        {[0, 1].map((i) => (
          <div key={i} className={`${styles.card} ${styles.row}`}>
            <div className={styles.sk} style={{ height: 14, width: '30%', borderRadius: 8 }} />
            <div className={styles.sk} style={{ height: 11, width: '80%', borderRadius: 8 }} />
            <div className={styles.sk} style={{ height: 11, width: '56%', borderRadius: 8 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
