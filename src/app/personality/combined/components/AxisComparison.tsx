import type { ICPAnalysis } from '@/lib/icp/types';
import type { PersonaAnalysis } from '@/lib/persona/types';

interface AxisItemProps {
  styles: Record<string, string>;
  label: string;
  score: number;
  leftPole: string;
  rightPole: string;
}

function AxisItem({ styles, label, score, leftPole, rightPole }: AxisItemProps) {
  return (
    <div className={styles.axisItem}>
      <div className={styles.axisLabel}>{label}</div>
      <div className={styles.axisBar}>
        <div className={styles.axisFill} style={{ width: `${score}%` }} />
      </div>
      <div className={styles.axisPoles}>
        <span>{leftPole}</span>
        <span>{rightPole}</span>
      </div>
    </div>
  );
}

interface AxisComparisonProps {
  styles: Record<string, string>;
  isKo: boolean;
  icpResult: ICPAnalysis;
  personaResult: PersonaAnalysis;
}

export default function AxisComparison({ styles, isKo, icpResult, personaResult }: AxisComparisonProps) {
  const axes = [
    {
      label: isKo ? '지배-복종 (ICP)' : 'Dominance (ICP)',
      score: icpResult.dominanceScore || 50,
      leftPole: isKo ? '복종적' : 'Submissive',
      rightPole: isKo ? '지배적' : 'Dominant',
    },
    {
      label: isKo ? '친밀-적대 (ICP)' : 'Affiliation (ICP)',
      score: icpResult.affiliationScore || 50,
      leftPole: isKo ? '냉담함' : 'Cold',
      rightPole: isKo ? '따뜻함' : 'Warm',
    },
    {
      label: isKo ? '에너지 (Persona)' : 'Energy (Persona)',
      score: personaResult.axes?.energy?.score ?? 50,
      leftPole: isKo ? '내향적' : 'Grounded',
      rightPole: isKo ? '외향적' : 'Radiant',
    },
    {
      label: isKo ? '의사결정 (Persona)' : 'Decision (Persona)',
      score: personaResult.axes?.decision?.score ?? 50,
      leftPole: isKo ? '논리적' : 'Logic',
      rightPole: isKo ? '공감적' : 'Empathic',
    },
  ];

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {isKo ? '축 비교' : 'Axis Comparison'}
      </h2>

      <div className={styles.axisGrid}>
        {axes.map((axis) => (
          <AxisItem
            key={axis.label}
            styles={styles}
            label={axis.label}
            score={axis.score}
            leftPole={axis.leftPole}
            rightPole={axis.rightPole}
          />
        ))}
      </div>
    </div>
  );
}
