import type { UserProfile } from '../types';

type CSSStyles = { readonly [key: string]: string };

interface ProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onLike: () => Promise<void>;
  onPass: () => Promise<void>;
  styles: CSSStyles;
}

export function ProfileModal({ profile, onClose, onLike, onPass, styles }: ProfileModalProps) {
  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>
          &#10005;
        </button>

        <div className={styles.modalPhotos}>
          {profile.photos.map((photo, idx) => (
            <div key={idx} className={styles.modalPhoto}>{photo}</div>
          ))}
        </div>

        <div className={styles.modalInfo}>
          <h2 className={styles.modalName}>
            {profile.name}, {profile.age}
            {profile.verified && <span className={styles.verified}>&#10003;</span>}
          </h2>
          {profile.occupation && (
            <p className={styles.modalOccupation}>{profile.occupation}</p>
          )}

          <div className={styles.modalStats}>
            <div className={styles.modalStat}>
              <span className={styles.statLabel}>Distance</span>
              <span className={styles.statValue}>&#128205; {profile.distance} km</span>
            </div>
            <div className={styles.modalStat}>
              <span className={styles.statLabel}>Compatibility</span>
              <span className={styles.statValue}>{profile.compatibility}%</span>
            </div>
          </div>

          <div className={styles.modalSection}>
            <h3>Cosmic Profile</h3>
            <div className={styles.modalTags}>
              <span className={styles.modalTag}>{profile.zodiacSign}</span>
              <span className={styles.modalTag}>{profile.sajuElement}</span>
            </div>
            <p className={styles.modalBirthChart}>{profile.birthChart}</p>
          </div>

          <div className={styles.modalSection}>
            <h3>About</h3>
            <p className={styles.modalBio}>{profile.bio}</p>
          </div>

          <div className={styles.modalSection}>
            <h3>Interests</h3>
            <div className={styles.modalInterests}>
              {profile.interests.map(interest => (
                <span key={interest} className={styles.modalInterestTag}>
                  {interest}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              onClick={() => {
                onPass();
                onClose();
              }}
              className={`${styles.modalButton} ${styles.modalPassButton}`}
            >
              Pass
            </button>
            <button
              onClick={() => {
                onLike();
                onClose();
              }}
              className={`${styles.modalButton} ${styles.modalLikeButton}`}
            >
              &#10084;&#65039; Like
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
