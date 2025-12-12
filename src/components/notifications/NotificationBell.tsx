"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useNotifications } from "@/contexts/NotificationContext";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./NotificationBell.module.css";

const ICON_MAP: Record<string, string> = {
  like: "❤️",
  comment: "💬",
  reply: "↩",
  mention: "@",
  system: "⚙️",
  default: "🔔",
};

const formatTime = (timestamp: number, t: (path: string, fb?: string) => string) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return t("notifications.time.justNow", "Just now");
  if (minutes < 60) return t("notifications.time.minutesAgo", "{{m}}m ago").replace("{{m}}", String(minutes));
  if (hours < 24) return t("notifications.time.hoursAgo", "{{h}}h ago").replace("{{h}}", String(hours));
  return t("notifications.time.daysAgo", "{{d}}d ago").replace("{{d}}", String(days));
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  const getNotificationIcon = (type: string) => ICON_MAP[type] ?? ICON_MAP.default;

  return (
    <div className={styles.container}>
      <button
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("notifications.title", "Notifications")}
        type="button"
      >
        {ICON_MAP.default}
        {unreadCount > 0 && (
          <span className={styles.badge} aria-live="polite">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className={styles.overlay} onClick={() => setIsOpen(false)} />
          <div className={styles.dropdown} role="list">
            <div className={styles.header}>
              <h3 className={styles.title}>{t("notifications.title", "Notifications")}</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className={styles.markAllBtn} type="button">
                  {t("notifications.markAll", "Mark all as read")}
                </button>
              )}
            </div>

            <div className={styles.list}>
              {notifications.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>☕</span>
                  <p>{t("notifications.empty.noneTitle", "No notifications yet")}</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`${styles.item} ${!notif.read ? styles.unread : ""}`}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.link) setIsOpen(false);
                    }}
                    role="listitem"
                  >
                    <div className={styles.itemIcon} aria-hidden="true">
                      {notif.avatar ? (
                        <Image
                          src={notif.avatar}
                          alt="Avatar"
                          width={32}
                          height={32}
                          className={styles.avatar}
                        />
                      ) : (
                        <span className={styles.defaultIcon}>{getNotificationIcon(notif.type)}</span>
                      )}
                    </div>

                    <div className={styles.itemContent}>
                      <div className={styles.itemTitle}>{notif.title}</div>
                      <div className={styles.itemMessage}>{notif.message}</div>
                      <div className={styles.itemTime}>{formatTime(notif.createdAt, t)}</div>
                    </div>

                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      aria-label={t("notifications.clearOne", "Delete notification")}
                      type="button"
                    >
                      ✕
                    </button>

                    {!notif.read && <div className={styles.unreadDot} aria-hidden="true" />}
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className={styles.footer}>
                <Link href="/notifications" className={styles.viewAllLink} onClick={() => setIsOpen(false)}>
                  {t("notifications.title", "Notifications")}
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
