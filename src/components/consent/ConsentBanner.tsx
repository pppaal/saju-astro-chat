"use client";

import { useEffect, useState } from "react";
import { useConsent } from "@/contexts/ConsentContext";
import styles from "./consentBanner.module.css";

export function ConsentBanner() {
  const { status, grant, deny } = useConsent();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(status === "pending");
  }, [status]);

  if (!visible) return null;

  return (
    <div className={styles.banner} role="dialog" aria-live="polite">
      <div className={styles.text}>
        <strong>Privacy choices</strong>
        <p>
          We use cookies and similar tech for analytics and ads. We block Google Analytics/AdSense
          until you consent.
        </p>
      </div>
      <div className={styles.actions}>
        <button className={styles.secondary} onClick={() => { deny(); setVisible(false); }}>
          Reject
        </button>
        <button className={styles.primary} onClick={() => { grant(); setVisible(false); }}>
          Accept
        </button>
      </div>
    </div>
  );
}
