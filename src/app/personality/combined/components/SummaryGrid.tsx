import type { ICPAnalysis } from '@/lib/icp/types';
import type { PersonaAnalysis } from '@/lib/persona/types';

interface SummaryGridProps {
  styles: Record<string, string>;
  isKo: boolean;
  icpResult: ICPAnalysis;
  personaResult: PersonaAnalysis;
}

export default function SummaryGrid({ styles, isKo, icpResult, personaResult }: SummaryGridProps) {
  return (
    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryIcon}>🎭</div>
        <div className={styles.summaryLabel}>
          {isKo ? '대인관계 스타일' : 'Interpersonal Style'}
        </div>
        <div className={styles.summaryValue}>
          {isKo ? icpResult.primaryOctant.korean : icpResult.primaryOctant.name}
        </div>
        <div className={styles.summaryCode}>{icpResult.primaryStyle}</div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryIcon}>🌈</div>
        <div className={styles.summaryLabel}>
          {isKo ? '성격 유형' : 'Personality Type'}
        </div>
        <div className={styles.summaryValue}>
          {personaResult.personaName}
        </div>
        <div className={styles.summaryCode}>{personaResult.typeCode}</div>
      </div>
    </div>
  );
}
