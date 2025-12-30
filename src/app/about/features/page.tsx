// src/app/about/features/page.tsx
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

/** 오보이드(타원형) 캔버스 씬 */
function useOvoidScene(canvasId: string) {
  useEffect(() => {
    const el = document.getElementById(canvasId);
    if (!(el instanceof HTMLCanvasElement)) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const canvas = el;
    let raf = 0;
    let lastFrame = 0;
    const frameInterval = 1000 / 30;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    const getW = () => canvas.clientWidth || canvas.width / DPR;
    const getH = () => canvas.clientHeight || canvas.height / DPR;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(720, Math.floor(rect.width));
      const h = Math.max(320, Math.floor(rect.height));
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const stars: { x: number; y: number; r: number; s: number }[] = [];
    const initStars = (count = 120) => {
      stars.length = 0;
      const w = getW();
      const h = getH();
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.5 + 0.3,
          s: Math.random() * 0.6 + 0.4,
        });
      }
    };
    initStars();

    let t = 0;
    const draw = (timestamp = 0) => {
      if (timestamp - lastFrame < frameInterval) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastFrame = timestamp;
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

      // stars
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

      // subtle wave
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
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [canvasId]);
}

export default function AboutFeaturesPage() {
  const { t } = useI18n();

  // i18n 키가 없을 때 즉시 보이는 기본 설명 사용
  const tt = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const heroRef = useRef<HTMLElement | null>(null);
  const visualRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLElement | null>(null);

  useReveal(heroRef);
  useReveal(visualRef);
  useReveal(gridRef);
  useOvoidScene("featuresCanvas");

  return (
    <div className="pp-wrapper">
      <div className="pp-back">
        <BackButton />
      </div>

      {/* 1) Hero */}
      <section ref={heroRef} className="pp-hero reveal">
        <h1 className="pp-title">
          {tt("about.features.title", "모멘트를 읽는 네 가지 방법")}
        </h1>
        <p className="pp-sub">
          {tt(
            "about.features.subtitle",
            "서로 보완되는 네 프레임. 하나씩 빠르게 보거나, 함께 사용해 주제와 타이밍을 교차 검증하세요."
          )}
        </p>
        <div className="pp-ctaRow">
          <Link href="/destiny-map" className="btn-primary">
            {tt("about.tryDestinyMap", "Destiny Map 체험")}
          </Link>
          <Link href="/about" className="btn-ghost">
            {tt("common.backToAbout", "About으로 돌아가기")}
          </Link>
        </div>
      </section>

      {/* 2) Visual + 설명 불릿 */}
      <section ref={visualRef} className="pp-visual reveal" aria-label="features overview visual">
        <div className="pp-ovoid">
          <canvas id="featuresCanvas" />
        </div>
        <div className="pp-visualCopy">
          <h2>{tt("about.features.visualTitle", "깔끔한 인터페이스, 믿을 수 있는 계산")}</h2>
          <p>
            {tt(
              "about.features.visualDesc",
              "도시·타임존·절기·서머타임을 반영해 시점을 정확히 계산합니다. 결과는 과장 없이 일상 언어로 설명합니다."
            )}
          </p>
          <ul className="pp-bullets">
            <li>
              {tt(
                "about.features.visualBullet1",
                "출생 시각 불확실성 처리: 민감 하우스 표시와 시간대 후보 비교"
              )}
            </li>
            <li>
              {tt(
                "about.features.visualBullet2",
                "윤리 가이드: 단정적 예언 대신 선택을 돕는 맥락·리스크 제시"
              )}
            </li>
            <li>
              {tt(
                "about.features.visualBullet3",
                "접근성: 키보드 탐색, 명도 대비, 요약문 제공"
              )}
            </li>
          </ul>
        </div>
      </section>

      {/* 3) Grid */}
      <section ref={gridRef} className="pp-discover reveal">
        <h2>{tt("about.features.gridTitle", "기능별 안내")}</h2>
        <p className="pp-discoverSub">
          {tt(
            "about.features.gridSub",
            "주제 정리 → 타이밍 확인 → 실행 아이디어 흐름으로 이어 보세요."
          )}
        </p>

        <div className="pp-grid">
          {/* Numerology */}
          <article className="pp-card">
            <div className="pp-cardHead">
              <span className="pp-dot saju" aria-hidden="true" />
              <h3>Numerology</h3>
            </div>
            <p>
              {tt(
                "about.features.numerology.desc",
                "이름과 생일의 핵심 수로 기질·동기·표현 방식과 올해의 강조점을 요약합니다."
              )}
            </p>
            <ul className="pp-bullets">
              <li>Life Path / Expression / Soul Urge / Personality</li>
              <li>
                {tt(
                  "about.features.numerology.cityTz",
                  "기간 계산 시 도시·타임존 반영으로 날짜 경계 오차 최소화"
                )}
              </li>
              <li>
                {tt(
                  "about.features.numerology.copy",
                  "전문 용어 대신 한 문단 요약과 행동 포인트"
                )}
              </li>
            </ul>
            <div className="pp-actions">
              <Link href="/numerology" className="btn-soft">
                {tt("common.go", "바로 가기")}
              </Link>
              <details className="pp-acc">
                <summary>{tt("common.details", "자세히")}</summary>
                <div>
                  {tt(
                    "about.features.numerology.note",
                    "주제를 이름짓는 데 강합니다. 구체적 타이밍은 점성학/사주와 함께 보완하세요."
                  )}
                </div>
              </details>
            </div>
          </article>

          {/* Tarot */}
          <article className="pp-card">
            <div className="pp-cardHead">
              <span className="pp-dot tarot" aria-hidden="true" />
              <h3>Tarot</h3>
            </div>
            <p>
              {tt(
                "about.features.tarot.desc",
                "상징 카드로 현재의 톤과 선택지별 결과감을 빠르게 보여줍니다."
              )}
            </p>
            <ul className="pp-bullets">
              <li>
                {tt("about.features.tarot.reroll", "리롤 전략과 스프레드 프리셋으로 초점 재설정")}
              </li>
              <li>
                {tt("about.features.tarot.tips", "관계·커리어 등 맥락별 체크리스트와 행동 팁")}
              </li>
            </ul>
            <div className="pp-actions">
              <Link href="/tarot" className="btn-soft">
                {tt("common.go", "바로 가기")}
              </Link>
              <details className="pp-acc">
                <summary>{tt("common.details", "자세히")}</summary>
                <div>
                  {tt(
                    "about.features.tarot.note",
                    "같은 카드라도 위치와 질문이 의미를 바꿉니다. 시나리오별로 비교해 보세요."
                  )}
                </div>
              </details>
            </div>
          </article>

          {/* I Ching */}
          <article className="pp-card">
            <div className="pp-cardHead">
              <span className="pp-dot iching" aria-hidden="true" />
              <h3>I Ching</h3>
            </div>
            <p>
              {tt(
                "about.features.iching.desc",
                "64괘와 변효를 통해 흐름의 방향과 전환 지점을 읽습니다."
              )}
            </p>
            <ul className="pp-bullets">
              <li>{tt("about.features.iching.labels", "변효·지괘 표기를 명확히, 현재/전개 구분")}</li>
              <li>{tt("about.features.iching.hints", "예/아니오보다 열린 질문이 더 좋은 조언")}</li>
            </ul>
            <div className="pp-actions">
              <Link href="/iching" className="btn-soft">
                {tt("common.go", "바로 가기")}
              </Link>
              <details className="pp-acc">
                <summary>{tt("common.details", "자세히")}</summary>
                <div>
                  {tt(
                    "about.features.iching.note",
                    "갈림길에서 쓰기 좋습니다. 구체 시기는 점성학/사주로 확인하세요."
                  )}
                </div>
              </details>
            </div>
          </article>

          {/* Compatibility */}
          <article className="pp-card">
            <div className="pp-cardHead">
              <span className="pp-dot astro" aria-hidden="true" />
              <h3>Compatibility</h3>
            </div>
            <p>
              {tt(
                "about.features.compat.desc",
                "관계의 패턴과 겹치는 사이클을 시각화해 협업·연애에서 호흡을 맞춥니다."
              )}
            </p>
            <ul className="pp-bullets">
              <li>{tt("about.features.compat.graph", "행성 트랜짓/대운 겹침을 그래프로 확인")}</li>
              <li>{tt("about.features.compat.talk", "대화 프롬프트와 갈등 완화 가이드")}</li>
            </ul>
            <div className="pp-actions">
              <Link href="/compatibility" className="btn-soft">
                {tt("common.go", "바로 가기")}
              </Link>
              <details className="pp-acc">
                <summary>{tt("common.details", "자세히")}</summary>
                <div>
                  {tt(
                    "about.features.compat.note",
                    "단일 점수 대신 다차원 비교입니다. 상황 맥락을 함께 읽어 주세요."
                  )}
                </div>
              </details>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
