"use client";

import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.links}>
          <Link href="/policy/terms" className={styles.link}>
            Terms of Service
          </Link>
          <Link href="/policy/privacy" className={styles.link}>
            Privacy Policy
          </Link>
          <Link href="/policy/refund" className={styles.link}>
            Refund Policy
          </Link>
        </div>
        <div className={styles.copyright}>
          © {new Date().getFullYear()} DestinyPal. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
