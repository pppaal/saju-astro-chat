//src/app/destiny-map/result/page.tsx

"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import styles from "./result.module.css";
import { analyzeDestiny } from "@/components/destiny-map/Analyzer";
import Display from "@/components/destiny-map/Display";
// Import retained intentionally; disable unused lint because FortuneCharts is optional rendering
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import FortuneCharts from "@/components/destiny-map/FortuneCharts";

// ✅ searchParams 타입 정의
type SearchParams = Record<string, string | string[] | undefined>;

export default function DestinyResultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // ✅ Next.js 15 동적 API 규칙 — Promise 언래핑
  const sp = React.use(searchParams);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [activeTheme, setActiveTheme] = useState("focus_love");

  // ------------------------------------------------------------ //
  // 🎯 비즈니스 로직
  // ------------------------------------------------------------ //
  useEffect(() => {
    (async () => {
      const name = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? "";
      const birthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? "";
      const birthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? "";
      const city = (Array.isArray(sp.city) ? sp.city[0] : sp.city) ?? "";
      const gender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? "";
      const rawLang = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? "ko";
      const themeParam = (Array.isArray(sp.theme) ? sp.theme[0] : sp.theme) ?? "focus_love";

      const latStr =
        (Array.isArray(sp.lat) ? sp.lat[0] : sp.lat) ??
        (Array.isArray(sp.latitude) ? sp.latitude[0] : sp.latitude);
      const lonStr =
        (Array.isArray(sp.lon) ? sp.lon[0] : sp.lon) ??
        (Array.isArray(sp.longitude) ? sp.longitude[0] : sp.longitude);

      const latitude = latStr ? Number(latStr) : NaN;
      const longitude = lonStr ? Number(lonStr) : NaN;

      setActiveTheme(themeParam);

      if (!birthDate || !birthTime || !city || isNaN(latitude) || isNaN(longitude)) {
        setError("필수 입력값이 누락되었습니다. (birthDate, birthTime, city, latitude, longitude)");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const themesReq = [themeParam];
        const res = await analyzeDestiny({
          name,
          birthDate,
          birthTime,
          city,
          gender,
          latitude,
          longitude,
          lang: rawLang as any,
          themes: themesReq,
        });
        setResult(res);
      } catch (err: any) {
        console.error("[ResultPage] analyzeDestiny error:", err);
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [sp]);

  // ------------------------------------------------------------ //
  // ⏳ 상태별 렌더링
  // ------------------------------------------------------------ //
  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <div style={{ padding: 40, fontSize: 16, textAlign: 'center' }}>⏳ Analyzing your destiny chart...</div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <div style={{ padding: 40, color: "crimson" }}>⚠️ {error}</div>
        </section>
      </main>
    );
  }

  if (!result) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <div style={{ padding: 40 }}>결과를 불러오지 못했습니다.</div>
        </section>
      </main>
    );
  }

  // ------------------------------------------------------------ //
  // ✅ 결과 렌더링
  // ------------------------------------------------------------ //
  const themeKeys = Object.keys(result?.themes || {});
  const lang: any = result?.lang ?? "ko";

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        {/* 🌗 테마 전환 버튼 */}
        {themeKeys.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 16,
              justifyContent: "center",
            }}
          >
            {themeKeys.map((key) => {
              const presetLabels: Record<string, string> = {
                focus_love: "사랑",
                focus_career: "커리어",
                focus_energy: "활력",
              };
              const label = presetLabels[key] ?? key;

              return (
                <button
                  key={key}
                  onClick={() => setActiveTheme(key)}
                  aria-pressed={activeTheme === key}
                  className={styles.badge}
                  style={{
                    background: activeTheme === key ? "#2563eb" : "transparent",
                    color: activeTheme === key ? "#fff" : "inherit",
                    border: `1px solid ${activeTheme === key ? "#2563eb" : "#4b5563"}`,
                    padding: "6px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* 🧮 리포트 본문 렌더 */}
        <Display result={result} lang={lang} theme={activeTheme} reportType="core" />
      </section>
    </main>
  );
}
