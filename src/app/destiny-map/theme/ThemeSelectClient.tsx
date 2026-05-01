'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './theme.module.css';

// ✅ 파티클 타입
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

// ✅ 테마 키 타입 — 시기 4 + 영역 6 = 10
type ThemeKey =
  | 'fortune_new_year'
  | 'fortune_next_year'
  | 'fortune_monthly'
  | 'fortune_today'
  | 'focus_love'
  | 'focus_career'
  | 'focus_wealth'
  | 'focus_health'
  | 'focus_family'
  | 'focus_move';

// ✅ 메뉴(테마) — 시기 4 + 영역 6 (Premium 6 영역과 매칭)
const THEMES: { key: ThemeKey; title: string; desc: string; emoji: string; group: '시기' | '영역' }[] = [
  // 시기 운세 (4) — Premium에 없는 무료 차별 영역
  { key: 'fortune_new_year', title: '신년 운세', desc: '다가올 한 해의 흐름과 기회·주의점', emoji: '🎊', group: '시기' },
  { key: 'fortune_next_year', title: '내년 운세', desc: '다음 해의 주요 변화와 상승 포인트', emoji: '🌟', group: '시기' },
  { key: 'fortune_monthly', title: '월운', desc: '한 달의 리듬과 전환점 캘린더', emoji: '🗓️', group: '시기' },
  { key: 'fortune_today', title: '오늘의 운세', desc: '오늘의 컨디션·관계·주의 포인트', emoji: '☀️', group: '시기' },
  // 영역 운세 (6) — Premium 테마 심층과 동일 키
  { key: 'focus_love', title: '연애', desc: '감정 리듬과 관계·매력 포인트', emoji: '💖', group: '영역' },
  { key: 'focus_career', title: '커리어', desc: '직업·승진·이직·역량 확장 방향', emoji: '💼', group: '영역' },
  { key: 'focus_wealth', title: '재물', desc: '돈의 흐름·투자 리듬·지키는 원칙', emoji: '💰', group: '영역' },
  { key: 'focus_health', title: '건강', desc: '리커버리 루틴과 에너지 관리 지침', emoji: '💊', group: '영역' },
  { key: 'focus_family', title: '가족', desc: '가족·팀 내 관계와 조화 포인트', emoji: '👪', group: '영역' },
  { key: 'focus_move', title: '이동', desc: '이주·여정·환경 변화 결', emoji: '🧭', group: '영역' },
];

export default function ThemeSelectClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  const baseParams = useMemo(
    () => new URLSearchParams(sp?.toString() ?? ""),
    [sp]
  );

  // ------------------------------------------------------------ //
  // 🎨 Particle Animation
  // ------------------------------------------------------------ //
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const PARTICLE_COUNT = 60;
    const MAX_LINK_DISTANCE = 100;
    const MOUSE_INTERACTION_RADIUS = 180;
    const PARTICLE_BASE_SPEED = 0.25;

    let particlesArray: Particle[] = [];
    let raf = 0;
    let lastFrame = 0;
    const frameInterval = 1000 / 30;

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

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('resize', handleResize);

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
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED;
        this.speedY = (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED;
        const colors = ['#a78bfa', '#8b5cf6', '#7c3aed', '#6366f1', '#818cf8'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        if (this.x > canvas.width || this.x < 0) {this.speedX = -this.speedX;}
        if (this.y > canvas.height || this.y < 0) {this.speedY = -this.speedY;}

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
      let numberOfParticles = (canvas.height * canvas.width) / 12000;
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
            const opacity = (1 - distance / MAX_LINK_DISTANCE) * 0.5;
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate(timestamp = 0) {
      if (timestamp - lastFrame >= frameInterval) {
        lastFrame = timestamp;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particlesArray.forEach((p) => {
          p.update();
          p.draw();
        });
        connectParticles();
      }
      raf = requestAnimationFrame(animate);
    }

    init();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const onPick = (theme: ThemeKey) => {
    const params = new URLSearchParams(baseParams.toString());
    params.set('theme', theme);

    const lat = sp?.get('latitude') || sp?.get('lat');
    const lon = sp?.get('longitude') || sp?.get('lon');
    if (lat) {params.set('latitude', lat);}
    if (lon) {params.set('longitude', lon);}

    router.push(`/destiny-map/result?${params.toString()}`);
  };

  return (
    <main className={styles.container}>
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      <section className={styles.card}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>분석 테마 선택</h1>
            <p className={styles.subtitle}>
              원하는 포커스를 선택하면, 리포트가 해당 주제에 맞춰 강조됩니다.
            </p>
          </div>
        </header>

        <div className={styles.grid}>
          {THEMES.map((th, index) => (
            <button
              key={th.key}
              onClick={() => onPick(th.key)}
              className={styles.themeCard}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={styles.emoji}>{th.emoji}</div>
              <div className={styles.themeTitle}>{th.title}</div>
              <div className={styles.themeDesc}>{th.desc}</div>
            </button>
          ))}
        </div>

        <div className={styles.matrixSection}>
          <button
            type="button"
            className={styles.matrixButton}
            onClick={() => router.push(`/destiny-map/matrix?${baseParams.toString()}`)}
          >
            <span className={styles.matrixIcon}>🧬</span>
            <div className={styles.matrixContent}>
              <span className={styles.matrixTitle}>Destiny Fusion Matrix™</span>
              <span className={styles.matrixDesc}>사주 × 점성 10레이어 융합 분석 (1,206 셀)</span>
            </div>
            <span className={styles.matrixArrow}>→</span>
          </button>
        </div>
      </section>
    </main>
  );
}
