"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import styles from "../main-page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher/LanguageSwitcher";
import Card from "@/components/ui/Card";
import Grid from "@/components/ui/Grid";
import { SERVICE_LINKS } from "@/data/home";

const NotificationBell = dynamic(() => import("@/components/notifications/NotificationBell"), { ssr: false });
const HeaderUser = dynamic(() => import("../HeaderUser"), { ssr: false });

export default function MainHeader() {
  const { t } = useI18n();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const navItemRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setActiveMenu(null), []);

  // Close dropdown when clicking outside (for mobile)
  useEffect(() => {
    if (!activeMenu) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (navItemRef.current && !navItemRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [activeMenu, closeMenu]);

  const translate = useCallback((key: string, fallback: string) => {
    const res = t(key);
    const last = key.split(".").pop() || key;
    return res === last ? fallback : res;
  }, [t]);

  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <span className={styles.brandText}>DestinyPal</span>
      </div>
      <nav className={styles.nav}>
        <Link href="/about" className={styles.navLink}>
          {translate("common.about", "About")}
        </Link>
        <div
          ref={navItemRef}
          className={styles.navItem}
          onMouseEnter={() => setActiveMenu("services")}
          onMouseLeave={() => setActiveMenu(null)}
        >
          <button
            className={styles.navButton}
            onClick={() => setActiveMenu(activeMenu === "services" ? null : "services")}
          >
            {t("common.ourService")}
          </button>
          {activeMenu === "services" && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownTitle}>{t("services.title")}</span>
                <span className={styles.dropdownSubtitle}>{t("services.subtitle")}</span>
              </div>
              <Grid className={styles.dropdownGrid} columns={3}>
                {SERVICE_LINKS.map((s) => {
                  const content = (
                    <div className={styles.dropItemLeft}>
                      <span className={styles.dropItemIcon}>{s.icon}</span>
                      <div className={styles.dropItemText}>
                        <span className={styles.dropItemLabel}>
                          {t(`services.${s.key}.label`)}
                          {s.comingSoon && <span className={styles.comingSoonBadge}>{t("common.comingSoon")}</span>}
                        </span>
                        <span className={styles.dropItemDesc}>{t(`services.${s.key}.desc`)}</span>
                      </div>
                    </div>
                  );

                  return s.comingSoon ? (
                    <Card key={s.href} className={`${styles.dropItem} ${styles.dropItemDisabled}`}>
                      {content}
                    </Card>
                  ) : (
                    <Card as={Link} key={s.href} href={s.href} className={styles.dropItem}>
                      {content}
                    </Card>
                  );
                })}
              </Grid>
            </div>
          )}
        </div>
        <Link href="/pricing" className={styles.navLink}>
          {translate("common.pricing", "Pricing")}
        </Link>
        <Link href="/blog" className={styles.navLink}>
          {translate("common.blog", "Blog")}
        </Link>
        <Link href="/myjourney" className={styles.navLink}>
          {t("app.myJourney")}
        </Link>
        <span className={`${styles.navLink} ${styles.navLinkDisabled}`}>
          {t("app.community")}
          <span className={styles.comingSoonBadgeSmall}>{t("common.comingSoon")}</span>
        </span>
      </nav>
      <div className={styles.headerLinks}>
        <NotificationBell />
        <LanguageSwitcher />
        <HeaderUser />
      </div>
    </header>
  );
}
