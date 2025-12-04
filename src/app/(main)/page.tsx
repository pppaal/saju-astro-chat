"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import HeaderUser from "./HeaderUser";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationBell from "@/components/notifications/NotificationBell";
import styles from "./main-page.module.css";
import LanguageSwitcher from "@/components/LanguageSwitcher/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

type Particle = {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  update: () => void;
  draw: () => void;
};

const serviceLinks = [
  { label: "Destiny Map", href: "/destiny-map" },
  { label: "Astrology", href: "/astrology" },
  { label: "Saju", href: "/saju" },
  { label: "Tarot", href: "/tarot" },
  { label: "I Ching", href: "/iching" },
  { label: "Dream", href: "/dream" },
  { label: "Numerology", href: "/numerology" },
  { label: "Compatibility", href: "/compatibility" },
  { label: "Personality", href: "/personality" },
];

export default function MainPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const { t } = useI18n();
  const translate = useCallback((key: string, fallback: string) => {
    const res = t(key);
    const last = key.split(".").pop() || key;
    return res === last ? fallback : res;
  }, [t]);

  const [answer, setAnswer] = useState(
    translate("landing.prompt1", "What do the stars say about my path today?")
  );
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [todayVisitors, setTodayVisitors] = useState<number | null>(null);
  const [totalVisitors, setTotalVisitors] = useState<number | null>(null);
  const [visitorError, setVisitorError] = useState<string | null>(null);
  const trackedOnce = useRef(false);
  const metricsToken = process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN;

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

  useEffect(() => {
    if (trackedOnce.current) return;
    trackedOnce.current = true;

    const headers: HeadersInit = {};
    if (metricsToken) headers["x-metrics-token"] = metricsToken;

    async function run() {
      try {
        await fetch("/api/visitors-today", { method: "POST", headers });
        const res = await fetch("/api/visitors-today", { headers });
        if (!res.ok) {
          setVisitorError("Could not load visitor stats.");
          return;
        }
        const data = await res.json();
        setTodayVisitors(typeof data.count === "number" ? data.count : 0);
        setTotalVisitors(typeof data.total === "number" ? data.total : 0);
      } catch {
        setVisitorError("Could not load visitor stats.");
      }
    }

    run();
  }, [metricsToken]);

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

    function connectParticles() {
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < MAX_LINK_DISTANCE) {
            const opacity = 1 - distance / MAX_LINK_DISTANCE;
            ctx.strokeStyle = `rgba(136, 179, 247, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
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
          <span className={styles.brandDot} />
          <span>DestinyPal</span>
        </div>
        <nav className={styles.nav}>
          <div
            className={styles.navItem}
            onMouseEnter={() => setActiveMenu("services")}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <button className={styles.navButton}>{t("common.ourService")}</button>
            {activeMenu === "services" && (
              <div className={styles.dropdown}>
                {serviceLinks.map((s) => (
                  <Link key={s.href} href={s.href} className={styles.dropItem}>
                    <span>{s.label}</span>
                    <span>→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/myjourney" className={styles.navLink}>
            {t("app.myJourney")}
          </Link>
          <Link href="/community" className={styles.navLink}>
            {t("app.community")}
          </Link>
        </nav>
        <div className={styles.headerLinks}>
          <HeaderUser />
          <NotificationBell />
          <ThemeToggle />
          <LanguageSwitcher />
          <Link href="/pricing" className={styles.ctaPrimary}>
            {t("common.start")}
          </Link>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.heroBanner}>
          <h1 className={styles.heroTitle}>
            {translate("landing.heroTitle", "AI guides your destiny map in one click.")}
          </h1>
          <p className={styles.heroSub}>
            {translate(
              "landing.heroSub",
              "사주, 점성, 타로, 전통 리딩을 한 번에. 흐름을 읽고 오늘의 결정을 가볍게 만드세요."
            )}
          </p>
        </div>

        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>
              {translate("landing.statsToday", "Today")}
            </p>
            <p className={styles.statValue}>{todayVisitors ?? "—"}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>
              {translate("landing.statsTotal", "Total")}
            </p>
            <p className={styles.statValue}>{totalVisitors ?? "—"}</p>
          </div>
          <div className={styles.statFootnote}>
            {visitorError ?? translate("landing.statsFootnote", "Visitors update in real time.")}
          </div>
        </div>
      </div>

      <section className={styles.services}>
        <div className={styles.serviceHeader}>
          <div>
            <p className={styles.sectionEyebrow}>
              {translate("landing.servicesEyebrow", "DestinyPal Services")}
            </p>
            <h2 className={styles.sectionTitle}>
              {translate("landing.servicesTitle", "한눈에 보는 주요 리딩")}
            </h2>
            <p className={styles.sectionDesc}>
              {translate("landing.servicesDesc", "카드에 올려보면 느낌이 미리 보여요.")}
            </p>
          </div>
          <div className={styles.heroGlass}>
            <p className={styles.heroLabel}>
              {translate("landing.aiChatDemo", "AI Chat Demo")}
            </p>
            <div className={styles.chatBubble}>
              <div className={styles.userMessage}>
                {translate("landing.prompt1", "What do the stars say about my path today?")}
              </div>
              <div className={styles.aiMessage}>
                {answer}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.serviceGrid}>
          <Link href="/astrology" className={`${styles.serviceCard} ${styles.orbit}`}>
            <div className={styles.serviceIcon}>✦</div>
            <div className={styles.serviceText}>
              <h3>{translate("landing.astrologyTitle", "점성")}</h3>
              <p>{translate("landing.astrologyDesc", "행성·하우스·어스펙트를 애니메이션으로 표시합니다.")}</p>
            </div>
            <span className={styles.serviceArrow}>→</span>
          </Link>

          <Link href="/destiny-map" className={`${styles.serviceCard} ${styles.float}`}>
            <div className={styles.serviceIcon}>◎</div>
            <div className={styles.serviceText}>
              <h3>{translate("landing.destinyTitle", "Destiny Map")}</h3>
              <p>{translate("landing.destinyDesc", "AI가 사주, 별자리 흐름, 타로 카드 풀을 하나의 맵으로 묶어 보여줍니다.")}</p>
            </div>
            <span className={styles.serviceArrow}>→</span>
          </Link>

          <Link href="/saju" className={`${styles.serviceCard} ${styles.pulse}`}>
            <div className={styles.serviceIcon}>四柱</div>
            <div className={styles.serviceText}>
              <h3>{translate("landing.sajuTitle", "사주")}</h3>
              <p>{translate("landing.sajuDesc", "오행 밸런스와 대운 흐름을 빛나는 그래픽으로 보여줍니다.")}</p>
            </div>
            <span className={styles.serviceArrow}>→</span>
          </Link>

          <Link href="/tarot" className={`${styles.serviceCard} ${styles.float}`}>
            <div className={styles.serviceIcon}>♜</div>
            <div className={styles.serviceText}>
              <h3>{translate("landing.tarotTitle", "타로")}</h3>
              <p>{translate("landing.tarotDesc", "카드 풀링 애니메이션으로 직관적인 스프레드를 제공합니다.")}</p>
            </div>
            <span className={styles.serviceArrow}>→</span>
          </Link>
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
          <p><strong>{translate("landing.ascendant", "상승궁")}:</strong> {translate("landing.aquarius", "물병자리")} ♒ | <strong>{translate("landing.sun", "태양")}:</strong> {translate("landing.scorpio", "전갈자리")} ♏ | <strong>{translate("landing.moon", "달")}:</strong> {translate("landing.pisces", "물고기자리")} ♓</p>
          <p>{translate("landing.astrologyInfo", "오늘은 새로운 시작에 유리한 날입니다. 창의성이 빛을 발할 것입니다.")}</p>
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
              <div className={styles.stem}>甲</div>
              <div className={styles.branch}>子</div>
            </div>
          </div>
          <div className={styles.pillar}>
            <div className={styles.pillarLabel}>{translate("landing.dayPillar", "日柱")}</div>
            <div className={styles.pillarChar}>
              <div className={styles.stem}>丙</div>
              <div className={styles.branch}>寅</div>
            </div>
          </div>
          <div className={styles.pillar}>
            <div className={styles.pillarLabel}>{translate("landing.monthPillar", "月柱")}</div>
            <div className={styles.pillarChar}>
              <div className={styles.stem}>戊</div>
              <div className={styles.branch}>午</div>
            </div>
          </div>
          <div className={styles.pillar}>
            <div className={styles.pillarLabel}>{translate("landing.yearPillar", "年柱")}</div>
            <div className={styles.pillarChar}>
              <div className={styles.stem}>庚</div>
              <div className={styles.branch}>申</div>
            </div>
          </div>
        </div>
        {/* Luck Cycle Timeline */}
        <div className={styles.luckTimeline}>
          <div className={styles.timelineLabel}>{translate("landing.greatFortune", "대운 (大運)")}</div>
          <div className={styles.timelineTrack}>
            <div className={`${styles.luckPeriod} ${styles.active}`}>
              <span className={styles.luckAge}>28-37{translate("landing.ageUnit", "세")}</span>
              <span className={styles.luckChars}>辛酉</span>
            </div>
            <div className={styles.luckPeriod}>
              <span className={styles.luckAge}>38-47{translate("landing.ageUnit", "세")}</span>
              <span className={styles.luckChars}>壬戌</span>
            </div>
            <div className={styles.luckPeriod}>
              <span className={styles.luckAge}>48-57{translate("landing.ageUnit", "세")}</span>
              <span className={styles.luckChars}>癸亥</span>
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
          <div className={styles.tarotDeck}>
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className={styles.deckCard}
                style={{
                  transform: `translateX(${i * 0.5}px) translateY(${i * 0.5}px) rotate(${(i - 7) * 2}deg)`,
                  zIndex: 15 - i
                }}
              />
            ))}
          </div>
          <p className={styles.deckLabel}>
            {translate("landing.tarotDeckLabel", "78장의 타로 카드")}
          </p>
        </div>
        {/* Selected Cards */}
        <div className={styles.tarotCards}>
          <div className={styles.tarotCard}>
            <div className={styles.cardBack}>
              <div className={styles.cardPattern}>✦</div>
              <div className={styles.cardCenter}>
                <span className={styles.cardCenterIcon}>🔮</span>
              </div>
            </div>
            <div className={styles.cardFront}>
              <div className={styles.cardHeader}>THE STAR</div>
              <div className={styles.cardMainIcon}>⭐</div>
              <div className={styles.cardFooter}>XVII</div>
            </div>
          </div>
          <div className={styles.tarotCard}>
            <div className={styles.cardBack}>
              <div className={styles.cardPattern}>✦</div>
              <div className={styles.cardCenter}>
                <span className={styles.cardCenterIcon}>🔮</span>
              </div>
            </div>
            <div className={styles.cardFront}>
              <div className={styles.cardHeader}>THE MOON</div>
              <div className={styles.cardMainIcon}>🌙</div>
              <div className={styles.cardFooter}>XVIII</div>
            </div>
          </div>
          <div className={styles.tarotCard}>
            <div className={styles.cardBack}>
              <div className={styles.cardPattern}>✦</div>
              <div className={styles.cardCenter}>
                <span className={styles.cardCenterIcon}>🔮</span>
              </div>
            </div>
            <div className={styles.cardFront}>
              <div className={styles.cardHeader}>THE SUN</div>
              <div className={styles.cardMainIcon}>☀️</div>
              <div className={styles.cardFooter}>XIX</div>
            </div>
          </div>
          <div className={styles.tarotCard}>
            <div className={styles.cardBack}>
              <div className={styles.cardPattern}>✦</div>
              <div className={styles.cardCenter}>
                <span className={styles.cardCenterIcon}>🔮</span>
              </div>
            </div>
            <div className={styles.cardFront}>
              <div className={styles.cardHeader}>THE TOWER</div>
              <div className={styles.cardMainIcon}>⚡</div>
              <div className={styles.cardFooter}>XVI</div>
            </div>
          </div>
        </div>
        <div className={styles.tarotLabels}>
          <span>{translate("landing.tarotPast", "과거")}</span>
          <span>{translate("landing.tarotPresent", "현재")}</span>
          <span>{translate("landing.tarotFuture", "미래")}</span>
          <span>{translate("landing.tarotAdvice", "조언")}</span>
        </div>
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

      <div className={styles.policyBar}>
        <Link href="/policy/terms" className={styles.policyBtn}>
          {t("common.terms")}
        </Link>
        <Link href="/policy/privacy" className={styles.policyBtn}>
          {t("common.privacy")}
        </Link>
        <Link href="/policy/refund" className={styles.policyBtn}>
          {t("common.refunds")}
        </Link>
      </div>

      <SpeedInsights />
    </main>
  );
}



