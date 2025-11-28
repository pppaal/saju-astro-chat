// src/app/about/page.tsx
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import { useI18n } from "@/i18n/I18nProvider";

/** 섹션 등장 애니메이션(페이드업) */
function useReveal(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) el.classList.add("reveal-in");
        });
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/** 오보이드(타원형) 캔버스 씬: 성운/별/오비탈/웨이브 */
function useOvoidScene(canvasId: string) {
  useEffect(() => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    const getW = () => (canvas.clientWidth || canvas.width / DPR);
    const getH = () => (canvas.clientHeight || canvas.height / DPR);

    function resize() {
      // 캔버스가 DOM에서 제거되었을 수 있으므로 가드
      if (!canvas) return;
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(720, Math.floor(rect.width));
      const h = Math.max(320, Math.floor(rect.height));
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const stars: { x: number; y: number; r: number; s: number }[] = [];
    function initStars(count = 140) {
      stars.length = 0;
      const w = getW();
      const h = getH();
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.6 + 0.3,
          s: Math.random() * 0.6 + 0.4, // twinkle speed
        });
      }
    }
    initStars();

    let t = 0;
    function draw() {
      // 캔버스/컨텍스트가 유효한지 매 프레임 가드
      if (!canvas || !ctx) return;

      const w = getW();
      const h = getH();

      t += 0.002;

      // background gradient
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#111632");
      g.addColorStop(1, "#18122e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // nebula blobs
      const cx = w * (0.35 + 0.05 * Math.sin(t * 0.8));
      const cy = h * (0.5 + 0.06 * Math.cos(t * 0.6));
      const radial1 = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(w, h) * 0.7);
      radial1.addColorStop(0, "rgba(168,153,255,0.14)");
      radial1.addColorStop(1, "transparent");
      ctx.fillStyle = radial1;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(w, h), 0, Math.PI * 2);
      ctx.fill();

      const cx2 = w * (0.72 + 0.04 * Math.cos(t * 0.7));
      const cy2 = h * (0.55 + 0.05 * Math.sin(t * 0.9));
      const radial2 = ctx.createRadialGradient(cx2, cy2, 10, cx2, cy2, Math.max(w, h) * 0.6);
      radial2.addColorStop(0, "rgba(255,142,220,0.10)");
      radial2.addColorStop(1, "transparent");
      ctx.fillStyle = radial2;
      ctx.beginPath();
      ctx.arc(cx2, cy2, Math.max(w, h), 0, Math.PI * 2);
      ctx.fill();

      // stars with twinkle
      for (const s of stars) {
        const a = 0.5 + 0.5 * Math.sin(t * 4 * s.s + (s.x + s.y) * 0.02);
        ctx.globalAlpha = 0.3 + 0.7 * a;
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // orbital lines
      ctx.save();
      ctx.translate(w * 0.52, h * 0.52);
      ctx.rotate(t * 0.2);
      ctx.strokeStyle = "rgba(168,153,255,0.35)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const rx = 120 + i * 26;
        const ry = 64 + i * 18;
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.02) {
          const x = Math.cos(a) * rx;
          const y = Math.sin(a) * ry;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();

      // subtle wave glow
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(176,192,255,0.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const baseY = h * 0.65;
      for (let x = 0; x <= w; x += 6) {
        const y = baseY + Math.sin(x * 0.02 + t * 2) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [canvasId]);
}

export default function AboutPage() {
  const { t } = useI18n();

  const heroRef = useRef<HTMLElement | null>(null);
  const visualRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLElement | null>(null);

  useReveal(heroRef);
  useReveal(visualRef);
  useReveal(gridRef);
  useOvoidScene("ppCanvas");

  return (
    <div className="pp-wrapper">
      {/* 상단 고정 뒤로가기 */}
      <div className="pp-back">
        <BackButton />
      </div>

      {/* 1) Hero */}
      <section ref={heroRef} className="pp-hero reveal">
        <h1 className="pp-title">
          별과 기운을 읽고,
          <br />
          당신의 선택을 더 똑똑하게.
        </h1>
        <p className="pp-sub">
          출생 데이터와 체계화된 해석 프레임으로 사주·점성학·주역·타로를 한 곳에.
          정확한 입력과 윤리적 가이드를 바탕으로, 단정적 예언이 아닌 실용적 힌트를 제공합니다.
        </p>
        <div className="pp-ctaRow">
          <Link href="/destiny-map" className="btn-primary">{t("about.tryDestinyMap")}</Link>
          <Link href="/about/features" className="btn-ghost">{t("about.seeFeatures")}</Link>
        </div>
      </section>

      {/* 2) Ovoid visual + copy */}
      <section ref={visualRef} className="pp-visual reveal" aria-label="overview visual">
        <div className="pp-ovoid">
          <canvas id="ppCanvas" />
        </div>
        <div className="pp-visualCopy">
          <h2>전 세계가 사랑한 방식으로, 당신만의 운세 내비게이션</h2>
          <p>
            간결한 인터페이스와 신뢰 가능한 계산 로직. 시간대·절기·DST 등을 올바르게 반영하고,
            결과는 이해하기 쉬운 언어로 번역합니다.
          </p>
        </div>
      </section>

      {/* 3) Product group grid */}
      <section ref={gridRef} className="pp-discover reveal">
        <h2>우리가 제공하는 네 가지 프레임</h2>
        <p className="pp-discoverSub">
          질문에 맞게 선택하거나 함께 사용해 타이밍과 주제를 교차 검증하세요.
        </p>

        <div className="pp-grid">
          {/* 사주 */}
          <article className="pp-card">
            <div className="pp-cardHead">
              <span className="pp-dot saju" aria-hidden="true" />
              <h3>사주(명리)</h3>
            </div>
            <p>연·월·일·시를 천간·지지로 풀어 오행 균형과 대운·세운 등 장기 사이클을 해석합니다.</p>
            <ul className="pp-bullets">
              <li>강점: 장기 주제 전환, 기운 밸런스</li>
              <li>정확도: 출생 시각·절기 보정의 정확성</li>
            </ul>
            <div className="pp-actions">
              <Link href="/saju" className="btn-soft">사주 보러가기</Link>
              <details className="pp-acc">
                <summary>자세히</summary>
                <div>시주가 바뀌면 성향·타이밍이 달라질 수 있어요. 절기 경계/지역력 보정이 중요합니다.</div>
              </details>
            </div>
          </article>

          {/* 점성학 */}
          <article className="pp-card">
            <div className="pp-cardHead">
              <span className="pp-dot astro" aria-hidden="true" />
              <h3>점성학(Astrology)</h3>
            </div>
            <p>출생 차트의 행성·사인·하우스·각을 읽고 트랜짓/리턴으로 타이밍을 봅니다.</p>
            <ul className="pp-bullets">
              <li>강점: 영역별 디테일(하우스), 심리·관계 패턴</li>
              <li>정확도: 시각·타임존/DST·하우스 시스템</li>
            </ul>
            <div className="pp-actions">
              <Link href="/astrology" className="btn-soft">점성술 보러가기</Link>
              <details className="pp-acc">
                <summary>자세히</summary>
                <div>시각 5~15분 오차도 ASC/하우스를 바꿀 수 있습니다. 병원기록+DST 반영 권장.</div>
              </details>
            </div>
          </article>

          {/* 주역 */}
          <article className="pp-card">
            <div className="pp-cardHead">
              <span className="pp-dot iching" aria-hidden="true" />
              <h3>주역(I Ching)</h3>
            </div>
            <p>64괘의 상징 언어로 현재의 흐름과 전환 지점을 포착합니다.</p>
            <ul className="pp-bullets">
              <li>강점: 선택 갈림길에서 방향성 힌트</li>
              <li>정확도: 질문 품질과 맥락 정리</li>
            </ul>
            <div className="pp-actions">
              <Link href="/iching" className="btn-soft">주역 보러가기</Link>
              <details className="pp-acc">
                <summary>자세히</summary>
                <div>“예/아니오”보다 열린 질문이 더 선명한 조언을 이끌어냅니다.</div>
              </details>
            </div>
          </article>

          {/* 타로 */}
          <article className="pp-card">
            <div className="pp-cardHead">
              <span className="pp-dot tarot" aria-hidden="true" />
              <h3>타로(Tarot)</h3>
            </div>
            <p>상징 카드로 현재 심리·관계의 패턴을 드러내고, 즉각적인 행동 가이드를 제공합니다.</p>
            <ul className="pp-bullets">
              <li>강점: 빠른 인사이트, 코칭 친화적</li>
              <li>정확도: 질문 구체성·스프레드·리롤 전략</li>
            </ul>
            <div className="pp-actions">
              <Link href="/tarot" className="btn-soft">타로 보러가기</Link>
              <details className="pp-acc">
                <summary>자세히</summary>
                <div>같은 카드도 맥락/위치에 따라 메시지가 달라져요. 행동 시나리오와 함께 보세요.</div>
              </details>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}