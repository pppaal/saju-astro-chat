"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./Footer.module.css";

export default function Footer() {
  const { translate } = useI18n();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.links}>
          <Link href="/about" className={styles.link}>
            {translate("footer.about", "About")}
          </Link>
          <Link href="/faq" className={styles.link}>
            {translate("footer.faq", "FAQ")}
          </Link>
          <Link href="/contact" className={styles.link}>
            {translate("footer.contact", "Contact")}
          </Link>
          <Link href="/policy/terms" className={styles.link}>
            {translate("footer.terms", "Terms")}
          </Link>
          <Link href="/policy/privacy" className={styles.link}>
            {translate("footer.privacy", "Privacy")}
          </Link>
          <Link href="/policy/refund" className={styles.link}>
            {translate("footer.refund", "Refund")}
          </Link>
        </div>
        <div className={styles.copyright} suppressHydrationWarning>
          © {new Date().getFullYear()} DestinyPal. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
