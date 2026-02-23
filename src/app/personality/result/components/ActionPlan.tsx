import type { PersonaNarrative } from '@/lib/persona/narrative'

interface ActionPlanProps {
  actionPlan: PersonaNarrative['actionPlan']
  styles: Record<string, string>
}

export function ActionPlan({ actionPlan, styles }: ActionPlanProps) {
  return (
    <section className={styles.sectionCard} aria-labelledby="actionplan-title">
      <h2 id="actionplan-title" className={styles.sectionTitle}>
        2주 성장 플랜
      </h2>
      <article className={styles.planCard}>
        <h3>{actionPlan.today.title}</h3>
        <p className={styles.bodyText}>{actionPlan.today.task}</p>
        <p className={styles.hintText}>측정 지표: {actionPlan.today.metric}</p>
      </article>

      <article className={styles.planCard}>
        <h3>이번 주 3개</h3>
        <ul className={styles.compactList}>
          {actionPlan.thisWeek.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <article className={styles.planCard}>
        <h3>{actionPlan.twoWeekExperiment.title}</h3>
        <ul className={styles.compactList}>
          {actionPlan.twoWeekExperiment.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        <p className={styles.hintText}>측정 지표: {actionPlan.twoWeekExperiment.metric}</p>
      </article>
    </section>
  )
}
