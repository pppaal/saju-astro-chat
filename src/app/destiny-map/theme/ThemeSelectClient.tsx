'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';
import { UnifiedBirthForm, type BirthInfo } from '@/components/common/BirthForm';
import { getStoredBirthInfo } from '@/app/(main)/birthInfoStorage';
import { localizeStoredCity } from '@/lib/cities/formatter';
import BrandSplash from '@/components/branding/BrandSplash';
import styles from './theme.module.css';

// Particle background type
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

export default function ThemeSelectClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const { locale } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  const initialBirthInfo = (() => {
    const get = (k: string) => sp?.get(k) || ''
    const lat = get('latitude') || get('lat')
    const lon = get('longitude') || get('lon')
    return {
      birthDate: get('birthDate'),
      birthTime: get('birthTime'),
      birthCity: get('city'),
      latitude: lat ? Number(lat) : undefined,
      longitude: lon ? Number(lon) : undefined,
      timezone: get('userTz') || get('timezone'),
      gender: (get('gender') as 'M' | 'F' | 'Male' | 'Female') || undefined,
    } as Partial<BirthInfo>
  })()

  // No birth form on this page — read URL params first, fall back to
  // home localStorage. If both are empty, bounce to / so the home modal
  // is the single entry point for birth info (matches calendar / counselor).
  const [bootSplash, setBootSplash] = useState(true)
  useEffect(() => {
    if (initialBirthInfo.birthDate) {
      setBootSplash(false)
      return
    }
    const home = getStoredBirthInfo()
    if (home?.birthDate) {
      const params = new URLSearchParams()
      params.set('birthDate', home.birthDate)
      if (home.birthTime) params.set('birthTime', home.birthTime)
      params.set('gender', home.gender === 'female' ? 'F' : 'M')
      if (home.city) params.set('city', localizeStoredCity(home.city, locale === 'ko' ? 'ko' : 'en'))
      router.replace(`/destiny-map/theme?${params.toString()}`)
      return
    }
    router.replace('/?openBirth=1&next=/destiny-map/theme')
  }, [initialBirthInfo.birthDate, locale, router])

  const handleSubmit = useCallback(
    (info: BirthInfo) => {
      const params = new URLSearchParams()
      params.set('birthDate', info.birthDate)
      if (info.birthTime) params.set('birthTime', info.birthTime)
      if (info.birthCity) params.set('city', info.birthCity)
      if (typeof info.latitude === 'number') params.set('latitude', String(info.latitude))
      if (typeof info.longitude === 'number') params.set('longitude', String(info.longitude))
      if (info.timezone) params.set('userTz', info.timezone)
      if (info.gender) params.set('gender', info.gender)
      router.push(`/destiny-map/result?${params.toString()}`)
    },
    [router]
  )

  // Particle background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    const ctx = ctx2d;
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
            this.x -= forceDirectionX * force * 2;
            this.y -= forceDirectionY * force * 2;
          }
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    function init() {
      particlesArray = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) particlesArray.push(new ParticleImpl());
    }

    function connect() {
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a + 1; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < MAX_LINK_DISTANCE) {
            ctx.strokeStyle = `rgba(167, 139, 250, ${1 - distance / MAX_LINK_DISTANCE})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate(currentTime: number) {
      raf = requestAnimationFrame(animate);
      if (currentTime - lastFrame < frameInterval) return;
      lastFrame = currentTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particlesArray) {
        p.update();
        p.draw();
      }
      connect();
    }

    init();
    animate(0);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (bootSplash) {
    return <BrandSplash message={locale === 'ko' ? '무료 리포트 준비 중…' : 'Preparing your free report…'} />
  }

  return (
    <main className={styles.container}>
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      <section className={styles.card}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              {locale === 'ko' ? '무료 리포트 시작' : 'Start Free Report'}
            </h1>
            <p className={styles.subtitle}>
              {locale === 'ko'
                ? '생년월일·출생시간·도시·성별을 입력하면 사주·점성 기반 무료 인사이트를 만들어 드려요.'
                : 'Enter your birth info — we generate Saju + Astrology insights instantly.'}
            </p>
          </div>
        </header>

        <UnifiedBirthForm
          locale={locale === 'ko' ? 'ko' : 'en'}
          initialData={initialBirthInfo}
          includeProfileLoader={true}
          includeCity={true}
          includeTime={true}
          includeGender={true}
          allowTimeUnknown={true}
          genderFormat="short"
          showHeader={false}
          submitButtonText={locale === 'ko' ? '무료 인사이트 보기 →' : 'View Free Insights →'}
          submitButtonIcon="✨"
          onSubmit={handleSubmit}
        />
      </section>
    </main>
  );
}
