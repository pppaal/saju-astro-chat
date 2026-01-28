interface Insight {
  icon: string;
  title: string;
  content: string;
}

interface InsightGridProps {
  styles: Record<string, string>;
  isKo: boolean;
  insights: Insight[];
}

export default function InsightGrid({ styles, isKo, insights }: InsightGridProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {isKo ? '통합 인사이트' : 'Combined Insights'}
      </h2>

      <div className={styles.insightGrid}>
        {insights.map((insight, index) => (
          <div
            key={index}
            className={styles.insightCard}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={styles.insightIcon}>{insight.icon}</div>
            <h3 className={styles.insightTitle}>{insight.title}</h3>
            <p className={styles.insightContent}>{insight.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
