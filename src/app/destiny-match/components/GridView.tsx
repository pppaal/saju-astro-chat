import type { UserProfile } from '../types';

type CSSStyles = { readonly [key: string]: string };

interface GridViewProps {
  profiles: UserProfile[];
  onSelectProfile: (profile: UserProfile) => void;
  loadProfiles: () => Promise<void>;
  styles: CSSStyles;
}

export function GridView({ profiles, onSelectProfile, loadProfiles, styles }: GridViewProps) {
  if (profiles.length === 0) {
    return (
      <div className={styles.gridContainer}>
        <div className={styles.noMoreCards}>
          <div className={styles.noMoreIcon}>&#127775;</div>
          <h2>아직 매칭 상대가 없습니다</h2>
          <p>나중에 다시 확인해주세요</p>
          <button onClick={loadProfiles} className={styles.resetButton}>
            새로고침
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gridContainer}>
      {profiles.map((profile, idx) => (
        <div
          key={profile.id}
          className={styles.gridCard}
          style={{ animationDelay: `${idx * 0.1}s` }}
          onClick={() => onSelectProfile(profile)}
        >
          <div className={styles.gridPhoto}>{profile.avatar}</div>
          <div className={styles.gridInfo}>
            <h3 className={styles.gridName}>
              {profile.name}, {profile.age}
              {profile.verified && <span className={styles.verified}>&#10003;</span>}
            </h3>
            <p className={styles.gridDistance}>&#128205; {profile.distance} km</p>
            <div className={styles.gridCompatibility}>
              {profile.compatibilityEmoji} {profile.compatibility}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
