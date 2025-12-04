"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useNotifications } from "@/contexts/NotificationContext";
import styles from "./NotificationBell.module.css";

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
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
        return "📬";
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className={styles.overlay} onClick={() => setIsOpen(false)} />
          <div className={styles.dropdown}>
            <div className={styles.header}>
              <h3 className={styles.title}>Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className={styles.markAllBtn}>
                  Mark all as read
                </button>
              )}
            </div>

            <div className={styles.list}>
              {notifications.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>🔕</span>
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`${styles.item} ${!notif.read ? styles.unread : ""}`}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.link) {
                        setIsOpen(false);
                      }
                    }}
                  >
                    <div className={styles.itemIcon}>
                      {notif.avatar ? (
                        <Image
                          src={notif.avatar}
                          alt="Avatar"
                          width={32}
                          height={32}
                          className={styles.avatar}
                        />
                      ) : (
                        <span className={styles.defaultIcon}>
                          {getNotificationIcon(notif.type)}
                        </span>
                      )}
                    </div>

                    <div className={styles.itemContent}>
                      <div className={styles.itemTitle}>{notif.title}</div>
                      <div className={styles.itemMessage}>{notif.message}</div>
                      <div className={styles.itemTime}>{formatTime(notif.createdAt)}</div>
                    </div>

                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      aria-label="Delete notification"
                    >
                      ✕
                    </button>

                    {!notif.read && <div className={styles.unreadDot} />}
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className={styles.footer}>
                <Link href="/notifications" className={styles.viewAllLink} onClick={() => setIsOpen(false)}>
                  View all notifications
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
