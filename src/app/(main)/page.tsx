"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./main-page.module.css";

const menuItems = [
  { name: "Destiny Map", href: "/destiny-map", highlight: true }, // 금빛 강조
  { name: "Saju", href: "/saju" },
  { name: "Astrology", href: "/astrology" },
  { name: "Iching", href: "/iching" },
  { name: "Tarot", href: "/tarot" },
  { name: "Dream", href: "/dream" },
  { name: "Numerology", href: "/numerology" },
  { name: "Compatibility", href: "/compatibility" },
  { name: "Personality", href: "/personality" },
];

export default function MainPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null!);

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

  return (
    <main className={styles.container}>
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      <header className={styles.header}>
        <Link href="/journey" className={styles.headerLink}>My Journey</Link>
        <Link href="/community" className={styles.headerLink}>Community</Link>
      </header>

      <div className={styles.content}>
        <h1 className={styles.title}>Destiny Tracker</h1>
        <p className={styles.subtitle}>
          Unveil the secrets of the cosmos and your path within it.
        </p>

        {/* 여기: 금빛 강조 포함된 메뉴 렌더 */}
        <nav className={styles.nav}>
          {menuItems.map((item, index) => (
            <Link
              key={item.name}
              href={item.href}
              className={`${styles.navLink} ${item.highlight ? styles.goldNav : ""}`}
              style={{ "--delay": `${0.5 + index * 0.1}s` } as React.CSSProperties}
            >
              {item.name}{item.highlight ? " ✨" : ""}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}