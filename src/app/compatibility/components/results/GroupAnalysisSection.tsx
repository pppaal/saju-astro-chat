import React from 'react';
import { ElementDistributionCard } from './ElementDistributionCard';
import { GroupRolesCard } from './GroupRolesCard';
import { SynergyBreakdownCard } from './SynergyBreakdownCard';
import { PairwiseMatrixCard } from './PairwiseMatrixCard';
import type { GroupAnalysisData, SynergyBreakdown } from '../../lib';
import styles from '../../Compatibility.module.css';

interface GroupAnalysisSectionProps {
  groupAnalysis: GroupAnalysisData;
  synergyBreakdown?: SynergyBreakdown;
  personCount: number;
  t: (key: string, fallback: string) => string;
}

export const GroupAnalysisSection = React.memo<GroupAnalysisSectionProps>(({
  groupAnalysis,
  synergyBreakdown,
  personCount,
  t,
}) => {
  return (
    <div className={styles.groupAnalysisSection}>
      {groupAnalysis.element_distribution && (
        <ElementDistributionCard
          elementDistribution={groupAnalysis.element_distribution}
          personCount={personCount}
          t={t}
        />
      )}

      {groupAnalysis.group_roles && (
        <GroupRolesCard
          groupRoles={groupAnalysis.group_roles}
          t={t}
        />
      )}

      {synergyBreakdown && (
        <SynergyBreakdownCard
          synergyBreakdown={synergyBreakdown}
          t={t}
        />
      )}

      {groupAnalysis.pairwise_matrix && (
        <PairwiseMatrixCard
          pairwiseMatrix={groupAnalysis.pairwise_matrix}
          t={t}
        />
      )}
    </div>
  );
});

GroupAnalysisSection.displayName = 'GroupAnalysisSection';
