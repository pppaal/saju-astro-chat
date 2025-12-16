"use client";

/* eslint-disable @next/next/no-img-element */
import { useNotifications } from "@/contexts/NotificationContext";
import { useSession } from "next-auth/react";
import { useState, useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import styles from "./notifications.module.css";

type FilterType = "all" | "unread" | "like" | "comment" | "reply" | "mention" | "system";

export default function NotificationsPage() {
  const { data: session } = useSession();
  const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const [filter, setFilter] = useState<FilterType>("all");
  const { t } = useI18n();

  const filtered = useMemo(() => {
    let list = notifications;

    if (filter === "unread") {
      list = list.filter((n) => !n.read);
    } else if (filter !== "all") {
      list = list.filter((n) => n.type === filter);
    }

    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!session) {
    return (
      <div className={styles.container}>
        <BackButton />
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔔</span>
          <h2>{t("notifications.authRequired", "Please sign in to view notifications")}</h2>
          <Link href="/" className={styles.backLink}>
            {t("common.start", "Go to Home")}
          </Link>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("notifications.time.justNow", "Just now");
    if (minutes < 60) return t("notifications.time.minutesAgo", "{{m}}m ago").replace("{{m}}", String(minutes));
    if (hours < 24) return t("notifications.time.hoursAgo", "{{h}}h ago").replace("{{h}}", String(hours));
    if (days < 7) return t("notifications.time.daysAgo", "{{d}}d ago").replace("{{d}}", String(days));
    return new Date(timestamp).toLocaleDateString();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        return "❤️";
      case "comment":
        return "💬";
      case "reply":
        return "↩️";
      case "mention":
        return "📢";
      case "system":
        return "🔔";
      default:
        return "🔔";
    }
  };

  return (
    <div className={styles.container}>
      <BackButton />
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>
            {t("notifications.title", "Notifications")}
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </h1>
          <div className={styles.actions}>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className={styles.actionBtn} type="button">
                {t("notifications.markAll", "Mark all as read")}
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} className={styles.actionBtn} type="button">
                {t("notifications.clearAll", "Clear all")}
              </button>
            )}
          </div>
        </div>

        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === "all" ? styles.active : ""}`}
            onClick={() => setFilter("all")}
            type="button"
          >
            {t("notifications.filter.all", "All")} {notifications.length > 0 && `(${notifications.length})`}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "unread" ? styles.active : ""}`}
            onClick={() => setFilter("unread")}
            type="button"
          >
            {t("notifications.filter.unread", "Unread")} {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "like" ? styles.active : ""}`}
            onClick={() => setFilter("like")}
            type="button"
          >
            ❤️ {t("notifications.filter.like", "Likes")}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "comment" ? styles.active : ""}`}
            onClick={() => setFilter("comment")}
            type="button"
          >
            💬 {t("notifications.filter.comment", "Comments")}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "reply" ? styles.active : ""}`}
            onClick={() => setFilter("reply")}
            type="button"
          >
            ↩️ {t("notifications.filter.reply", "Replies")}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "mention" ? styles.active : ""}`}
            onClick={() => setFilter("mention")}
            type="button"
          >
            📢 {t("notifications.filter.mention", "Mentions")}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "system" ? styles.active : ""}`}
            onClick={() => setFilter("system")}
            type="button"
          >
            🔔 {t("notifications.filter.system", "System")}
          </button>
        </div>
      </header>

      <main className={styles.content}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>
              {filter === "unread" ? "✅" : "🔔"}
            </span>
            <h2>
              {filter === "unread"
                ? t("notifications.empty.unreadTitle", "All caught up!")
                : t("notifications.empty.noneTitle", "No notifications yet")}
            </h2>
            <p>
              {filter === "unread"
                ? t("notifications.empty.unreadDesc", "You've read all your notifications")
                : t("notifications.empty.noneDesc", "We'll notify you when something happens")}
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((notif) => (
              <div
                key={notif.id}
                className={`${styles.item} ${!notif.read ? styles.unread : ""}`}
                onClick={() => {
                  if (!notif.read) markAsRead(notif.id);
                  if (notif.link) window.location.href = notif.link;
                }}
              >
                <div className={styles.itemIcon}>
                  {notif.avatar ? (
                    <img
                      src={notif.avatar}
                      alt=""
                      className={styles.avatar}
                    />
                  ) : (
                    <span className={styles.defaultIcon}>
                      {getIcon(notif.type)}
                    </span>
                  )}
                </div>

                <div className={styles.itemContent}>
                  <h3 className={styles.itemTitle}>{notif.title}</h3>
                  <p className={styles.itemMessage}>{notif.message}</p>
                  <span className={styles.itemTime}>
                    {formatTime(notif.createdAt)}
                  </span>
                </div>

                {!notif.read && <span className={styles.unreadDot} />}

                <button
                  className={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                  }}
                  aria-label="Delete notification"
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
