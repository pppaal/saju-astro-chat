import type { IcpNarrative } from '@/lib/icp/narrative'

interface HeroProps {
  narrative: IcpNarrative['hero']
  styles: Record<string, string>
}

export default function Hero({ narrative, styles }: HeroProps) {
  return (
    <section className={styles.premiumHero} aria-labelledby="icp-hero-title">
      <p className={styles.heroEyebrow}>ICP 테스트 결과</p>
      <h1 id="icp-hero-title" className={styles.heroTitle}>
        {narrative.title}
      </h1>
      <p className={styles.heroSubtitle}>{narrative.subtitle}</p>
      <p className={styles.heroOneLiner}>{narrative.oneLiner}</p>
      <div className={styles.heroBadges}>
        <span className={styles.heroBadge}>{narrative.confidenceBadgeText}</span>
        <span className={styles.heroBadgeMuted}>신뢰도 {narrative.confidenceLevel}</span>
      </div>
    </section>
  )
}
