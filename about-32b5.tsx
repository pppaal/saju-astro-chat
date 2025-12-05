// src/app/about/page.tsx
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import { useI18n } from "@/i18n/I18nProvider";

/** 8ä¦8àÿ dô¦8PÑ 8òádïêd¬ö8¥¦8àÿ(fÄÿ8¥¦dô£8ùà) */
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

/** 8ÿñd¦¦8¥¦dô£(fâÇ8¢Éfÿò) 8¦öd¦ä8èñ 8ö¼: 8ä¦8Ü¦/d¦ä/8ÿñd¦äfâê/8¢¿8¥¦d+î */
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
      // 8¦öd¦ä8èñO¦Ç DOM8ùÉ8ä£ 8á£O¦¦dÉÿ8ùê8¥ä 8êÿ 8Pê8£+d»Çdí£ O¦Çdô£
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
      // 8¦öd¦ä8èñ/8+¿fàì8èñfè+O¦Ç 8£áfÜ¿fò£8ºÇ dºñ föädáê8Pä O¦Çdô£
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
      {/* 8âüdï¿ O¦á8áò dÆñdí£O¦ÇO+¦ */}
      <div className="pp-back">
        <BackButton />
      </div>

      {/* 1) Hero */}
      <section ref={heroRef} className="pp-hero reveal">
        <h1 className="pp-title">
          d¦äO¦+ O+¦8Ü¦8¥ä 8¥+O¦á,
          <br />
          dï¦8ïá8¥ÿ 8äáfâ¥8¥ä dìö dÿædÿæfòÿO¦î.
        </h1>
        <p className="pp-sub">
          8¦£8â¥ dì¦8¥¦fä¦8ÖÇ 8¦¦O¦äfÖödÉ£ fò¦8ä¥ föädáê8Pä8£+dí£ 8é¼8ú+-+8áÉ8ä¦fòÖ-+8ú+8ù¡-+fâÇdí£dÑ+ fò£ O¦¦8ùÉ.
          8áòfÖòfò£ 8PàdáÑO¦+ 8£ñdª¼8áü O¦Ç8¥¦dô£dÑ+ d¦öfâò8£+dí£, dï¿8áò8áü 8ÿê8û+8¥¦ 8òädïî 8ïñ8Ü¬8áü fPîfè+dÑ+ 8á£O¦¦fò¬dïêdïñ.
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
          <h2>8áä 8ä+O¦äO¦Ç 8é¼dPæfò£ d¦¬8ï¥8£+dí£, dï¦8ïádºî8¥ÿ 8Ü¦8ä+ dé¦d¦äO¦î8¥¦8àÿ</h2>
          <p>
            O¦äO¦¦fò£ 8¥+fä¦fÄÿ8¥¦8èñ8ÖÇ 8ïádó¦ O¦ÇdèÑfò£ O¦ä8é¦ dí£8ºü. 8ï£O¦ädîÇ-+8áêO+¦-+DST dô¦8¥ä 8ÿ¼d¦ödÑ¦O¦î d¦ÿ8ÿüfòÿO¦á,
            O¦¦O¦+dèö 8¥¦fò¦fòÿO+¦ 8ë¼8Ü¦ 8û+8û¦dí£ d¦ê8ù¡fò¬dïêdïñ.
          </p>
        </div>
      </section>

      {/* 3) Product group grid */}
      <section ref={gridRef} className="pp-discover reveal">
        <h2>8Ü¦dª¼O¦Ç 8á£O¦¦fòÿdèö däñ O¦Ç8ºÇ föädáê8Pä</h2>
        <p className="pp-discoverSub">
          8ºêd¼+8ùÉ dºPO¦î 8äáfâ¥fòÿO¦¦déÿ fò¿O+ÿ 8é¼8Ü¬fò¦ fâÇ8¥¦d¦ìO¦+ 8ú+8á£dÑ+ O¦É8¦¿ O¦Ç8ª¥fòÿ8ä+8Üö.
        </p>

        <div className="pp-grid">
          {/* 8é¼8ú+ */}
          <article className="pp-card">
            <div className="pp-cardHead">
              <span className="pp-dot saju" aria-hidden="true" />
              <h3>8é¼8ú+(d¬àdª¼)</h3>
            </div>
            <p>8ù¦-+8¢ö-+8¥+-+8ï£dÑ+ 8¦£O¦ä-+8ºÇ8ºÇdí£ fÆÇ8û¦ 8ÿñfûë O+áfÿòO¦+ dîÇ8Ü¦-+8ä+8Ü¦ dô¦ 8PÑO+¦ 8é¼8¥¦fü¦8¥ä fò¦8ä¥fò¬dïêdïñ.</p>
            <ul className="pp-bullets">
              <li>O¦ò8áÉ: 8PÑO+¦ 8ú+8á£ 8áäfÖÿ, O+¦8Ü¦ d¦+dƒ¦8èñ</li>
              <li>8áòfÖòdÅä: 8¦£8â¥ 8ï£O¦ü-+8áêO+¦ d¦¦8áò8¥ÿ 8áòfÖò8ä¦</li>
            </ul>
            <div className="pp-actions">
              <Link href="/saju" className="btn-soft">8é¼8ú+ d¦¦dƒ¼O¦ÇO+¦</Link>
              <details className="pp-acc">
                <summary>8PÉ8ä+fPê</summary>
                <div>8ï£8ú+O¦Ç d¦ödÇîd¬¦ 8ä¦fûÑ-+fâÇ8¥¦d¦ì8¥¦ dï¼d¥+8ºê 8êÿ 8Pê8û¦8Üö. 8áêO+¦ O¦+O¦ä/8ºÇ8ù¡dáÑ d¦¦8áò8¥¦ 8ñæ8Üöfò¬dïêdïñ.</div>
              </details>
            </div>
          </article>

          {/* 8áÉ8ä¦fòÖ */}
          <article className="pp-card">
            <div className="pp-cardHead">
              <span className="pp-dot astro" aria-hidden="true" />
              <h3>8áÉ8ä¦fòÖ(Astrology)</h3>
            </div>
            <p>8¦£8â¥ 8¦¿fè+8¥ÿ fûë8ä¦-+8é¼8¥+-+fòÿ8Ü¦8èñ-+O¦ü8¥ä 8¥+O¦á fè+dP£8ºô/dª¼fä¦8£+dí£ fâÇ8¥¦d¦ì8¥ä d¦àdïêdïñ.</p>
            <ul className="pp-bullets">
              <li>O¦ò8áÉ: 8ÿü8ù¡d¦ä dööfàî8¥+(fòÿ8Ü¦8èñ), 8ï¼dª¼-+O¦ÇO¦ä fî¿fä¦</li>
              <li>8áòfÖòdÅä: 8ï£O¦ü-+fâÇ8Pä8í¦/DST-+fòÿ8Ü¦8èñ 8ï£8èñfà£</li>
            </ul>
            <div className="pp-actions">
              <Link href="/astrology" className="btn-soft">8áÉ8ä¦8êá d¦¦dƒ¼O¦ÇO+¦</Link>
              <details className="pp-acc">
                <summary>8PÉ8ä+fPê</summary>
                <div>8ï£O¦ü 5~15d¦ä 8ÿñ8¦¿dÅä ASC/fòÿ8Ü¦8èñdÑ+ d¦öO+Ç 8êÿ 8Pê8è¦dïêdïñ. d¦æ8¢ÉO+¦dí¥+DST d¦ÿ8ÿü O¦î8PÑ.</div>
              </details>
            </div>
          </article>

          {/* 8ú+8ù¡ */}
          <article className="pp-card">
            <div className="pp-cardHead">
              <span className="pp-dot iching" aria-hidden="true" />
              <h3>8ú+8ù¡(I Ching)</h3>
            </div>
            <p>64O¦ÿ8¥ÿ 8âü8ºò 8û+8û¦dí£ fÿä8P¼8¥ÿ f¥ÉdªäO¦+ 8áäfÖÿ 8ºÇ8áÉ8¥ä fÅ¼8¦¬fò¬dïêdïñ.</p>
            <ul className="pp-bullets">
              <li>O¦ò8áÉ: 8äáfâ¥ O¦êdª+O++8ùÉ8ä£ d¦¬fûÑ8ä¦ fPîfè+</li>
              <li>8áòfÖòdÅä: 8ºêd¼+ fÆê8ºêO¦+ dºÑd¥+ 8áòdª¼</li>
            </ul>
            <div className="pp-actions">
              <Link href="/iching" className="btn-soft">8ú+8ù¡ d¦¦dƒ¼O¦ÇO+¦</Link>
              <details className="pp-acc">
                <summary>8PÉ8ä+fPê</summary>
                <div>GÇ£8ÿê/8òädïê8ÿñGÇ¥d¦¦dïñ 8ù¦dª¦ 8ºêd¼+8¥¦ dìö 8äád¬àfò£ 8í¦8û+8¥ä 8¥¦düî8û¦dâàdïêdïñ.</div>
              </details>
            </div>
          </article>

          {/* fâÇdí£ */}
          <article className="pp-card">
            <div className="pp-cardHead">
              <span className="pp-dot tarot" aria-hidden="true" />
              <h3>fâÇdí£(Tarot)</h3>
            </div>
            <p>8âü8ºò 8¦¦dô£dí£ fÿä8P¼ 8ï¼dª¼-+O¦ÇO¦ä8¥ÿ fî¿fä¦8¥ä dô£dƒ¼dé¦O¦á, 8ªëO¦ü8áü8¥+ fûëdÅÖ O¦Ç8¥¦dô£dÑ+ 8á£O¦¦fò¬dïêdïñ.</p>
            <ul className="pp-bullets">
              <li>O¦ò8áÉ: d¦ádÑ+ 8¥+8é¼8¥¦fè+, 8+ö8¦¡ 8¦£fÖö8áü</li>
              <li>8áòfÖòdÅä: 8ºêd¼+ O¦¼8¦¦8ä¦-+8èñföädáêdô£-+dª¼díñ 8áädP¦</li>
            </ul>
            <div className="pp-actions">
              <Link href="/tarot" className="btn-soft">fâÇdí£ d¦¦dƒ¼O¦ÇO+¦</Link>
              <details className="pp-acc">
                <summary>8PÉ8ä+fPê</summary>
                <div>O¦Ö8¥Ç 8¦¦dô£dÅä dºÑd¥+/8£ä8¦ÿ8ùÉ dö¦d¥+ d¬ö8ï£8ºÇO¦Ç dï¼d¥+8á+8Üö. fûëdÅÖ 8ï£déÿdª¼8ÿñ8ÖÇ fò¿O+ÿ d¦¦8ä+8Üö.</div>
              </details>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
