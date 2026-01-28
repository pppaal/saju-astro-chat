import Image from 'next/image';
import type { PersonaAnalysis } from '@/lib/persona/types';

interface HeroSectionProps {
  styles: Record<string, string>;
  analysis: PersonaAnalysis;
  avatarSrc: string | null;
  avatarError: boolean;
  setAvatarError: (v: boolean) => void;
  typeCodeBreakdown: { letter: string; meaning: string }[];
  t: (path: string, fallback?: string) => string;
}

export function HeroSection({
  styles,
  analysis,
  avatarSrc,
  avatarError,
  setAvatarError,
  typeCodeBreakdown,
  t,
}: HeroSectionProps) {
  return (
    <section className={styles.hero}>
      {/* Avatar with Aura Rings */}
      <div className={styles.avatarSection}>
        {avatarSrc && !avatarError ? (
          <div className={styles.avatarWrapper}>
            <AuraRings styles={styles} />
            <Image
              src={avatarSrc}
              alt={analysis.personaName}
              width={360}
              height={540}
              className={styles.avatar}
              unoptimized
              onError={() => setAvatarError(true)}
            />
          </div>
        ) : (
          <div className={styles.avatarWrapper}>
            <AuraRings styles={styles} />
            <div className={styles.avatarFallback} aria-label={analysis.personaName}>
              <span className={styles.avatarFallbackIcon}>&#10024;</span>
              <span className={styles.avatarFallbackCode}>{analysis.typeCode}</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.heroContent}>
        <p className={styles.preTitle}>{t('personality.yourNovaPersona', 'Your Nova Persona')}</p>
        <h1 className={styles.personaName}>{analysis.personaName}</h1>
        <p className={styles.summary}>{analysis.summary}</p>

        <div className={styles.badgesWrapper}>
          <div className={styles.badges}>
            <div className={styles.typeCodeBadge}>
              <span className={styles.typeCodeValue}>{analysis.typeCode}</span>
              <span className={styles.typeCodeLabel}>{t('personality.typeCode', 'Type Code')}</span>
            </div>
            {analysis.consistencyScore !== undefined && (
              <div className={styles.consistencyBadge}>
                <span className={styles.consistencyValue}>{analysis.consistencyScore}%</span>
                <span className={styles.consistencyLabel}>
                  {analysis.consistencyLabel
                    ? t(`personality.consistencyLabel.${analysis.consistencyLabel}`, analysis.consistencyLabel)
                    : t('personality.consistency', 'Consistency')}
                </span>
              </div>
            )}
          </div>
          {analysis.consistencyLabel && (
            <p className={styles.consistencyHint}>
              {t(`personality.consistencyDesc.${analysis.consistencyLabel}`, '')}
            </p>
          )}
        </div>

        {/* Type Code Breakdown */}
        <div className={styles.typeCodeBreakdown}>
          {typeCodeBreakdown.map((item, idx) => (
            <div key={idx} className={styles.codeLetterItem}>
              <span className={styles.codeLetter}>{item.letter}</span>
              <span className={styles.codeLetterMeaning}>{item.meaning}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AuraRings({ styles }: { styles: Record<string, string> }) {
  return (
    <div className={styles.auraRings}>
      <div className={styles.auraRing1} />
      <div className={styles.auraRing2} />
      <div className={styles.auraRing3} />
    </div>
  );
}
