"use client";

import { useEffect } from "react";

interface OvoidCanvasProps {
  canvasId: string;
  className?: string;
}

export default function OvoidCanvas({ canvasId, className }: OvoidCanvasProps) {
  useEffect(() => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    const getW = () => canvas.clientWidth || canvas.width / DPR;
    const getH = () => canvas.clientHeight || canvas.height / DPR;

    function resize() {
      if (!canvas || !ctx) return;
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
          s: Math.random() * 0.6 + 0.4,
        });
      }
    }
    initStars();

    let t = 0;
    function draw() {
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

  return <canvas id={canvasId} className={className} />;
}
