"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import HeaderUser from "./HeaderUser";
import styles from "./main-page.module.css";
import LanguageSwitcher from "@/components/LanguageSwitcher/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import Card from "@/components/ui/Card";
import Grid from "@/components/ui/Grid";
import { SERVICE_LINKS, TAROT_DECK, type TarotCard } from "@/data/home";

const NotificationBell = dynamic(() => import("@/components/notifications/NotificationBell"), { ssr: false });

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  update(): void;
  draw(): void;
}
const WeeklyFortuneCard = dynamic(() => import("@/components/WeeklyFortuneCard"), {
  loading: () => <div className={styles.weeklyCardSkeleton} />,
});

const serviceLinksData = SERVICE_LINKS;

export default function MainPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const router = useRouter();
  const { t } = useI18n();
  const translate = useCallback((key: string, fallback: string) => {
    const res = t(key);
    const last = key.split(".").pop() || key;
    return res === last ? fallback : res;
  }, [t]);

  const [_answer, setAnswer] = useState(
    translate("landing.prompt1", "What do the stars say about my path today?")
  );
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [lifeQuestion, setLifeQuestion] = useState("");
  const [typingPlaceholder, setTypingPlaceholder] = useState("");
  const [todayVisitors, setTodayVisitors] = useState<number | null>(null);
  const [totalVisitors, setTotalVisitors] = useState<number | null>(null);
  const [totalMembers, setTotalMembers] = useState<number | null>(null);
  const [visitorError, setVisitorError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const trackedOnce = useRef(false);
  const metricsToken = process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN;

  // Tarot card state - consolidated to prevent multiple re-renders
  type TarotState = {
    flippedCards: boolean[];
    selectedCards: TarotCard[];
    usedCardIndices: Set<number>;
    isDeckSpread: boolean;
  };
  type TarotAction =
    | { type: 'FLIP_CARD'; index: number }
    | { type: 'DRAW_ALL_CARDS'; cards: TarotCard[]; usedIndices: number[] }
    | { type: 'RESET' };

  const initialTarotState: TarotState = {
    flippedCards: [false, false, false, false],
    selectedCards: [],
    usedCardIndices: new Set(),
    isDeckSpread: false,
  };

  function tarotReducer(state: TarotState, action: TarotAction): TarotState {
    switch (action.type) {
      case 'FLIP_CARD': {
        if (state.selectedCards.length === 0) return state;
        const newFlipped = [...state.flippedCards];
        newFlipped[action.index] = !newFlipped[action.index];
        return { ...state, flippedCards: newFlipped };
      }
      case 'DRAW_ALL_CARDS': {
        return {
          ...state,
          selectedCards: action.cards,
          usedCardIndices: new Set(action.usedIndices),
          flippedCards: [false, false, false, false],
          isDeckSpread: true,
        };
      }
      case 'RESET':
        return initialTarotState;
      default:
        return state;
    }
  }

  const [tarotState, dispatchTarot] = useReducer(tarotReducer, initialTarotState);
  const { flippedCards, selectedCards, usedCardIndices, isDeckSpread } = tarotState;

  useEffect(() => {
    const timer = setInterval(() => {
      const next = [
        translate("landing.prompt1", "What do the stars say about my path today?"),
        translate("landing.prompt2", "When will love arrive? What is my destiny cycle?"),
        translate("landing.prompt3", "Should I make a bold move now or wait?"),
      ];
      setAnswer(next[Math.floor(Math.random() * next.length)]);
    }, 4200);
    return () => clearInterval(timer);
  }, [translate]);

  // Typing animation for placeholder
  useEffect(() => {
    const placeholders = [
      translate("landing.hint1", "오늘의 운세가 궁금해요"),
      translate("landing.hint2", "연애운이 어떨까요?"),
      translate("landing.hint3", "이직해도 될까요?"),
      translate("landing.searchPlaceholder", "오늘 무엇이 궁금하세요?"),
    ];

    let currentIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    const type = () => {
      const currentText = placeholders[currentIndex];

      if (isDeleting) {
        setTypingPlaceholder(currentText.substring(0, charIndex - 1));
        charIndex--;

        if (charIndex === 0) {
          isDeleting = false;
          currentIndex = (currentIndex + 1) % placeholders.length;
          timeoutId = setTimeout(type, 500);
        } else {
          timeoutId = setTimeout(type, 30);
        }
      } else {
        setTypingPlaceholder(currentText.substring(0, charIndex + 1));
        charIndex++;

        if (charIndex === currentText.length) {
          isDeleting = true;
          timeoutId = setTimeout(type, 2000); // Pause before deleting
        } else {
          timeoutId = setTimeout(type, 80);
        }
      }
    };

    timeoutId = setTimeout(type, 1000);

    return () => clearTimeout(timeoutId);
  }, [translate]);

  // Scroll-triggered animation for feature sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -100px 0px",
      }
    );

    const featureSections = document.querySelectorAll(`.${styles.featureSection}`);
    featureSections.forEach((section) => observer.observe(section));

    return () => {
      featureSections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (trackedOnce.current) return;
    trackedOnce.current = true;

    const headers: HeadersInit = {};
    if (metricsToken) headers["x-metrics-token"] = metricsToken;

    async function run() {
      try {
        // Fetch visitor stats
        await fetch("/api/visitors-today", { method: "POST", headers });
        const visitorRes = await fetch("/api/visitors-today", { headers });
        if (visitorRes.ok) {
          const data = await visitorRes.json();
          setTodayVisitors(typeof data.count === "number" ? data.count : 0);
          setTotalVisitors(typeof data.total === "number" ? data.total : 0);
        }

        // Fetch member stats
        const statsRes = await fetch("/api/stats");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setTotalMembers(typeof statsData.users === "number" ? statsData.users : 0);
        }
      } catch {
        setVisitorError("Could not load stats.");
      }
    }

    run();
  }, [metricsToken]);

  // Tarot card click handler - just flip the card
  const handleCardClick = useCallback((index: number) => {
    if (selectedCards.length > 0) {
      dispatchTarot({ type: 'FLIP_CARD', index });
    }
  }, [selectedCards.length]);

  // Deck click handler - draw 4 random cards or reset
  const handleDeckClick = useCallback(() => {
    if (isDeckSpread) {
      dispatchTarot({ type: 'RESET' });
    } else {
      // Draw 4 random cards from deck
      const availableIndices = Array.from({ length: TAROT_DECK.length }, (_, i) => i);
      const shuffled = availableIndices.sort(() => Math.random() - 0.5);
      const selectedIndices = shuffled.slice(0, 4);
      const cards = selectedIndices.map(i => TAROT_DECK[i]);
      dispatchTarot({ type: 'DRAW_ALL_CARDS', cards, usedIndices: selectedIndices });
    }
  }, [isDeckSpread]);

  // Handle question submission - navigate to destiny-map with the question
  const handleQuestionSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (lifeQuestion.trim()) {
      router.push(`/destiny-map?q=${encodeURIComponent(lifeQuestion.trim())}`);
    } else {
      router.push('/destiny-map');
    }
  }, [lifeQuestion, router]);

  const handleHintClick = useCallback((hint: string) => {
    setLifeQuestion(hint);
    router.push(`/destiny-map?q=${encodeURIComponent(hint)}`);
  }, [router]);

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const PARTICLE_COUNT = 150;
    const MAX_LINK_DISTANCE = 120;
    const MOUSE_INTERACTION_RADIUS = 200;
    const PARTICLE_BASE_SPEED = 0.5;
    const PARTICLE_COLOR = "#88b3f7";

    let particlesArray: Particle[] = [];
    let raf = 0;

    const mouse = {
      x: undefined as number | undefined,
      y: undefined as number | undefined,
      radius: MOUSE_INTERACTION_RADIUS,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.x;
      mouse.y = e.y;
    };
    const handleMouseOut = () => {
      mouse.x = undefined;
      mouse.y = undefined;
    };
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseOut);
    window.addEventListener("resize", handleResize);

    class ParticleImpl implements Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.5 + 1;
        this.speedX = (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED;
        this.speedY = (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED;
        this.color = PARTICLE_COLOR;
      }

      update() {
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;

        this.x += this.speedX;
        this.y += this.speedY;

        if (mouse.x !== undefined && mouse.y !== undefined) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            const directionX = forceDirectionX * force * 2;
            const directionY = forceDirectionY * force * 2;
            this.x -= directionX;
            this.y -= directionY;
          }
        }
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function init() {
      particlesArray = [];
      let numberOfParticles = (canvas.height * canvas.width) / 9000;
      numberOfParticles = Math.min(numberOfParticles, PARTICLE_COUNT);
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new ParticleImpl());
      }
    }

    // Grid-based spatial partitioning for O(n) performance
    const gridCellSize = MAX_LINK_DISTANCE;
    function connectParticles() {
      // Build spatial grid
      const grid: Map<string, Particle[]> = new Map();
      for (const p of particlesArray) {
        const cellX = Math.floor(p.x / gridCellSize);
        const cellY = Math.floor(p.y / gridCellSize);
        const key = `${cellX},${cellY}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(p);
      }

      // Only check neighboring cells
      const checked = new Set<string>();
      for (const p of particlesArray) {
        const cellX = Math.floor(p.x / gridCellSize);
        const cellY = Math.floor(p.y / gridCellSize);

        // Check 3x3 neighboring cells
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const neighborKey = `${cellX + dx},${cellY + dy}`;
            const neighbors = grid.get(neighborKey);
            if (!neighbors) continue;

            for (const neighbor of neighbors) {
              if (p === neighbor) continue;
              const pairKey = p.x < neighbor.x ? `${p.x},${p.y}-${neighbor.x},${neighbor.y}` : `${neighbor.x},${neighbor.y}-${p.x},${p.y}`;
              if (checked.has(pairKey)) continue;
              checked.add(pairKey);

              const distX = p.x - neighbor.x;
              const distY = p.y - neighbor.y;
              const distSq = distX * distX + distY * distY;
              if (distSq < MAX_LINK_DISTANCE * MAX_LINK_DISTANCE) {
                const distance = Math.sqrt(distSq);
                const opacity = 1 - distance / MAX_LINK_DISTANCE;
                ctx.strokeStyle = `rgba(136, 179, 247, ${opacity})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(neighbor.x, neighbor.y);
                ctx.stroke();
              }
            }
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach((p) => {
        p.update();
        p.draw();
      });
      connectParticles();
      raf = requestAnimationFrame(animate);
    }

    init();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <main className={styles.container}>
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      <header className={styles.topBar}>
        <div className={styles.brand}>
          <Image
            src="/logo/logo.png"
            alt="DestinyPal Logo"
            width={28}
            height={28}
            className={styles.brandLogo}
          />
          <span>DestinyPal</span>
        </div>
        <nav className={styles.nav}>
          <Link href="/about" className={styles.navLink}>
            {translate("common.about", "About")}
          </Link>
          <div
            className={styles.navItem}
            onMouseEnter={() => setActiveMenu("services")}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <button className={styles.navButton}>{t("common.ourService")}</button>
            {activeMenu === "services" && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <span className={styles.dropdownTitle}>{t("services.title")}</span>
                  <span className={styles.dropdownSubtitle}>{t("services.subtitle")}</span>
                </div>
                <Grid className={styles.dropdownGrid} columns={3}>
                  {serviceLinksData.map((s) => (
                    s.comingSoon ? (
                      <Card key={s.href} className={`${styles.dropItem} ${styles.dropItemDisabled}`}>
                        <div className={styles.dropItemLeft}>
                          <span className={styles.dropItemIcon}>{s.icon}</span>
                          <div className={styles.dropItemText}>
                            <span className={styles.dropItemLabel}>
                              {t(`services.${s.key}.label`)}
                              <span className={styles.comingSoonBadge}>{t("common.comingSoon")}</span>
                            </span>
                            <span className={styles.dropItemDesc}>{t(`services.${s.key}.desc`)}</span>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <Card as={Link} key={s.href} href={s.href} className={styles.dropItem}>
                        <div className={styles.dropItemLeft}>
                          <span className={styles.dropItemIcon}>{s.icon}</span>
                          <div className={styles.dropItemText}>
                            <span className={styles.dropItemLabel}>{t(`services.${s.key}.label`)}</span>
                            <span className={styles.dropItemDesc}>{t(`services.${s.key}.desc`)}</span>
                          </div>
                        </div>
                      </Card>
                    )
                  ))}
                </Grid>
              </div>
            )}
          </div>
          <Link href="/pricing" className={styles.navLink}>
            {translate("common.pricing", "Pricing")}
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
          <HeaderUser />
          <NotificationBell />
          <LanguageSwitcher />
          <Link href="/destiny-map" className={styles.ctaPrimary}>
            {t("common.start")}
          </Link>
        </div>
      </header>

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
          <div className={styles.questionSearchContainer}>
            <form onSubmit={handleQuestionSubmit} className={styles.questionSearchForm}>
              <div className={styles.questionSearchWrapper}>
                <span className={styles.questionSearchIcon}>&#10024;</span>
                <input
                  type="text"
                  className={styles.questionSearchInput}
                  placeholder={typingPlaceholder || translate("landing.searchPlaceholder", "오늘 무엇이 궁금하세요?")}
                  value={lifeQuestion}
                  onChange={(e) => setLifeQuestion(e.target.value)}
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
              {todayVisitors?.toLocaleString() ?? "—"}
            </p>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>🌟</span>
            <p className={styles.statLabel}>
              {translate("landing.statsTotal", "Total Visitors")}
            </p>
            <p className={styles.statValue}>
              {totalVisitors?.toLocaleString() ?? "—"}
            </p>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>✨</span>
            <p className={styles.statLabel}>
              {translate("landing.statsMembers", "Members")}
            </p>
            <p className={styles.statValue}>
              {totalMembers?.toLocaleString() ?? "—"}
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
      <section className={styles.services}>
        <div className={styles.serviceHeaderCentered}>
          <div>
            <p className={styles.sectionEyebrow}>
              {translate("landing.servicesEyebrow", "DestinyPal Services")}
            </p>
            <h2 className={styles.sectionTitle}>
              {translate("landing.servicesTitle", "Your Destiny, Decoded.")}
            </h2>
            <p className={styles.sectionDesc}>
              {translate("landing.servicesDesc", "운명의 언어를 AI가 해석합니다")}
            </p>
          </div>
          <div className={styles.heroGlass}>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderLeft}>
                <div className={styles.avatarBot}>AI</div>
                <div>
                  <div className={styles.chatHeaderTitle}>DestinyPal AI</div>
                  <div className={styles.chatHeaderStatus}>Online</div>
                </div>
              </div>
            </div>
            <div className={styles.chatBubble}>
              <div className={`${styles.messageRow} ${styles.userRow}`}>
                <div className={styles.messageContent}>
                  <div className={styles.userMessage}>
                    {translate("landing.prompt1", "How is my fortune today?")}
                  </div>
                  <div className={styles.messageTime}>Just now</div>
                </div>
                <div className={styles.avatarUser}>You</div>
              </div>
              <div className={`${styles.messageRow} ${styles.aiRow}`}>
                <div className={styles.avatarBot}>AI</div>
                <div className={styles.messageContent}>
                  <div className={styles.aiMessage}>
                    {translate("landing.aiResponse", "Based on your astrological chart, today brings favorable planetary alignments. Your Saju elements show strong harmony - particularly in career and wealth sectors. The Moon's position suggests emotional clarity, while Jupiter's influence enhances opportunities for growth.")}
                  </div>
                  <div className={styles.messageTime}>Just now</div>
                </div>
              </div>
            </div>
            <div className={styles.chatInputArea}>
              <input
                type="text"
                className={styles.chatInput}
                placeholder={translate("landing.chatInputPlaceholder", "Ask about your destiny...")}
                disabled
              />
              <button className={styles.chatSendBtn} disabled>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 8L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

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
            <div className={styles.zodiacSign} style={{transform: 'rotate(0deg) translateY(-180px)'}}>♈</div>
            <div className={styles.zodiacSign} style={{transform: 'rotate(30deg) translateY(-180px)'}}>♉</div>
            <div className={styles.zodiacSign} style={{transform: 'rotate(60deg) translateY(-180px)'}}>♊</div>
            <div className={styles.zodiacSign} style={{transform: 'rotate(90deg) translateY(-180px)'}}>♋</div>
            <div className={styles.zodiacSign} style={{transform: 'rotate(120deg) translateY(-180px)'}}>♌</div>
            <div className={styles.zodiacSign} style={{transform: 'rotate(150deg) translateY(-180px)'}}>♍</div>
            <div className={styles.zodiacSign} style={{transform: 'rotate(180deg) translateY(-180px)'}}>♎</div>
            <div className={styles.zodiacSign} style={{transform: 'rotate(210deg) translateY(-180px)'}}>♏</div>
            <div className={styles.zodiacSign} style={{transform: 'rotate(240deg) translateY(-180px)'}}>♐</div>
            <div className={styles.zodiacSign} style={{transform: 'rotate(270deg) translateY(-180px)'}}>♑</div>
            <div className={styles.zodiacSign} style={{transform: 'rotate(300deg) translateY(-180px)'}}>♒</div>
            <div className={styles.zodiacSign} style={{transform: 'rotate(330deg) translateY(-180px)'}}>♓</div>
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
      <section className={styles.featureSection}>
        <h2 className={styles.featureSectionTitle}>
          {translate("landing.tarotSectionTitle", "오늘의 타로 리딩")}
        </h2>
        <p className={styles.featureSectionSubtitle}>
          {translate("landing.tarotSectionSubtitle", "카드가 전하는 메시지에 귀 기울여 보세요")}
        </p>
        {/* Card Deck - 78 cards shuffling */}
        <div className={styles.tarotDeckContainer}>
          <div
            className={`${styles.tarotDeck} ${isDeckSpread ? styles.deckSpread : ''}`}
            onClick={handleDeckClick}
            style={{
              width: isDeckSpread ? '400px' : '120px',
              height: isDeckSpread ? '200px' : '200px',
              transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className={styles.deckCard}
                style={{
                  transform: isDeckSpread
                    ? `translateX(${(i - 7) * 25}px) translateY(${Math.abs(i - 7) * 15}px) rotate(${(i - 7) * 5}deg)`
                    : `translateX(${i * 0.5}px) translateY(${i * 0.5}px) rotate(${(i - 7) * 2}deg)`,
                  zIndex: 15 - i,
                  transition: `all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.06}s`
                }}
              />
            ))}
          </div>
          <p className={styles.deckLabel} suppressHydrationWarning>
            {isDeckSpread
              ? translate("landing.tarotDeckReset", "Draw again")
              : translate("landing.tarotDeckLabel", "Click to draw cards")}
          </p>
        </div>
        {/* Selected Cards - only show when cards are drawn */}
        {selectedCards.length > 0 && (
          <>
            <div className={styles.tarotCards}>
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`${styles.tarotCard} ${flippedCards[index] ? styles.flipped : ''}`}
                  onClick={() => handleCardClick(index)}
                >
                  <div className={styles.cardBack}>
                    <div className={styles.cardPattern}>✦</div>
                    <div className={styles.cardPattern}>✦</div>
                    <div className={styles.cardPattern}>✦</div>
                    <div className={styles.cardPattern}>✦</div>
                  </div>
                  <div className={styles.cardFront}>
                    <div className={styles.cardHeader}>{selectedCards[index]?.name}</div>
                    <div className={styles.cardMainIcon}>{selectedCards[index]?.icon}</div>
                    <div className={styles.cardFooter}>
                      {selectedCards[index]?.suit || selectedCards[index]?.number}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.tarotLabels}>
              <span>{translate("landing.tarotPast", "과거")}</span>
              <span>{translate("landing.tarotPresent", "현재")}</span>
              <span>{translate("landing.tarotFuture", "미래")}</span>
              <span>{translate("landing.tarotAdvice", "조언")}</span>
            </div>
          </>
        )}
      </section>

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


