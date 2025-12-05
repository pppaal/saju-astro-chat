"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import styles from "./PushNotificationPrompt.module.css";

export default function PushNotificationPrompt() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Only show prompt to logged-in users who haven't dismissed it
    if (session?.user?.email) {
      const dismissed = localStorage.getItem("notification-prompt-dismissed");
      if (!dismissed) {
        // Show prompt after 3 seconds
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }
  }, [session]);

  const handleEnable = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      // Simply mark as enabled - real-time notifications work via SSE
      localStorage.setItem("notifications-enabled", "true");
      setMessage("✅ Notifications enabled! You&apos;ll receive updates in real-time.");

      setTimeout(() => {
        setShowPrompt(false);
      }, 2000);
    } catch (error) {
      console.error("Error enabling notifications:", error);
      setMessage("❌ Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("notification-prompt-dismissed", "true");
  };

  if (!showPrompt || !session?.user?.email) {
    return null;
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.prompt}>
        <button
          className={styles.closeBtn}
          onClick={handleDismiss}
          aria-label="Close"
        >
          ×
        </button>

        <div className={styles.icon}>🔔</div>

        <h3 className={styles.title}>Enable Notifications?</h3>

        <p className={styles.message}>
          Stay updated with real-time notifications about your readings,
          destiny maps, and important updates. Notifications will appear
          in your browser while you&apos;re using the app.
        </p>

        {message && <p className={styles.statusMessage}>{message}</p>}

        <div className={styles.actions}>
          <button
            className={styles.enableBtn}
            onClick={handleEnable}
            disabled={isLoading}
          >
            {isLoading ? "Enabling..." : "Enable Notifications"}
          </button>
          <button className={styles.laterBtn} onClick={handleDismiss}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
