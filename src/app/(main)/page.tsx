"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./main-page.module.css";
import HeaderUser from "./HeaderUser";

// [추가] i18n 가져오기
import { useI18n } from "@/i18n/I18nProvider";
// [선택] 언어 스위처(언어 바꾸는 드롭다운)
import LanguageSwitcher from "@/components/LanguageSwitcher/LanguageSwitcher";

// 메뉴는 키만 보관하고, 실제 표시 문자열은 t로 변환
const rawMenu = [
  { key: "destinyMap", href: "/destiny-map", highlight: true },
  { key: "saju", href: "/saju" },
  { key: "astrology", href: "/astrology" },
  { key: "iching", href: "/iching" },
  { key: "tarot", href: "/tarot" },
  { key: "dream", href: "/dream" },
  { key: "numerology", href: "/numerology" },
  { key: "compatibility", href: "/compatibility" },
  { key: "personality", href: "/personality" },
];

export default function MainPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const [visitors, setVisitors] = useState<number | null>(null);

  // [추가] 번역 훅
  const { t } = useI18n();

  useEffect(() => {
    const bumpAndFetch = async () => {
      try {
        await fetch("/api/visitors-today", { method: "POST" });
        const res = await fetch("/api/visitors-today");
        const data = await res.json();
        setVisitors(typeof data?.count === "number" ? data.count : 0);
      } catch {
        setVisitors(null);
      }
    };
    bumpAndFetch();
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

    class Particle {
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
        particlesArray.push(new Particle());
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

  // [추가] 메뉴 표시 이름을 번역으로 변환
  const menu = rawMenu.map((m) => ({ ...m, name: t(`menu.${m.key}`) }));

  return (
    <main className={styles.container}>
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      <header className={styles.header}>
        <Link href="/" className={styles.headerLink}>
          {`${t("app.visitors")}${visitors === null ? "" : `: ${visitors}`}`}
        </Link>
        <HeaderUser />
        <Link href="/myjourney" className={styles.headerLink}>
          {t("app.myJourney")}
        </Link>
        <Link href="/community" className={styles.headerLink}>
          {t("app.community")}
        </Link>

        {/* [선택] 언어 스위처를 헤더에 표시 */}
        <LanguageSwitcher />
      </header>

      <div className={styles.content}>
        <h1 className={styles.title}>{t("app.title")}</h1>
        <p className={styles.subtitle}>
          {t("app.subtitle")}
        </p>

        <nav className={styles.nav}>
          {menu.map((item, index) => (
            <Link
              key={item.key}
              href={item.href}
              className={`${styles.navLink} ${item.highlight ? styles.goldNav : ""}`}
              style={{ "--delay": `${0.5 + index * 0.1}s` } as React.CSSProperties}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
<div className={styles.policyBar}>

<Link href="/policy/terms" className={styles.policyBtn}>{t("common.terms")}</Link>

<Link href="/policy/privacy" className={styles.policyBtn}>{t("common.privacy")}</Link>

<Link href="/policy/refund" className={styles.policyBtn}>{t("common.refunds")}</Link>

</div>

      <SpeedInsights />
    </main>
  );
}
