import type { UserProfile } from '../types'

type CSSStyles = { readonly [key: string]: string }

interface GridViewProps {
  profiles: UserProfile[]
  onSelectProfile: (profile: UserProfile) => void
  loadProfiles: () => Promise<void>
  styles: CSSStyles
}

export function GridView({ profiles, onSelectProfile, loadProfiles, styles }: GridViewProps) {
  if (profiles.length === 0) {
    return (
      <div className={styles.gridContainer}>
        <div className={styles.noMoreCards}>
          <div className={styles.noMoreIcon} aria-hidden="true">
            ✨
          </div>
          <h2 className={styles.noMoreTitle}>No profiles yet</h2>
          <p className={styles.noMoreText}>Check back later for more cosmic connections</p>
          <button
            onClick={loadProfiles}
            className={styles.resetButton}
            aria-label="Refresh profiles"
          >
            <span aria-hidden="true">🔄</span> Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.gridContainer} role="list" aria-label="User profiles">
      {profiles.map((profile, idx) => (
        <article
          key={profile.id}
          className={styles.gridCard}
          style={{ animationDelay: `${idx * 0.05}s` }}
          onClick={() => onSelectProfile(profile)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelectProfile(profile)
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`View ${profile.name}'s profile`}
        >
          <div className={styles.gridPhoto}>
            {profile.avatar}
            <div className={styles.gridCompatibility} title={profile.compatibilityTagline}>
              <span aria-hidden="true">{profile.compatibilityEmoji}</span>
              <span>{profile.compatibility}%</span>
            </div>
          </div>
          <div className={styles.gridInfo}>
            <h3 className={styles.gridName}>
              {profile.name}, {profile.age}
              {profile.verified && (
                <span
                  className={styles.gridVerified}
                  title="Verified"
                  aria-label="Verified profile"
                >
                  ✓
                </span>
              )}
            </h3>
            <p className={styles.gridDetails}>
              <span aria-label="Distance">📍</span> {profile.distance} km
            </p>
            <div className={styles.gridTags}>
              <span className={styles.gridTag} title="Zodiac Sign">
                {profile.zodiacSign}
              </span>
              <span className={styles.gridTag} title="Saju Element">
                {profile.sajuElement}
              </span>
            </div>
            {profile.bio && (
              <p className={styles.gridBio}>
                {profile.bio.length > 80 ? `${profile.bio.slice(0, 80)}...` : profile.bio}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
