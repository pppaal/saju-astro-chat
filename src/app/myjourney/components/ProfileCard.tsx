import Image from "next/image";
import type { Fortune, Credits } from "../types";

interface ProfileCardProps {
  styles: Record<string, string>;
  session: { user?: { name?: string | null; image?: string | null } } | null;
  credits: Credits | null;
  fortune: Fortune | null;
  fortuneLoading: boolean;
  handleCreditsClick: () => void;
  t: (key: string, fallback?: string) => string;
}

export function ProfileCard({
  styles,
  session,
  credits,
  fortune,
  fortuneLoading,
  handleCreditsClick,
  t,
}: ProfileCardProps) {
  return (
    <div className={styles.profileCard}>
      <div className={styles.profileLeft}>
        {session?.user?.image ? (
          <Image
            src={session.user.image}
            alt=""
            width={48}
            height={48}
            className={styles.profileAvatar}
          />
        ) : (
          <div className={styles.profileAvatarPlaceholder}>
            {(session?.user?.name || "U")[0].toUpperCase()}
          </div>
        )}
        <div className={styles.profileInfo}>
          <h2>{session?.user?.name || "User"}</h2>
          {credits && (
            <div className={styles.membershipRow}>
              <div className={`${styles.planBadge} ${styles[`plan${credits.plan.charAt(0).toUpperCase() + credits.plan.slice(1)}`]}`}>
                <span className={styles.planIcon}>
                  {credits.plan === 'free' ? '\uD83C\uDD93' : credits.plan === 'starter' ? '\u2B50' : credits.plan === 'pro' ? '\uD83D\uDC8E' : '\uD83D\uDC51'}
                </span>
                <span className={styles.planName}>{t(`myjourney.plan.${credits.plan}`, credits.plan.toUpperCase())}</span>
              </div>
              <div
                className={styles.creditsBadge}
                onClick={handleCreditsClick}
              >
                <span className={styles.creditsCount}>{credits.remaining}</span>
                <span className={styles.creditsLabel}>{t("myjourney.credits.short", "credits")}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Fortune Orb */}
      <div
        className={styles.fortuneOrb}
        title={t("myjourney.fortune.orbTooltip", "Today's Overall Fortune")}
        aria-label={fortune ? `${t("myjourney.fortune.orbTooltip", "Today's Overall Fortune")}: ${fortune.overall}` : undefined}
      >
        {fortuneLoading ? (
          <div className={styles.orbLoading}></div>
        ) : fortune ? (
          <>
            <span className={styles.orbScore}>{fortune.overall}</span>
            <span className={styles.orbLabel}>{t("myjourney.fortune.today", "Today")}</span>
          </>
        ) : (
          <span className={styles.orbEmpty}>?</span>
        )}
      </div>
    </div>
  );
}
