/**
 * Push Notification Helper Functions
 * Handles browser push notification subscriptions and permissions
 */

import { logger } from "@/lib/logger";

// Check if push notifications are supported
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Get current notification permission
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    logger.warn("Push notifications are not supported");
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    logger.debug("Notification permission:", permission);
    return permission;
  } catch (error) {
    logger.error("Error requesting notification permission:", error);
    return "denied";
  }
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) {
    logger.warn("Service Workers are not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    logger.debug("Service Worker registered:", registration);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    logger.error("Service Worker registration failed:", error);
    return null;
  }
}

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  try {
    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error("Service Worker registration failed");
    }

    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission not granted");
    }

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push notifications
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as BufferSource,
      });

      logger.debug("Push subscription created:", subscription);
    } else {
      logger.debug("Already subscribed to push notifications");
    }

    return subscription;
  } catch (error) {
    logger.error("Error subscribing to push notifications:", error);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const successful = await subscription.unsubscribe();
      logger.debug("Push unsubscribe successful:", successful);
      return successful;
    }

    return true;
  } catch (error) {
    logger.error("Error unsubscribing from push notifications:", error);
    return false;
  }
}

// Get current push subscription
export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    logger.error("Error getting push subscription:", error);
    return null;
  }
}

// Send subscription to server
export async function sendSubscriptionToServer(
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });

    if (!response.ok) {
      throw new Error("Failed to send subscription to server");
    }

    logger.debug("Subscription sent to server");
    return true;
  } catch (error) {
    logger.error("Error sending subscription to server:", error);
    return false;
  }
}

// Show a local notification (doesn't require push)
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!isPushNotificationSupported()) {
    logger.warn("Notifications are not supported");
    return;
  }

  const permission = getNotificationPermission();
  if (permission !== "granted") {
    await requestNotificationPermission();
  }

  if (Notification.permission === "granted") {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      ...options,
    });
  }
}

// Initialize push notifications
export async function initializePushNotifications(
  vapidPublicKey: string
): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    logger.warn("Push notifications are not supported");
    return false;
  }

  try {
    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return false;
    }

    // Check current permission
    const permission = getNotificationPermission();
    if (permission === "denied") {
      logger.warn("Notification permission denied");
      return false;
    }

    // If permission is default, don't automatically request it
    // Let the user trigger it via a button
    if (permission === "default") {
      logger.debug("Notification permission not yet requested");
      return false;
    }

    // If permission is granted, subscribe to push
    if (permission === "granted") {
      const subscription = await subscribeToPushNotifications(vapidPublicKey);
      if (subscription) {
        await sendSubscriptionToServer(subscription);
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error("Error initializing push notifications:", error);
    return false;
  }
}
