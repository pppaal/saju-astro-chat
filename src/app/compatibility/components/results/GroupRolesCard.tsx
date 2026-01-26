import React from 'react';
import type { GroupAnalysisData } from '../../lib';
import styles from '../../Compatibility.module.css';

interface GroupRolesCardProps {
  groupRoles: NonNullable<GroupAnalysisData['group_roles']>;
  t: (key: string, fallback: string) => string;
}

export const GroupRolesCard: React.FC<GroupRolesCardProps> = React.memo(({ groupRoles, t }) => {
  const hasAnyRoles = Object.values(groupRoles).some(arr => arr && arr.length > 0);
  if (!hasAnyRoles) {return null;}

  return (
    <div className={styles.resultCard}>
      <div className={styles.resultCardGlow} />
      <div className={styles.resultCardHeader}>
        <span className={styles.resultCardIcon}>??</span>
        <h3 className={styles.resultCardTitle}>
          {t('compatibilityPage.groupRoles', '?? ?? ??')}
        </h3>
      </div>
      <div className={styles.resultCardContent}>
        <div className={styles.rolesGrid}>
          {groupRoles.leader && groupRoles.leader.length > 0 && (
            <div className={styles.roleItem}>
              <span className={styles.roleIcon}>??</span>
              <span className={styles.roleLabel}>???</span>
              <span className={styles.roleMembers}>{groupRoles.leader.join(', ')}</span>
            </div>
          )}
          {groupRoles.mediator && groupRoles.mediator.length > 0 && (
            <div className={styles.roleItem}>
              <span className={styles.roleIcon}>??</span>
              <span className={styles.roleLabel}>???</span>
              <span className={styles.roleMembers}>{groupRoles.mediator.join(', ')}</span>
            </div>
          )}
          {groupRoles.catalyst && groupRoles.catalyst.length > 0 && (
            <div className={styles.roleItem}>
              <span className={styles.roleIcon}>?</span>
              <span className={styles.roleLabel}>???</span>
              <span className={styles.roleMembers}>{groupRoles.catalyst.join(', ')}</span>
            </div>
          )}
          {groupRoles.stabilizer && groupRoles.stabilizer.length > 0 && (
            <div className={styles.roleItem}>
              <span className={styles.roleIcon}>???</span>
              <span className={styles.roleLabel}>???</span>
              <span className={styles.roleMembers}>{groupRoles.stabilizer.join(', ')}</span>
            </div>
          )}
          {groupRoles.creative && groupRoles.creative.length > 0 && (
            <div className={styles.roleItem}>
              <span className={styles.roleIcon}>??</span>
              <span className={styles.roleLabel}>???</span>
              <span className={styles.roleMembers}>{groupRoles.creative.join(', ')}</span>
            </div>
          )}
          {groupRoles.emotional && groupRoles.emotional.length > 0 && (
            <div className={styles.roleItem}>
              <span className={styles.roleIcon}>??</span>
              <span className={styles.roleLabel}>?? ??</span>
              <span className={styles.roleMembers}>{groupRoles.emotional.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

GroupRolesCard.displayName = 'GroupRolesCard';
