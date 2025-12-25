"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

export type NotificationType = "like" | "comment" | "reply" | "mention" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  avatar?: string;
  read: boolean;
  createdAt: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Load notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("notifications");
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load notifications", e);
      }
    }
  }, []);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  // Setup Server-Sent Events for real-time notifications
  // TODO: Enable when SSE notification system is needed
  useEffect(() => {
    // SSE disabled - uncomment below to enable real-time notifications
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }

    // // Only connect if user is authenticated
    // if (!session?.user?.email) {
    //   if (eventSource) {
    //     eventSource.close();
    //     setEventSource(null);
    //   }
    //   return;
    // }

    // // Create SSE connection
    // const es = new EventSource("/api/notifications/stream");

    // es.onmessage = (event) => {
    //   try {
    //     const notification = JSON.parse(event.data) as Notification;

    //     // Skip the initial "Connected" system message
    //     if (notification.type === "system" && notification.title === "Connected") {
    //       console.log("SSE connected successfully");
    //       return;
    //     }

    //     // Add the notification
    //     setNotifications((prev) => [notification, ...prev].slice(0, 50));

    //     // Show toast for new notifications
    //     if (!notification.read) {
    //       toast.info(notification.title, 5000);

    //       // Show browser notification
    //       if ("Notification" in window && Notification.permission === "granted") {
    //         new Notification(notification.title, {
    //           body: notification.message,
    //           icon: "/icon.png",
    //           badge: "/badge.png",
    //         });
    //       }
    //     }
    //   } catch (error) {
    //     console.error("Failed to parse SSE notification:", error);
    //   }
    // };

    // es.onerror = (error) => {
    //   console.error("SSE connection error:", error);
    //   es.close();
    // };

    // setEventSource(es);

    // // Cleanup on unmount
    // return () => {
    //   es.close();
    // };
  }, [session, toast, eventSource]);

  const addNotification = useCallback((notif: Omit<Notification, "id" | "read" | "createdAt">) => {
    const newNotification: Notification = {
      ...notif,
      id: Math.random().toString(36).substring(2, 11),
      read: false,
      createdAt: Date.now(),
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50

    // Show toast for new notifications
    toast.info(notif.title, 5000);

    // Request permission and show browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(notif.title, {
        body: notif.message,
        icon: "/icon.png",
        badge: "/badge.png",
      });
    }
  }, [toast]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

// Helper to request notification permission
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}
