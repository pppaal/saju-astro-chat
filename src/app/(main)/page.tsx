"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import styles from "./main-page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import { ChatDemoSection } from "@/components/home/ChatDemoSection";
import { formatNumber } from "@/utils/numberFormat";
import { ParticleCanvas, MainHeader, TarotSection } from "./components";

const WeeklyFortuneCard = dynamic(() => import("@/components/WeeklyFortuneCard"), {
  loading: () => <div className={styles.weeklyCardSkeleton} />,
});

// Custom hook for typing animation
function useTypingAnimation(
  placeholders: string[],
  setPlaceholder: Dispatch<SetStateAction<string>>
) {
  useEffect(() => {
    let currentIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    const type = () => {
      const currentText = placeholders[currentIndex];

      if (isDeleting) {
        setPlaceholder(currentText.substring(0, charIndex - 1));
        charIndex--;

        if (charIndex === 0) {
          isDeleting = false;
          currentIndex = (currentIndex + 1) % placeholders.length;
          timeoutId = setTimeout(type, 500);
        } else {
          timeoutId = setTimeout(type, 30);
        }
      } else {
        setPlaceholder(currentText.substring(0, charIndex + 1));
        charIndex++;

        if (charIndex === currentText.length) {
          isDeleting = true;
          timeoutId = setTimeout(type, 2000);
        } else {
          timeoutId = setTimeout(type, 80);
        }
      }
    };

    timeoutId = setTimeout(type, 1000);
    return () => clearTimeout(timeoutId);
  }, [placeholders, setPlaceholder]);
}

// Custom hook for scroll visibility
function useScrollVisibility(threshold: number) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return visible;
}

// Custom hook for click outside
function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  callback: () => void
) {
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback]);
}

// Custom hook for intersection observer
function useScrollAnimation(selector: string, styles: Record<string, string>) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -100px 0px" }
    );

    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => observer.observe(el));

    return () => elements.forEach((el) => observer.unobserve(el));
  }, [selector, styles]);
}

// Custom hook for visitor stats
function useVisitorStats(metricsToken: string | undefined) {
  const [stats, setStats] = useState<{
    todayVisitors: number | null;
    totalVisitors: number | null;
    totalMembers: number | null;
    error: string | null;
  }>({
    todayVisitors: null,
    totalVisitors: null,
    totalMembers: null,
    error: null,
  });
  const trackedOnce = useRef(false);

  useEffect(() => {
    if (trackedOnce.current) {
      return;
    }
    trackedOnce.current = true;

    const headers: HeadersInit = {};
    if (metricsToken) {
      headers["x-metrics-token"] = metricsToken;
    }

    async function run() {
      try {
        fetch("/api/visitors-today", { method: "POST", headers }).catch(() => {});

        const [visitorRes, statsRes] = await Promise.all([
          fetch("/api/visitors-today", { headers }),
          fetch("/api/stats")
        ]);

        const newStats = { ...stats };

        if (visitorRes.ok) {
          const data = await visitorRes.json();
          newStats.todayVisitors = typeof data.count === "number" ? data.count : 0;
          newStats.totalVisitors = typeof data.total === "number" ? data.total : 0;
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          newStats.totalMembers = typeof statsData.users === "number" ? statsData.users : 0;
        }

        setStats(newStats);
      } catch {
        setStats((prev) => ({ ...prev, error: "Could not load stats." }));
      }
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsToken]);

  return stats;
}

// Service options constant (outside component to prevent recreation)
const SERVICE_OPTIONS = [
  { key: 'destinyMap', labelKey: 'menu.destinyMap', icon: '🗺️', path: '/destiny-map' },
  { key: 'aiReports', labelKey: 'menu.aiReports', icon: '🤖', path: '/premium-reports' },
  { key: 'lifePrediction', labelKey: 'menu.lifePrediction', icon: '📈', path: '/life-prediction' },
  { key: 'tarot', labelKey: 'menu.tarot', icon: '🔮', path: '/tarot' },
  { key: 'calendar', labelKey: 'menu.calendar', icon: '🗓️', path: '/calendar' },
  { key: 'dream', labelKey: 'menu.dream', icon: '🌙', path: '/dream' },
  { key: 'personality', labelKey: 'menu.personality', icon: '🌈', path: '/personality' },
  { key: 'icp', labelKey: 'menu.icp', icon: '🎭', path: '/icp' },
  { key: 'numerology', labelKey: 'menu.numerology', icon: '🔢', path: '/numerology' },
  { key: 'astrology', labelKey: 'menu.astrology', icon: '✨', path: '/astrology' },
  { key: 'saju', labelKey: 'menu.saju', icon: '☯️', path: '/saju' },
  { key: 'compatibility', labelKey: 'menu.compatibility', icon: '💕', path: '/compatibility' },
  { key: 'pastLife', labelKey: 'menu.pastLife', icon: '🔄', path: '/past-life' },
  { key: 'iching', labelKey: 'menu.iching', icon: '📜', path: '/iching' },
] as const;

// Zodiac signs constant
const ZODIAC_SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'] as const;

export default function MainPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const translate = useCallback((key: string, fallback: string) => {
    const res = t(key);
    const last = key.split(".").pop() || key;
    return res === last ? fallback : res;
  }, [t]);

  const [lifeQuestion, setLifeQuestion] = useState("");
  const [typingPlaceholder, setTypingPlaceholder] = useState("");
  const [showServiceSelector, setShowServiceSelector] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [servicePage, setServicePage] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const servicePageSize = 7;
  const servicePageCount = Math.max(1, Math.ceil(SERVICE_OPTIONS.length / servicePageSize));
  const maxServicePage = servicePageCount - 1;

  const metricsToken = process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN;

  // Memoized placeholders for typing animation
  const placeholders = useMemo(() => [
    translate("landing.hint1", "오늘의 운세가 궁금해요"),
    translate("landing.hint2", "연애운이 어떨까요?"),
    translate("landing.hint3", "이직해도 될까요?"),
    translate("landing.searchPlaceholder", "오늘 무엇이 궁금하세요?"),
  ], [translate]);

  // Custom hooks
  useTypingAnimation(placeholders, setTypingPlaceholder);
  useScrollAnimation(`.${styles.featureSection}`, styles);
  const showScrollTop = useScrollVisibility(500);
  const closeServiceSelector = useCallback(() => {
    setShowServiceSelector(false);
    setServicePage(0);
  }, []);
  useClickOutside(searchContainerRef, closeServiceSelector);

  // Visitor stats
  const { todayVisitors, totalVisitors, totalMembers, error: visitorError } = useVisitorStats(metricsToken);

  useEffect(() => {
    if (servicePage > maxServicePage) {
      setServicePage(maxServicePage);
    }
  }, [servicePage, maxServicePage]);

  // Handle question submission - navigate to selected service with the question
  const handleQuestionSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const service = SERVICE_OPTIONS.find(s => s.key === selectedService) || SERVICE_OPTIONS[0];
    if (lifeQuestion.trim()) {
      router.push(`${service.path}?q=${encodeURIComponent(lifeQuestion.trim())}`);
    } else {
      router.push(service.path);
    }
    setShowServiceSelector(false);
  }, [lifeQuestion, router, selectedService]);

  // Handle service selection
  const handleServiceSelect = useCallback((serviceKey: string) => {
    setSelectedService(serviceKey);
    setShowServiceSelector(false);
  }, []);

  const handleHintClick = useCallback((hint: string) => {
    setLifeQuestion(hint);
    const service = SERVICE_OPTIONS.find(s => s.key === selectedService) || SERVICE_OPTIONS[0];
    router.push(`${service.path}?q=${encodeURIComponent(hint)}`);
  }, [router, selectedService]);

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <main className={styles.container}>
      <ParticleCanvas />
      <MainHeader />

      {/* Fullscreen Hero Section */}
      <section className={styles.fullscreenHero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            {translate("landing.heroTitle", "Know yourself. Shape tomorrow.")}
          </h1>
          <p className={styles.heroSub}>
            {translate(
              "landing.heroSub",
              "Where destiny, psychology, and spirituality meet"
            )}
          </p>

          {/* Google-style Question Search Box */}
          <div className={styles.questionSearchContainer} ref={searchContainerRef}>
            <form onSubmit={handleQuestionSubmit} className={styles.questionSearchForm}>
              <div className={styles.questionSearchWrapper}>
                {/* Service Selector Button */}
                <button
                  type="button"
                  className={styles.serviceSelectBtn}
                  onClick={() => setShowServiceSelector(!showServiceSelector)}
                  title={translate("landing.selectService", "서비스 선택")}
                >
                  <span className={styles.serviceSelectIcon}>
                    {SERVICE_OPTIONS.find(s => s.key === selectedService)?.icon || '🌟'}
                  </span>
                  <span className={styles.serviceSelectArrow}>▼</span>
                </button>

                {/* Service Dropdown - Paginated (7 per page) */}
                {showServiceSelector && (
                  <div className={styles.serviceDropdown}>
                    <div className={styles.serviceDropdownGrid}>
                      {SERVICE_OPTIONS.slice(servicePage * servicePageSize, (servicePage + 1) * servicePageSize).map((service) => (
                        <button
                          key={service.key}
                          type="button"
                          className={`${styles.serviceDropdownItem} ${selectedService === service.key ? styles.selected : ''}`}
                          onClick={() => handleServiceSelect(service.key)}
                        >
                          <span className={styles.serviceDropdownIcon}>{service.icon}</span>
                          <span className={styles.serviceDropdownLabel}>{t(`menu.${service.key}`)}</span>
                        </button>
                      ))}
                    </div>

                    {/* Page navigation */}
                    {servicePageCount > 1 && (
                      <div className={styles.serviceDropdownNav}>
                        <button
                          type="button"
                          className={`${styles.serviceDropdownNavBtn} ${servicePage === 0 ? styles.disabled : ''}`}
                          onClick={() => setServicePage((prev) => Math.max(0, prev - 1))}
                          disabled={servicePage === 0}
                          aria-label="Previous page"
                        >
                          ‹
                        </button>
                        <div className={styles.serviceDropdownDots}>
                          {Array.from({ length: servicePageCount }).map((_, idx) => (
                            <span
                              key={`service-dot-${idx}`}
                              className={`${styles.serviceDropdownDot} ${servicePage === idx ? styles.active : ''}`}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          className={`${styles.serviceDropdownNavBtn} ${servicePage === maxServicePage ? styles.disabled : ''}`}
                          onClick={() => setServicePage((prev) => Math.min(maxServicePage, prev + 1))}
                          disabled={servicePage === maxServicePage}
                          aria-label="Next page"
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <label htmlFor="destiny-question" className={styles.srOnly}>
                  {translate("landing.searchPlaceholder", "오늘 무엇이 궁금하세요?")}
                </label>
                <input
                  id="destiny-question"
                  type="text"
                  className={styles.questionSearchInput}
                  placeholder={typingPlaceholder || translate("landing.searchPlaceholder", "오늘 무엇이 궁금하세요?")}
                  value={lifeQuestion}
                  onChange={(e) => setLifeQuestion(e.target.value)}
                  onFocus={() => setShowServiceSelector(false)}
                  autoComplete="off"
                />
                <button type="submit" className={styles.questionSearchBtn} aria-label="Search">
                  &#10148;
                </button>
              </div>
              <div className={styles.questionHints}>
                <button
                  type="button"
                  className={styles.questionHint}
                  onClick={() => handleHintClick(translate("landing.hint1", "오늘의 운세가 궁금해요"))}
                >
                  {translate("landing.hint1", "오늘의 운세가 궁금해요")}
                </button>
                <button
                  type="button"
                  className={styles.questionHint}
                  onClick={() => handleHintClick(translate("landing.hint2", "연애운이 어떨까요?"))}
                >
                  {translate("landing.hint2", "연애운이 어떨까요?")}
                </button>
                <button
                  type="button"
                  className={styles.questionHint}
                  onClick={() => handleHintClick(translate("landing.hint3", "이직해도 될까요?"))}
                >
                  {translate("landing.hint3", "이직해도 될까요?")}
                </button>
              </div>
            </form>

            {/* AI Routing Guide */}
            <div className={styles.aiRoutingGuide}>
              <p className={styles.aiRoutingText}>
                <span className={styles.aiRoutingIcon}>💡</span>
                {translate("landing.aiRoutingText", "서비스를 선택하거나 바로 질문하세요")}
              </p>
              <div className={styles.serviceIconsRow}>
                {SERVICE_OPTIONS.map((service) => (
                  <button
                    key={service.key}
                    type="button"
                    className={`${styles.serviceIcon} ${selectedService === service.key ? styles.serviceIconActive : ''}`}
                    title={t(`menu.${service.key}`)}
                    onClick={() => handleServiceSelect(service.key)}
                  >
                    {service.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className={styles.scrollIndicator}>
          <span className={styles.scrollText}>{translate("landing.scrollDown", "스크롤하여 더보기")}</span>
          <div className={styles.scrollArrow}>
            <span>↓</span>
          </div>
        </div>
      </section>

      {/* Stats Section - Below Hero */}
      <section className={styles.statsSection}>
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>👁️</span>
            <p className={styles.statLabel}>
              {translate("landing.statsToday", "Today")}
            </p>
            <p className={styles.statValue}>
              {todayVisitors === null ? (
                <span className={styles.statSkeleton}>...</span>
              ) : (
                formatNumber(todayVisitors)
              )}
            </p>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>🌟</span>
            <p className={styles.statLabel}>
              {translate("landing.statsTotal", "Total Visitors")}
            </p>
            <p className={styles.statValue}>
              {totalVisitors === null ? (
                <span className={styles.statSkeleton}>...</span>
              ) : (
                formatNumber(totalVisitors)
              )}
            </p>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>✨</span>
            <p className={styles.statLabel}>
              {translate("landing.statsMembers", "Members")}
            </p>
            <p className={styles.statValue}>
              {totalMembers === null ? (
                <span className={styles.statSkeleton}>...</span>
              ) : (
                formatNumber(totalMembers)
              )}
            </p>
          </div>
          <div className={styles.statFootnote}>
            {visitorError ?? translate("landing.statsFootnote", "Live stats")}
          </div>
        </div>
      </section>

      {/* Weekly Fortune Card */}
      <section className={styles.weeklyFortuneSection}>
        <WeeklyFortuneCard />
      </section>

      {/* AI Chat Demo Section */}
      <ChatDemoSection translate={translate} />

      {/* Astrology Feature Section */}
      <section className={styles.featureSection}>
        <h2 className={styles.featureSectionTitle}>
          {translate("landing.astrologySectionTitle", "오늘의 당신, 점성학적으로")}
        </h2>
        <p className={styles.featureSectionSubtitle}>
          {translate("landing.astrologySectionSubtitle", "행성의 배치가 당신의 운명에 어떤 영향을 미치는지 실시간으로 확인하세요")}
        </p>
        <div className={styles.astrologyChart}>
          {/* Zodiac Circle with 12 signs */}
          <div className={styles.zodiacCircle}>
            {ZODIAC_SIGNS.map((sign, i) => (
              <div
                key={sign}
                className={styles.zodiacSign}
                style={{ transform: `rotate(${i * 30}deg) translateY(-180px)` }}
              >
                {sign}
              </div>
            ))}
          </div>
          {/* Stars background */}
          <div className={styles.stars}>
            {[...Array(20)].map((_, i) => {
              // Use index to generate consistent positions
              const seed = i * 137.508; // Golden angle
              const left = (seed % 100);
              const top = ((seed * 1.618) % 100);
              const delay = ((i * 0.15) % 3);

              return (
                <div
                  key={i}
                  className={styles.star}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    animationDelay: `${delay}s`
                  }}
                >✦</div>
              );
            })}
          </div>
          {/* Planets */}
          <div className={`${styles.planet} ${styles.planetSun}`}>☉</div>
          <div className={`${styles.planet} ${styles.planetMoon}`}>☽</div>
          <div className={`${styles.planet} ${styles.planetMercury}`}>☿</div>
          <div className={`${styles.planet} ${styles.planetVenus}`}>♀</div>
          <div className={`${styles.planet} ${styles.planetMars}`}>♂</div>
          <div className={`${styles.planet} ${styles.planetJupiter}`}>♃</div>
          <div className={`${styles.planet} ${styles.planetSaturn}`}>♄</div>
        </div>
        <div className={styles.astrologyInfo}>
          <p><strong>{translate("landing.ascendant", "Ascendant")}:</strong> {translate("landing.aquarius", "Aquarius")} ♒ | <strong>{translate("landing.sun", "Sun")}:</strong> {translate("landing.scorpio", "Scorpio")} ♏ | <strong>{translate("landing.moon", "Moon")}:</strong> {translate("landing.pisces", "Pisces")} ♓</p>
          <p>{translate("landing.todayMessage", "Today is a favorable day for new beginnings. Creativity will shine.")}</p>
        </div>
      </section>

      {/* Saju Feature Section */}
      <section className={styles.featureSection}>
        <h2 className={styles.featureSectionTitle}>
          {translate("landing.sajuSectionTitle", "사주로 보는 오행 밸런스")}
        </h2>
        <p className={styles.featureSectionSubtitle}>
          {translate("landing.sajuSectionSubtitle", "당신의 오행 에너지 분포를 확인하고 균형을 맞추세요")}
        </p>
        {/* Four Pillars */}
        <div className={styles.sajuPillars}>
          <div className={styles.pillar}>
            <div className={styles.pillarLabel}>{translate("landing.hourPillar", "時柱")}</div>
            <div className={styles.pillarChar}>
              <div className={styles.stem} style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(34, 197, 94, 0.5)' }}>
                <span className={styles.elementIcon}>🌳</span>
                <span className={styles.charMain}>甲</span>
                <span className={styles.charTranslation}>{translate("landing.elementWoodEn", "Wood")}</span>
              </div>
              <div className={styles.branch} style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 0.5)' }}>
                <span className={styles.elementIcon}>💧</span>
                <span className={styles.charMain}>子</span>
                <span className={styles.charTranslation}>{translate("landing.elementWaterEn", "Water")}</span>
              </div>
            </div>
          </div>
          <div className={styles.pillar}>
            <div className={styles.pillarLabel}>{translate("landing.dayPillar", "日柱")}</div>
            <div className={styles.pillarChar}>
              <div className={styles.stem} style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.5)' }}>
                <span className={styles.elementIcon}>🔥</span>
                <span className={styles.charMain}>丙</span>
                <span className={styles.charTranslation}>{translate("landing.elementFireEn", "Fire")}</span>
              </div>
              <div className={styles.branch} style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(34, 197, 94, 0.5)' }}>
                <span className={styles.elementIcon}>🌳</span>
                <span className={styles.charMain}>寅</span>
                <span className={styles.charTranslation}>{translate("landing.elementWoodEn", "Wood")}</span>
              </div>
            </div>
          </div>
          <div className={styles.pillar}>
            <div className={styles.pillarLabel}>{translate("landing.monthPillar", "月柱")}</div>
            <div className={styles.pillarChar}>
              <div className={styles.stem} style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', borderColor: 'rgba(234, 179, 8, 0.5)' }}>
                <span className={styles.elementIcon}>🏔️</span>
                <span className={styles.charMain}>戊</span>
                <span className={styles.charTranslation}>{translate("landing.elementEarthEn", "Earth")}</span>
              </div>
              <div className={styles.branch} style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.5)' }}>
                <span className={styles.elementIcon}>🔥</span>
                <span className={styles.charMain}>午</span>
                <span className={styles.charTranslation}>{translate("landing.elementFireEn", "Fire")}</span>
              </div>
            </div>
          </div>
          <div className={styles.pillar}>
            <div className={styles.pillarLabel}>{translate("landing.yearPillar", "年柱")}</div>
            <div className={styles.pillarChar}>
              <div className={styles.stem} style={{ backgroundColor: 'rgba(229, 229, 229, 0.2)', borderColor: 'rgba(229, 229, 229, 0.5)' }}>
                <span className={styles.elementIcon}>⚔️</span>
                <span className={styles.charMain}>庚</span>
                <span className={styles.charTranslation}>{translate("landing.elementMetalEn", "Metal")}</span>
              </div>
              <div className={styles.branch} style={{ backgroundColor: 'rgba(229, 229, 229, 0.2)', borderColor: 'rgba(229, 229, 229, 0.5)' }}>
                <span className={styles.elementIcon}>⚔️</span>
                <span className={styles.charMain}>申</span>
                <span className={styles.charTranslation}>{translate("landing.elementMetalEn", "Metal")}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Luck Cycle Timeline */}
        <div className={styles.luckTimeline}>
          <div className={styles.timelineLabel}>{translate("landing.greatFortune", "대운 (大運)")}</div>
          <div className={styles.timelineTrack}>
            <div className={styles.luckPeriod}>
              <span className={styles.luckAge}>8-17{translate("landing.ageUnit", "세")}</span>
              <div className={styles.luckChars}>
                <span>己未</span>
                <span className={styles.luckTranslation}>{translate("landing.elementCombo.earthEarth", "Earth-Earth")}</span>
              </div>
            </div>
            <div className={styles.luckPeriod}>
              <span className={styles.luckAge}>18-27{translate("landing.ageUnit", "세")}</span>
              <div className={styles.luckChars}>
                <span>庚申</span>
                <span className={styles.luckTranslation}>{translate("landing.elementCombo.metalMetal", "Metal-Metal")}</span>
              </div>
            </div>
            <div className={`${styles.luckPeriod} ${styles.active}`}>
              <span className={styles.luckAge}>28-37{translate("landing.ageUnit", "세")}</span>
              <div className={styles.luckChars}>
                <span>辛酉</span>
                <span className={styles.luckTranslation}>{translate("landing.elementCombo.metalMetal", "Metal-Metal")}</span>
              </div>
            </div>
            <div className={styles.luckPeriod}>
              <span className={styles.luckAge}>38-47{translate("landing.ageUnit", "세")}</span>
              <div className={styles.luckChars}>
                <span>壬戌</span>
                <span className={styles.luckTranslation}>{translate("landing.elementCombo.waterEarth", "Water-Earth")}</span>
              </div>
            </div>
            <div className={styles.luckPeriod}>
              <span className={styles.luckAge}>48-57{translate("landing.ageUnit", "세")}</span>
              <div className={styles.luckChars}>
                <span>癸亥</span>
                <span className={styles.luckTranslation}>{translate("landing.elementCombo.waterWater", "Water-Water")}</span>
              </div>
            </div>
            <div className={styles.luckPeriod}>
              <span className={styles.luckAge}>58-67{translate("landing.ageUnit", "세")}</span>
              <div className={styles.luckChars}>
                <span>甲子</span>
                <span className={styles.luckTranslation}>{translate("landing.elementCombo.woodWater", "Wood-Water")}</span>
              </div>
            </div>
            <div className={styles.luckPeriod}>
              <span className={styles.luckAge}>68-77{translate("landing.ageUnit", "세")}</span>
              <div className={styles.luckChars}>
                <span>乙丑</span>
                <span className={styles.luckTranslation}>{translate("landing.elementCombo.woodEarth", "Wood-Earth")}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Five Elements */}
        <div className={styles.sajuContainer}>
          <div className={styles.elementBar}>
            <div className={styles.elementName}>🌳 {translate("landing.elementWood", "목")}</div>
            <div className={styles.elementProgress}>
              <div className={`${styles.elementFill} ${styles.elementWood}`} style={{width: '75%'}} />
            </div>
          </div>
          <div className={styles.elementBar}>
            <div className={styles.elementName}>🔥 {translate("landing.elementFire", "화")}</div>
            <div className={styles.elementProgress}>
              <div className={`${styles.elementFill} ${styles.elementFire}`} style={{width: '60%'}} />
            </div>
          </div>
          <div className={styles.elementBar}>
            <div className={styles.elementName}>🏔️ {translate("landing.elementEarth", "토")}</div>
            <div className={styles.elementProgress}>
              <div className={`${styles.elementFill} ${styles.elementEarth}`} style={{width: '45%'}} />
            </div>
          </div>
          <div className={styles.elementBar}>
            <div className={styles.elementName}>⚪ {translate("landing.elementMetal", "금")}</div>
            <div className={styles.elementProgress}>
              <div className={`${styles.elementFill} ${styles.elementMetal}`} style={{width: '85%'}} />
            </div>
          </div>
          <div className={styles.elementBar}>
            <div className={styles.elementName}>💧 {translate("landing.elementWater", "수")}</div>
            <div className={styles.elementProgress}>
              <div className={`${styles.elementFill} ${styles.elementWater}`} style={{width: '90%'}} />
            </div>
          </div>
        </div>
        {/* Shinsal (Lucky Stars) Section */}
        <div className={styles.shinsalContainer}>
          <div className={styles.shinsalCard}>
            <div className={styles.shinsalIcon}>✨</div>
            <div className={styles.shinsalName}>{translate("landing.shinsal.heavenlyNoble", "Heavenly Noble")}</div>
            <div className={styles.shinsalDesc}>{translate("landing.shinsal.heavenlyNobleDesc", "Guardian energy")}</div>
          </div>
          <div className={styles.shinsalCard}>
            <div className={styles.shinsalIcon}>🐴</div>
            <div className={styles.shinsalName}>{translate("landing.shinsal.postHorse", "Post Horse")}</div>
            <div className={styles.shinsalDesc}>{translate("landing.shinsal.postHorseDesc", "Travel & movement")}</div>
          </div>
          <div className={styles.shinsalCard}>
            <div className={styles.shinsalIcon}>🌸</div>
            <div className={styles.shinsalName}>{translate("landing.shinsal.peachBlossom", "Peach Blossom")}</div>
            <div className={styles.shinsalDesc}>{translate("landing.shinsal.peachBlossomDesc", "Charm & romance")}</div>
          </div>
        </div>
      </section>

      {/* Tarot Feature Section */}
      <TarotSection translate={translate} locale={locale} />

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>
            {translate("landing.ctaTitle", "더 나은 결정을 만드세요")}
          </h2>
          <p className={styles.ctaSubtitle}>
            {translate("landing.ctaSubtitle", "AI가 당신의 운명을 읽고, 최선의 선택을 안내합니다")}
          </p>
          <Link href="/destiny-map" className={styles.ctaButton}>
            {translate("landing.ctaButton", "지금 시작하기 →")}
          </Link>
        </div>
      </section>

      {/* SEO Content Section - Rich Information for Search Engines */}
      <section className={styles.seoContentSection}>
        <div className={styles.seoContentContainer}>
          <article className={styles.seoArticle}>
            <div className={styles.seoHeader}>
              <h2 className={styles.seoHeading}>
                {translate("landing.seo.whatIsDestinyPal", "DestinyPal이란? 운명과 성격을 분석하는 AI 기반 플랫폼")}
              </h2>
              <p className={styles.seoIntro}>
                {translate(
                  "landing.seo.intro",
                  "DestinyPal은 동양의 사주팔자와 서양의 점성술을 결합한 종합 운세 분석 플랫폼입니다. 인공지능 기술을 활용하여 개인의 생년월일시를 바탕으로 운명의 흐름, 성격 특성, 적성, 인간관계 등을 깊이 있게 분석합니다. 수천 년간 축적된 동서양의 지혜와 현대 AI 기술이 만나, 당신의 인생에 실질적인 통찰을 제공합니다."
                )}
              </p>
            </div>

            <div className={styles.seoFeatureGrid}>
              <div className={styles.seoFeatureCard}>
                <div className={styles.seoFeatureIcon}>🔮</div>
                <h3 className={styles.seoFeatureTitle}>
                  {translate("landing.seo.sajuTitle", "사주팔자 분석")}
                </h3>
                <p className={styles.seoFeatureDesc}>
                  {translate(
                    "landing.seo.sajuDescription",
                    "사주팔자(四柱八字)는 출생 연월일시를 기반으로 한 동양 최고의 운명 분석 체계입니다. 네 개의 기둥(년주, 월주, 일주, 시주)과 여덟 글자(천간지지)로 구성되며, 목(木), 화(火), 토(土), 금(金), 수(水) 오행의 상생상극 관계를 통해 개인의 타고난 성향과 운명의 흐름을 파악합니다. DestinyPal은 전문가 수준의 사주 분석을 누구나 쉽게 이해할 수 있도록 시각화하고 해석합니다. 대운(大運), 세운(歲運) 분석을 통해 인생의 각 시기별 운세 변화를 예측하며, 직업운, 재물운, 애정운, 건강운 등 삶의 모든 영역을 포괄적으로 진단합니다."
                  )}
                </p>
              </div>

              <div className={styles.seoFeatureCard}>
                <div className={styles.seoFeatureIcon}>⭐</div>
                <h3 className={styles.seoFeatureTitle}>
                  {translate("landing.seo.astrologyTitle", "서양 점성술")}
                </h3>
                <p className={styles.seoFeatureDesc}>
                  {translate(
                    "landing.seo.astrologyDescription",
                    "서양 점성술(Astrology)은 출생 당시 천체의 배치를 통해 개인의 성격과 운명을 분석하는 체계입니다. 12개의 별자리(Zodiac Sign)와 행성(태양, 달, 수성, 금성, 화성, 목성, 토성 등)의 위치, 하우스 시스템, 행성 간의 각도(Aspect) 등을 종합적으로 고려합니다. DestinyPal은 출생 차트(Natal Chart)를 정밀하게 계산하고, 상승궁(Ascendant), 중천(MC), 하강궁(Descendant), 천저(IC) 등 주요 포인트를 분석합니다. 태양 별자리는 기본 성격을, 달 별자리는 감정적 본성을, 상승궁은 외적 이미지를 나타내며, 이들의 조합으로 개인의 복합적인 성격을 이해할 수 있습니다."
                  )}
                </p>
              </div>

              <div className={styles.seoFeatureCard}>
                <div className={styles.seoFeatureIcon}>🎴</div>
                <h3 className={styles.seoFeatureTitle}>
                  {translate("landing.seo.tarotTitle", "타로 카드")}
                </h3>
                <p className={styles.seoFeatureDesc}>
                  {translate(
                    "landing.seo.tarotDescription",
                    "타로(Tarot)는 78장의 카드를 통해 현재 상황을 분석하고 미래를 조망하는 신비로운 도구입니다. 22장의 메이저 아르카나(Major Arcana)는 인생의 중요한 전환점과 영적 성장을 상징하며, 56장의 마이너 아르카나(Minor Arcana)는 일상의 구체적인 상황을 다룹니다. DestinyPal은 과거-현재-미래 스프레드, 켈틱 크로스, 관계 스프레드 등 다양한 펼침법을 제공하며, AI가 카드의 상징과 질문자의 상황을 연결하여 깊이 있는 해석을 제공합니다. 사랑, 진로, 금전, 건강 등 인생의 모든 질문에 대해 타로는 직관적인 통찰을 선사합니다."
                  )}
                </p>
              </div>

              <div className={styles.seoFeatureCard}>
                <div className={styles.seoFeatureIcon}>💕</div>
                <h3 className={styles.seoFeatureTitle}>
                  {translate("landing.seo.compatibilityTitle", "궁합 분석")}
                </h3>
                <p className={styles.seoFeatureDesc}>
                  {translate(
                    "landing.seo.compatibilityDescription",
                    "궁합(Compatibility) 분석은 두 사람의 사주와 별자리를 비교하여 관계의 조화와 충돌 가능성을 예측합니다. 사주 궁합에서는 일간의 합충형파해 관계, 오행의 상생상극, 신살의 상호작용을 분석하며, 점성술 궁합에서는 태양 별자리의 원소 조화, 금성-화성의 사랑 스타일 궁합, 달 별자리의 감정적 호환성 등을 살펴봅니다. DestinyPal은 연애 궁합뿐만 아니라 부부 궁합, 비즈니스 파트너십, 친구 관계, 부모-자식 관계 등 모든 인간관계의 역학을 분석하여, 상대방을 이해하고 관계를 발전시킬 수 있는 실질적인 조언을 제공합니다."
                  )}
                </p>
              </div>

              <div className={styles.seoFeatureCard}>
                <div className={styles.seoFeatureIcon}>📅</div>
                <h3 className={styles.seoFeatureTitle}>
                  {translate("landing.seo.calendarTitle", "운세 달력")}
                </h3>
                <p className={styles.seoFeatureDesc}>
                  {translate(
                    "landing.seo.calendarDescription",
                    "운세 달력(Fortune Calendar)은 매일의 운세 변화를 추적하고 중요한 날짜를 미리 파악할 수 있는 강력한 도구입니다. 일진(日辰)별 길흉, 행성 이동(Transit), 역행(Retrograde) 주기, 월상(Moon Phase) 등을 통합하여 제공합니다. 결혼식, 개업일, 이사일, 계약일 등 중요한 일정을 잡을 때 좋은 날(吉日)을 선택하거나, 어려움이 예상되는 날(凶日)을 피할 수 있습니다. DestinyPal의 AI는 개인의 사주와 현재 운세를 결합하여 맞춤형 일일 운세를 생성하며, 직업운, 금전운, 애정운, 건강운 등 분야별로 세분화된 조언을 제공합니다."
                  )}
                </p>
              </div>

              <div className={styles.seoFeatureCard}>
                <div className={styles.seoFeatureIcon}>🎯</div>
                <h3 className={styles.seoFeatureTitle}>
                  {translate("landing.seo.howToUse", "사용 방법")}
                </h3>
                <p className={styles.seoFeatureDesc}>
                  {translate(
                    "landing.seo.howToUseDescription",
                    "DestinyPal을 사용하는 것은 매우 간단합니다. 먼저 정확한 생년월일시를 입력하세요. 시간이 불확실한 경우 대략적인 시간대를 선택할 수 있으며, 더 정확한 시간일수록 분석의 정밀도가 높아집니다. 출생지 정보를 입력하면 점성술 차트의 하우스 시스템이 정확하게 계산됩니다. 입력이 완료되면 AI가 사주팔자를 계산하고, 천체 위치를 분석하여 종합적인 운명 리포트를 생성합니다. 대시보드에서 오행 밸런스, 행성 배치도, 대운 타임라인 등을 시각적으로 확인할 수 있으며, 각 섹션을 클릭하면 상세한 해석을 읽을 수 있습니다. 궁금한 점이 있다면 AI 채팅 기능을 통해 실시간으로 질문하고 답변을 받을 수 있습니다."
                  )}
                </p>
              </div>

              <div className={styles.seoFeatureCard}>
                <div className={styles.seoFeatureIcon}>🔒</div>
                <h3 className={styles.seoFeatureTitle}>
                  {translate("landing.seo.privacyTitle", "개인정보 보호")}
                </h3>
                <p className={styles.seoFeatureDesc}>
                  {translate(
                    "landing.seo.privacyDescription",
                    "DestinyPal은 사용자의 개인정보와 운세 데이터를 최고 수준의 보안으로 보호합니다. 모든 데이터는 암호화되어 저장되며, 엄격한 접근 제어 정책을 통해 무단 접근을 차단합니다. 사용자의 동의 없이 개인정보가 제3자에게 공유되지 않으며, 원하는 경우 언제든지 데이터를 삭제할 수 있습니다. 또한 익명 모드를 통해 계정 없이도 기본적인 운세 분석을 이용할 수 있어, 개인정보 노출에 대한 걱정 없이 서비스를 체험할 수 있습니다. GDPR 및 국내 개인정보보호법을 철저히 준수하며, 정기적인 보안 감사를 통해 안전성을 유지합니다."
                  )}
                </p>
              </div>

              <div className={styles.seoFeatureCard}>
                <div className={styles.seoFeatureIcon}>💎</div>
                <h3 className={styles.seoFeatureTitle}>
                  {translate("landing.seo.freeVsPremium", "무료 vs 프리미엄")}
                </h3>
                <p className={styles.seoFeatureDesc}>
                  {translate(
                    "landing.seo.freeVsPremiumDescription",
                    "DestinyPal은 무료 사용자에게도 기본적인 사주 분석, 서양 점성술 차트, 일일 운세, 타로 리딩 등을 제공합니다. 프리미엄 멤버십을 구독하면 대운 분석, 세운 예측, 상세 궁합 리포트, 맞춤형 AI 상담, 무제한 타로 리딩, PDF 리포트 다운로드 등 고급 기능을 이용할 수 있습니다. 프리미엄 사용자는 우선 고객 지원을 받으며, 새로운 기능을 먼저 체험할 수 있는 베타 테스터 자격도 부여됩니다. 월간 구독과 연간 구독 중 선택할 수 있으며, 연간 구독 시 최대 30% 할인 혜택이 제공됩니다. 첫 7일간 무료 체험을 통해 프리미엄 기능을 먼저 경험해 보세요."
                  )}
                </p>
              </div>
            </div>

            <div className={styles.seoKeywords}>
              <div className={styles.seoKeywordsHeader}>
                <span className={styles.seoKeywordsIcon}>🔍</span>
                <h4 className={styles.seoKeywordsTitle}>
                  {translate("landing.seo.keywords", "주요 키워드")}
                </h4>
              </div>
              <p className={styles.seoKeywordsList}>
                {translate(
                  "landing.seo.keywordsList",
                  "사주팔자, 사주 보기, 무료 사주, 운세, 오늘의 운세, 별자리 운세, 점성술, 타로 카드, 타로 점, 무료 타로, 궁합, 띠 궁합, 별자리 궁합, 생년월일 궁합, 대운, 세운, 신살, 십성, 오행, 천간지지, 일간, 월지, 년주, 시주, 상승궁, 태양 별자리, 달 별자리, 금성 별자리, 화성 별자리, 출생 차트, 네이탈 차트, 하우스 시스템, 어센던트, 메이저 아르카나, 마이너 아르카나, 켈틱 크로스, 과거현재미래, 사주 풀이, 사주 해석, 무료 운세, 2024년 운세, 2025년 운세, 신년 운세, 토정비결, 정통 사주, AI 운세, 인공지능 사주, 운명 분석, 성격 분석, 적성 테스트, 진로 상담, 연애 운세, 재물 운세, 건강 운세, 직업 운세, 이직 운세, 결혼 운세, 임신 운세, 합격 운세"
                )}
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* Scroll to Top Button */}
      <button
        className={`${styles.scrollToTop} ${showScrollTop ? styles.visible : ""}`}
        onClick={scrollToTop}
        aria-label={translate("landing.scrollToTop", "Back to Top")}
      >
        <span className={styles.scrollToTopIcon}>↑</span>
        <span className={styles.scrollToTopText}>
          {translate("landing.scrollToTop", "Back to Top")}
        </span>
      </button>

      <SpeedInsights />
    </main>
  );
}


