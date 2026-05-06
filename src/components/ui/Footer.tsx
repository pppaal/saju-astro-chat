"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./Footer.module.css";

const FULL_VIEWPORT_CHAT_ROUTES = [
  "/destiny-counselor/chat",
  "/destiny-map/counselor",
  "/astrology/counselor",
];

export default function Footer() {
  const { translate } = useI18n();
  const pathname = usePathname();

  // Hide on full-viewport chat pages (Claude-style locked layout) so the
  // disclaimer/links don't appear under the chat input when the page scrolls.
  if (pathname && FULL_VIEWPORT_CHAT_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

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
        <div className={styles.disclaimer} suppressHydrationWarning>
          {translate(
            'footer.disclaimer',
            '본 서비스의 모든 해석은 사주명리·점성술 전통에 기반한 *참고 자료*이며 미래를 단정·확정하지 않습니다. 중요한 의사결정은 본인의 판단과 전문가 상담을 함께 활용하세요.'
          )}
        </div>
      </div>
    </footer>
  );
}
