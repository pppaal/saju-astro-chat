import type { IcpNarrative } from '@/lib/icp/narrative'

interface AxisCardsProps {
  axes: IcpNarrative['axes']
  styles: Record<string, string>
}

export default function AxisCards({ axes, styles }: AxisCardsProps) {
  return (
    <section className={styles.axisSectionPremium} aria-labelledby="axis-heading">
      <h2 id="axis-heading" className={styles.sectionTitlePremium}>
        핵심 축 해석
      </h2>
      <div className={styles.axisCardGrid}>
        {axes.map((axis) => (
          <article key={axis.key} className={styles.axisCardPremium}>
            <header className={styles.axisCardHeader}>
              <h3>{axis.label}</h3>
              <p>
                {axis.score}점 <span>({axis.levelLabel})</span>
              </p>
            </header>
            <div className={styles.axisTrackPremium} aria-hidden="true">
              <div className={styles.axisFillPremium} style={{ width: `${axis.score}%` }} />
            </div>
            <p className={styles.axisSummary}>{axis.summary}</p>
            <p className={styles.axisBody}>{axis.meaning}</p>
            <p className={styles.axisMeta}>
              <strong>잘 쓰이는 장면:</strong> {axis.whenGood}
            </p>
            <p className={styles.axisMeta}>
              <strong>주의 장면:</strong> {axis.whenRisk}
            </p>
            <p className={styles.axisAction}>{axis.microAction}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
