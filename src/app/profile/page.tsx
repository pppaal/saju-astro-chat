"use client";

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./profile.module.css";

type ActivityType = "post" | "comment" | "like" | "reading";

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: number;
  link?: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"activity" | "saved" | "stats">("activity");

  useEffect(() => {
    // Load saved posts count
    const saved = localStorage.getItem("savedPosts");
    if (saved) {
      try {
        const savedArray = JSON.parse(saved);
        setSavedCount(savedArray.length);
      } catch (e) {
        console.error("Failed to load saved posts", e);
      }
    }

    // Mock activity data - in real app, this would come from API
    const mockActivities: Activity[] = [
      {
        id: "1",
        type: "reading",
        title: "Destiny Map Reading",
        description: "Completed a full destiny map analysis",
        timestamp: Date.now() - 1000 * 60 * 30,
        link: "/destiny-map",
      },
      {
        id: "2",
        type: "post",
        title: "Shared tarot reading in Community",
        description: "Posted about today's Celtic Cross spread",
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
        link: "/community",
      },
      {
        id: "3",
        type: "reading",
        title: "Astrology Chart",
        description: "Generated natal chart analysis",
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
        link: "/astrology",
      },
      {
        id: "4",
        type: "comment",
        title: "Commented on community post",
        description: "Left feedback on fortune telling discussion",
        timestamp: Date.now() - 1000 * 60 * 60 * 48,
        link: "/community",
      },
    ];

    setActivities(mockActivities);
  }, []);

  if (status === "loading") {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading profile...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.page}>
        <div className={styles.backButtonContainer}>
          <BackButton />
        </div>
        <div className={styles.loginPrompt}>
          <h1>{t("profile.loginRequired", "Sign in to view your profile")}</h1>
          <p>{t("profile.loginDesc", "Track your readings, saved posts, and activity history")}</p>
          <button onClick={() => signIn()} className={styles.loginBtn}>
            {t("common.login", "Log in")}
          </button>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "post":
        return "📝";
      case "comment":
        return "💬";
      case "like":
        return "👍";
      case "reading":
        return "🔮";
      default:
        return "•";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.backButtonContainer}>
        <BackButton />
      </div>

      <div className={styles.container}>
        <header className={styles.profileHeader}>
          <div className={styles.profileInfo}>
            {session.user?.image && (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={100}
                height={100}
                className={styles.profileImage}
              />
            )}
            <div>
              <h1 className={styles.profileName}>{session.user?.name || "User"}</h1>
              <p className={styles.profileEmail}>{session.user?.email}</p>
            </div>
          </div>

          <div className={styles.stats}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{activities.filter(a => a.type === "reading").length}</div>
              <div className={styles.statLabel}>{t("profile.readings", "Readings")}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{activities.filter(a => a.type === "post").length}</div>
              <div className={styles.statLabel}>{t("profile.posts", "Posts")}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{savedCount}</div>
              <div className={styles.statLabel}>{t("profile.saved", "Saved")}</div>
            </div>
          </div>
        </header>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "activity" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            {t("profile.activity", "Activity")}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "saved" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("saved")}
          >
            {t("profile.savedPosts", "Saved Posts")} ({savedCount})
          </button>
          <button
            className={`${styles.tab} ${activeTab === "stats" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            {t("profile.statistics", "Statistics")}
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === "activity" && (
            <div className={styles.activityList}>
              <h2 className={styles.sectionTitle}>{t("profile.recentActivity", "Recent Activity")}</h2>
              {activities.length === 0 ? (
                <div className={styles.empty}>
                  {t("profile.noActivity", "No recent activity")}
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className={styles.activityItem}>
                    <div className={styles.activityIcon}>{getActivityIcon(activity.type)}</div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityTitle}>{activity.title}</div>
                      {activity.description && (
                        <div className={styles.activityDesc}>{activity.description}</div>
                      )}
                      <div className={styles.activityTime}>{formatTimestamp(activity.timestamp)}</div>
                    </div>
                    {activity.link && (
                      <Link href={activity.link} className={styles.activityLink}>
                        View →
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "saved" && (
            <div className={styles.savedSection}>
              <h2 className={styles.sectionTitle}>{t("profile.savedPosts", "Saved Posts")}</h2>
              <p className={styles.info}>
                {t("profile.savedInfo", "Visit the Community page to view your saved posts")}
              </p>
              <Link href="/community" className={styles.linkButton}>
                {t("profile.goToCommunity", "Go to Community")} →
              </Link>
            </div>
          )}

          {activeTab === "stats" && (
            <div className={styles.statsSection}>
              <h2 className={styles.sectionTitle}>{t("profile.detailedStats", "Detailed Statistics")}</h2>

              <div className={styles.statGrid}>
                <div className={styles.statBox}>
                  <div className={styles.statBoxLabel}>{t("profile.totalReadings", "Total Readings")}</div>
                  <div className={styles.statBoxValue}>{activities.filter(a => a.type === "reading").length}</div>
                  <div className={styles.statBoxSubtext}>
                    {t("profile.readingsDesc", "Destiny maps, tarot, and astrology")}
                  </div>
                </div>

                <div className={styles.statBox}>
                  <div className={styles.statBoxLabel}>{t("profile.communityEngagement", "Community Engagement")}</div>
                  <div className={styles.statBoxValue}>
                    {activities.filter(a => a.type === "post" || a.type === "comment").length}
                  </div>
                  <div className={styles.statBoxSubtext}>
                    {t("profile.engagementDesc", "Posts and comments")}
                  </div>
                </div>

                <div className={styles.statBox}>
                  <div className={styles.statBoxLabel}>{t("profile.memberSince", "Member Since")}</div>
                  <div className={styles.statBoxValue}>
                    {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </div>
                  <div className={styles.statBoxSubtext}>
                    {t("profile.joinDate", "Join date")}
                  </div>
                </div>
              </div>

              <div className={styles.servicesUsed}>
                <h3 className={styles.subsectionTitle}>{t("profile.servicesUsed", "Services Used")}</h3>
                <div className={styles.servicesList}>
                  <div className={styles.serviceItem}>
                    <span className={styles.serviceIcon}>🗺️</span>
                    <span className={styles.serviceName}>Destiny Map</span>
                    <span className={styles.serviceCount}>Active</span>
                  </div>
                  <div className={styles.serviceItem}>
                    <span className={styles.serviceIcon}>✦</span>
                    <span className={styles.serviceName}>Astrology</span>
                    <span className={styles.serviceCount}>Active</span>
                  </div>
                  <div className={styles.serviceItem}>
                    <span className={styles.serviceIcon}>♜</span>
                    <span className={styles.serviceName}>Tarot</span>
                    <span className={styles.serviceCount}>Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
