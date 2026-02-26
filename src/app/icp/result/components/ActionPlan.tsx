import type { IcpNarrative } from '@/lib/icp/narrative'

interface ActionPlanProps {
  actions: IcpNarrative['actions']
  styles: Record<string, string>
}

export default function ActionPlan({ actions, styles }: ActionPlanProps) {
  return (
    <section className={styles.actionPlanSection} aria-labelledby="action-plan-heading">
      <h2 id="action-plan-heading" className={styles.sectionTitlePremium}>
        2주 실전 플랜
      </h2>

      <div className={styles.actionColumns}>
        <article className={styles.actionCard}>
          <h3>이번 주 3가지</h3>
          <ul>
            {actions.thisWeek.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className={styles.actionCard}>
          <h3>이번 달 운영</h3>
          <ul>
            {actions.thisMonthPlan.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <article className={styles.checklistCard}>
        <h3>2주 체크리스트</h3>
        <ul className={styles.checklist}>
          {actions.twoWeekChecklist.map((item) => (
            <li key={item}>
              <span aria-hidden="true">□</span>
              {item}
            </li>
          ))}
        </ul>
      </article>
    </section>
  )
}
