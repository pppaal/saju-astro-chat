import React from "react";
import styles from "./result.module.css";
import { analyzeDestiny } from "@/components/destiny-map/Analyzer";
import Display from "@/components/destiny-map/Display";

// 1) 유틸: 텍스트 → 점수/장식/퀘스트
const POS = ["강하다","기회","성장","혁신","집중력","성공","몰두","통찰","유리","활성화"];
const NEG = ["부족","주의","갈등","불안정","과열","지연","제약","소모","긴장","위험"];
const MAP = {
  career: ["목표","직업","커리어","일","사회","전문","명예","직위","집중"],
  love: ["연애","관계","파트너","대인","감정","배려","사랑","상대","소통"],
  health: ["건강","체력","휴식","컨디션","스트레스","수면","리듬","과로","회복"],
};

function scoreFromText(text: string) {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const base = 60;
  const posCount = (text.match(new RegExp(POS.join("|"), "g"))?.length ?? 0);
  const negCount = (text.match(new RegExp(NEG.join("|"), "g"))?.length ?? 0);
  const sectionScore = (keys: string[]) => {
    const lower = text.toLowerCase();
    let s = base + posCount * 2 - negCount * 2;
    for (const k of keys) if (lower.includes(k)) s += 2;
    return clamp(s);
  };
  return {
    overall: clamp(base + posCount * 2 - negCount * 2),
    career: sectionScore(MAP.career),
    love: sectionScore(MAP.love),
    health: sectionScore(MAP.health),
  };
}

function decorateText(htmlOrMd: string) {
  const highlights = [
    { k: "혁신", cls: "badge good" },
    { k: "집중", cls: "badge good" },
    { k: "기회", cls: "badge good" },
    { k: "성장", cls: "badge good" },
    { k: "갈등", cls: "badge warn" },
    { k: "주의", cls: "badge warn" },
    { k: "부족", cls: "badge warn" },
  ];
  let s = htmlOrMd;
  for (const { k, cls } of highlights) {
    const re = new RegExp(k, "g");
    s = s.replace(re, `<mark class="${cls}">${k}</mark>`);
  }
  return s;
}

function makeQuests(text: string) {
  const qs: { title: string; why: string; impact: "S" | "M" | "L" }[] = [];
  if (text.includes("의사소통") || text.includes("소통") || text.includes("수성")) {
    qs.push({ title: "하루 10문장 스피치 노트", why: "수성 역행/소통 이슈 상쇄", impact: "M" });
  }
  if (text.includes("갈등") || text.includes("화성") || text.includes("7하우스")) {
    qs.push({ title: "관계 룰 3가지 합의", why: "대인 갈등 감소", impact: "L" });
  }
  if (text.includes("화 기운 부족") || text.includes("활동력")) {
    qs.push({ title: "주 3회 20분 유산소", why: "화(火) 보충과 리듬 안정", impact: "M" });
  }
  if (qs.length < 3) qs.push({ title: "주간 리플렉션 15분", why: "정리·통찰 강화", impact: "S" });
  return qs.slice(0, 3);
}

type SP = Record<string, string | undefined>;

type UIResult = {
  scores: { overall: number; career: number; love: number; health: number };
  insights: { text: string; level: 1 | 2 | 3 }[];
};

function toPercent(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0%";
  return Math.min(100, Math.max(0, n)) + "%";
}

// gemini.text를 최우선으로 쓰는 어댑터
function adaptToUI(result: any): UIResult {
  const num = (v: any) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : NaN;
  };

  // 1) 점수 원본 시도
  let scores = {
    overall: num(result?.score ?? result?.overall ?? result?.scores?.overall ?? result?.scores?.total ?? result?.total),
    career:  num(result?.careerScore ?? result?.scores?.career ?? result?.scores?.work ?? result?.career),
    love:    num(result?.loveScore ?? result?.scores?.love ?? result?.scores?.romance ?? result?.love),
    health:  num(result?.healthScore ?? result?.scores?.health ?? result?.scores?.vitality ?? result?.health),
  };

  // 2) 텍스트 소스: gemini.text 최우선 + 기타 보조
  const r: any = result;
  const textBlob = [
    r?.gemini?.text,
    r?.summary, r?.markdown, r?.plainText, r?.text, r?.content,
    r?.report, r?.html, r?.message, r?.body,
  ].filter(Boolean).join("\n");

  // 3) 점수 부족 시 텍스트로 추정
  if ([scores.overall, scores.career, scores.love, scores.health].some((v) => !Number.isFinite(v))) {
    const est = scoreFromText(textBlob || "");
    scores = {
      overall: Number.isFinite(scores.overall) ? (scores.overall as number) : est.overall,
      career:  Number.isFinite(scores.career)  ? (scores.career as number)  : est.career,
      love:    Number.isFinite(scores.love)    ? (scores.love as number)    : est.love,
      health:  Number.isFinite(scores.health)  ? (scores.health as number)  : est.health,
    };
  }

  // 4) 인사이트: gemini.highlights 우선
  let insights: UIResult["insights"] = [];
  if (Array.isArray(r?.gemini?.highlights) && r.gemini.highlights.length) {
    insights = r.gemini.highlights.slice(0, 3).map((t: any, i: number) => ({
      text: String(t),
      level: (i ? 2 : 1) as 1 | 2,
    }));
  } else if (typeof textBlob === "string" && textBlob.trim()) {
    const sentences = textBlob
      .replace(/[#*>\-`]/g, " ")
      .split(/(?<=[.!?])\s+|(?<=\.)\s+|(?<=\!)\s+|(?<=\?)\s+/)
      .filter((v) => v && v.trim().length > 3)
      .slice(0, 3);
    insights = sentences.map((s, i) => ({ text: s.trim(), level: (i ? 2 : 1) as 1 | 2 }));
  }

  return {
    scores: {
      overall: scores.overall ?? 60,
      career:  scores.career  ?? 60,
      love:    scores.love    ?? 60,
      health:  scores.health  ?? 60,
    },
    insights,
  };
}

export default async function DestinyResultPage({
  searchParams,
}: {
  searchParams: Promise<SP>; // Next 15: 비동기
}) {
  const sp = await searchParams;

  const name = sp.name ?? "";
  const birthDate = sp.birthDate ?? "";
  const birthTime = sp.birthTime ?? "";
  const city = sp.city ?? "";
  const gender = sp.gender ?? "";

  const raw = await analyzeDestiny({ name, birthDate, birthTime, city, gender });
  const ui = adaptToUI(raw);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Destiny Map -- Results</h1>
          <p className={styles.subtitle}>
            Holistic reading using your Saju pillars and luck cycles with Astrology.
          </p>

        <div className={styles.profile}>
          <span className={styles.kv}><b>Name:</b> {name || "--"}</span>
          <span className={styles.kv}><b>Birth Date:</b> {birthDate || "--"}</span>
          <span className={styles.kv}><b>Birth Time:</b> {birthTime || "--"}</span>
          <span className={styles.kv}><b>City:</b> {city || "--"}</span>
          <span className={styles.kv}><b>Gender:</b> {gender || "--"}</span>
        </div>

        <div className={styles.summaryBar}>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Overall</span>
            <span className={styles.kpiValue}>{ui.scores.overall}</span>
            <div className={styles.meter}><i style={{ width: toPercent(ui.scores.overall) }} /></div>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Career</span>
            <span className={styles.kpiValue}>{ui.scores.career}</span>
            <div className={styles.meter}><i style={{ width: toPercent(ui.scores.career) }} /></div>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Relationship</span>
            <span className={styles.kpiValue}>{ui.scores.love}</span>
            <div className={styles.meter}><i style={{ width: toPercent(ui.scores.love) }} /></div>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Health</span>
            <span className={styles.kpiValue}>{ui.scores.health}</span>
            <div className={styles.meter}><i style={{ width: toPercent(ui.scores.health) }} /></div>
          </div>
        </div>

        {ui.insights.length > 0 && (
          <ul className={styles.insights}>
            {ui.insights.map((it, i) => (
              <li key={i} className={`${styles.insight} ${styles[`lvl${it.level}`]}`}>
                <span className={styles.dot} />
                <span className={styles.insightText}>{it.text}</span>
              </li>
            ))}
          </ul>
        )}
        </header>

        {/* 원래 포맷 그대로: Display 결과 본문 */}
        <Display result={raw} />

        {/* Action Quests: gemini.text 기반 */}
        {(() => {
          const r: any = raw;
          const textBlob = [
            r?.gemini?.text,
            r?.summary, r?.markdown, r?.plainText, r?.text, r?.content,
            r?.report, r?.html, r?.message, r?.body,
          ].filter(Boolean).join("\n");
          const quests = makeQuests(textBlob || "");
          return quests.length ? (
            <section className={styles.section}>
              <h2 className={styles.h2}>Action Quests</h2>
              <div className={styles.questGrid}>
                {quests.map((q: any, i: number) => (
                  <div key={i} className={styles.quest}>
                    <h4>
                      {q.title}{" "}
                      <span className={`${styles.badgeImpact} ${styles[q.impact]}`}>{q.impact}</span>
                    </h4>
                    <p style={{ margin: 0, opacity: 0.9 }}>{q.why}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null;
        })()}

        {/* Decorated Summary: 키워드 하이라이트 */}
        {(() => {
          const r: any = raw;
          const textBlob = [
            r?.gemini?.text,
            r?.summary, r?.markdown, r?.plainText, r?.text, r?.content,
            r?.report, r?.html, r?.message, r?.body,
          ].filter(Boolean).join("\n");
          if (!textBlob) return null;
          const deco = decorateText(textBlob);
          return (
            <section className={styles.section}>
              <details className={styles.acc}>
                <summary>Decorated Summary</summary>
                <div dangerouslySetInnerHTML={{ __html: deco }} />
              </details>
            </section>
          );
        })()}

        <footer className={styles.footer}>
          <a className={styles.back} href="/destiny-map">← Back to form</a>
        </footer>
      </section>
    </main>
  );
}