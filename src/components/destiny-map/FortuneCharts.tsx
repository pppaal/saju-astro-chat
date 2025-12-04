// components/destiny-map/FortuneBubbles.tsx

"use client";
import { useEffect, useMemo, useRef } from "react";
import type { SajuResult } from "@/lib/destiny-map/types";

export default function FortuneBubbles({ saju }: { saju: SajuResult }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const five = useMemo(() => saju?.fiveElements ?? {}, [saju]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const colors: Record<string, string> = {
      목: "#4ade80",
      화: "#fb923c",
      토: "#facc15",
      금: "#cbd5e1",
      수: "#60a5fa",
    };

    const bubbles: {
      x: number;
      y: number;
      r: number;
      dx: number;
      dy: number;
      color: string;
    }[] = [];

    Object.entries(five).forEach(([key, amount]) => {
      const count = Math.max(1, Math.floor((amount ?? 0) / 2));
      for (let i = 0; i < count; i++) {
        bubbles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 6 + 2,
          dx: (Math.random() - 0.5) * 1.5,
          dy: (Math.random() - 0.5) * 1.5,
          color: colors[key] || "#94a3b8",
        });
      }
    });

    let animationId: number;
    let destroyed = false; // ✅ unmount 시 플래그

    const animate = () => {
      if (!ctx || destroyed) return;
      ctx.fillStyle = "rgba(10,10,20,0.25)";
      ctx.fillRect(0, 0, width, height);

      for (const b of bubbles) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();

        b.x += b.dx;
        b.y += b.dy;

        if (b.x < 0 || b.x > width) b.dx *= -1;
        if (b.y < 0 || b.y > height) b.dy *= -1;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    // ✅ cleanup
    return () => {
      destroyed = true;
      if (animationId) cancelAnimationFrame(animationId);
      ctx.clearRect(0, 0, width, height);
    };
  }, [five]);

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <canvas
        ref={ref}
        width={320}
        height={320}
        style={{
          background: "radial-gradient(circle at center,#0d1117,#1f2937)",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
