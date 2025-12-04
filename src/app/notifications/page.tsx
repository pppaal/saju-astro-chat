"use client";

import { useNotifications } from "@/contexts/NotificationContext";
import { useSession } from "next-auth/react";
import { useState, useMemo } from "react";
import Link from "next/link";
import styles from "./notifications.module.css";

type FilterType = "all" | "unread" | "like" | "comment" | "reply" | "mention" | "system";

export default function NotificationsPage() {
  const { data: session } = useSession();
  const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    let list = notifications;

    if (filter === "unread") {
      list = list.filter(n => !n.read);
    } else if (filter !== "all") {
      list = list.filter(n => n.type === filter);
    }

    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [notifications, filter]);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!session) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔔</span>
          <h2>Please sign in to view notifications</h2>
          <Link href="/" className={styles.backLink}>
            Go to Home
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

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return "❤️";
      case "comment": return "💬";
      case "reply": return "↩️";
      case "mention": return "📢";
      case "system": return "🔔";
      default: return "🔔";
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>
            Notifications
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </h1>
          <div className={styles.actions}>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className={styles.actionBtn}>
                Mark all as read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} className={styles.actionBtn}>
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === "all" ? styles.active : ""}`}
            onClick={() => setFilter("all")}
          >
            All {notifications.length > 0 && `(${notifications.length})`}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "unread" ? styles.active : ""}`}
            onClick={() => setFilter("unread")}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "like" ? styles.active : ""}`}
            onClick={() => setFilter("like")}
          >
            ❤️ Likes
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "comment" ? styles.active : ""}`}
            onClick={() => setFilter("comment")}
          >
            💬 Comments
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "reply" ? styles.active : ""}`}
            onClick={() => setFilter("reply")}
          >
            ↩️ Replies
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "mention" ? styles.active : ""}`}
            onClick={() => setFilter("mention")}
          >
            📢 Mentions
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "system" ? styles.active : ""}`}
            onClick={() => setFilter("system")}
          >
            🔔 System
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
                ? "All caught up!"
                : "No notifications yet"}
            </h2>
            <p>
              {filter === "unread"
                ? "You've read all your notifications"
                : "We'll notify you when something happens"}
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
