import React from "react";
import styles from "./result.module.css";
import { analyzeDestiny } from "@/components/destiny-map/Analyzer";
import Display from "@/components/destiny-map/Display";

const POS = [
  "strong",
  "opportunity",
  "growth",
  "innovation",
  "focus",
  "success",
  "momentum",
  "clarity",
  "advantage",
  "energized",
  "synergy",
  "alignment",
];
const NEG = [
  "lack",
  "warning",
  "conflict",
  "instability",
  "overheated",
  "delay",
  "restriction",
  "drain",
  "tension",
  "risk",
  "exhaustion",
  "fatigue",
];
const MAP = {
  career: ["career", "profession", "work", "leadership", "wealth", "ambition", "achievement"],
  love: ["relationship", "partner", "collaboration", "team", "emotions", "bond"],
  health: ["health", "vitality", "energy", "wellbeing", "balance", "stress", "restoration"],
};

function scoreFromText(text: string) {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const base = 60;
  const patternPos = new RegExp(`\\b(${POS.join("|")})\\b`, "gi");
  const patternNeg = new RegExp(`\\b(${NEG.join("|")})\\b`, "gi");
  const posCount = text.match(patternPos)?.length ?? 0;
  const negCount = text.match(patternNeg)?.length ?? 0;
  const sectionScore = (keywords: string[]) => {
    const lower = text.toLowerCase();
    let s = base + posCount * 2 - negCount * 2;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) s += 2;
    }
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
    { k: "opportunity", cls: "badge good" },
    { k: "alignment", cls: "badge good" },
    { k: "clarity", cls: "badge good" },
    { k: "growth", cls: "badge good" },
    { k: "warning", cls: "badge warn" },
    { k: "conflict", cls: "badge warn" },
    { k: "restriction", cls: "badge warn" },
  ];
  let s = htmlOrMd;
  for (const { k, cls } of highlights) {
    const re = new RegExp(k, "gi");
    s = s.replace(re, (match) => `<mark class="${cls}">${match}</mark>`);
  }
  return s;
}

function makeQuests(text: string) {
  const quests: { title: string; why: string; impact: "S" | "M" | "L" }[] = [];
  const lower = text.toLowerCase();
  if (lower.includes("communication") || lower.includes("mercury") || lower.includes("air element")) {
    quests.push({
      title: "Daily communication sprint",
      why: "Balances Mercury and the Air element—keeps dialogues crisp.",
      impact: "M",
    });
  }
  if (lower.includes("conflict") || lower.includes("mars") || lower.includes("seventh house")) {
    quests.push({
      title: "Partnership alignment charter",
      why: "Defuses Martial friction in collaborative zones.",
      impact: "L",
    });
  }
  if (lower.includes("low fire") || lower.includes("vitality deficit") || lower.includes("burnout risk")) {
    quests.push({
      title: "3x weekly cardio ignition",
      why: "Restores Fire energy and anchors routine rhythm.",
      impact: "M",
    });
  }
  if (quests.length < 3) {
    quests.push({
      title: "Weekly 20-minute reflection",
      why: "Integrates Saju insights with astro transits for conscious decisions.",
      impact: "S",
    });
  }
  return quests.slice(0, 3);
}

type SearchParams = Record<string, string | string[] | undefined>;

type UIResult = {
  scores: { overall: number; career: number; love: number; health: number };
  insights: { text: string; level: 1 | 2 | 3 }[];
};

function toPercent(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0%";
  return `${Math.min(100, Math.max(0, n))}%`;
}

function gatherText(result: unknown): string {
  const r = result as Record<string, any>;
  return [
    r?.gemini?.text,
    r?.summary,
    r?.markdown,
    r?.plainText,
    r?.text,
    r?.content,
    r?.report,
    r?.html,
    r?.message,
    r?.body,
  ]
    .filter(Boolean)
    .join("\n");
}

function adaptToUI(result: any): UIResult {
  const r = result as Record<string, any>;
  const num = (v: any) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : NaN;
  };

  let scores = {
    overall: num(r?.score ?? r?.overall ?? r?.scores?.overall ?? r?.scores?.total ?? r?.total),
    career: num(r?.careerScore ?? r?.scores?.career ?? r?.scores?.work ?? r?.career),
    love: num(r?.loveScore ?? r?.scores?.love ?? r?.scores?.relationship ?? r?.love),
    health: num(r?.healthScore ?? r?.scores?.health ?? r?.scores?.vitality ?? r?.health),
  };

  const textBlob = gatherText(r);

  if ([scores.overall, scores.career, scores.love, scores.health].some((v) => !Number.isFinite(v))) {
    const est = scoreFromText(textBlob || "");
    scores = {
      overall: Number.isFinite(scores.overall) ? (scores.overall as number) : est.overall,
      career: Number.isFinite(scores.career) ? (scores.career as number) : est.career,
      love: Number.isFinite(scores.love) ? (scores.love as number) : est.love,
      health: Number.isFinite(scores.health) ? (scores.health as number) : est.health,
    };
  }

  let insights: UIResult["insights"] = [];
  if (Array.isArray(r?.gemini?.highlights) && r.gemini.highlights.length) {
    insights = r.gemini.highlights.slice(0, 3).map((item: any, i: number) => ({
      text: String(item),
      level: (i ? 2 : 1) as 1 | 2,
    }));
  } else if (typeof textBlob === "string" && textBlob.trim()) {
    const sentences = textBlob
      .replace(/[#*>\-`]/g, " ")
      .split(/(?<=[.!?])\s+/)
      .filter((v) => v && v.trim().length > 3)
      .slice(0, 3);
    insights = sentences.map((s, i) => ({ text: s.trim(), level: (i ? 2 : 1) as 1 | 2 }));
  }

  return {
    scores: {
      overall: scores.overall ?? 60,
      career: scores.career ?? 60,
      love: scores.love ?? 60,
      health: scores.health ?? 60,
    },
    insights,
  };
}

export default async function DestinyResultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const name = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? "";
  const birthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? "";
  const birthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? "";
  const city = (Array.isArray(sp.city) ? sp.city[0] : sp.city) ?? "";
  const gender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? "";

  const raw = await analyzeDestiny({ name, birthDate, birthTime, city, gender });
  const ui = adaptToUI(raw);
  const textBlob = gatherText(raw);
  const quests = makeQuests(textBlob || "");
  const decorated = textBlob ? decorateText(textBlob) : null;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Destiny Map — Integrated Report</h1>
          <p className={styles.subtitle}>
            A synthesis of your Korean Four Pillars cycles and Western astrological chart.
          </p>

          <div className={styles.profile}>
            <span className={styles.kv}>
              <b>Name:</b> {name || "--"}
            </span>
            <span className={styles.kv}>
              <b>Birth Date:</b> {birthDate || "--"}
            </span>
            <span className={styles.kv}>
              <b>Birth Time:</b> {birthTime || "--"}
            </span>
            <span className={styles.kv}>
              <b>City:</b> {city || "--"}
            </span>
            <span className={styles.kv}>
              <b>Gender:</b> {gender || "--"}
            </span>
          </div>

          <div className={styles.summaryBar}>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Overall</span>
              <span className={styles.kpiValue}>{ui.scores.overall}</span>
              <div className={styles.meter}>
                <i style={{ width: toPercent(ui.scores.overall) }} />
              </div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Career</span>
              <span className={styles.kpiValue}>{ui.scores.career}</span>
              <div className={styles.meter}>
                <i style={{ width: toPercent(ui.scores.career) }} />
              </div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Relationship</span>
              <span className={styles.kpiValue}>{ui.scores.love}</span>
              <div className={styles.meter}>
                <i style={{ width: toPercent(ui.scores.love) }} />
              </div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Vitality</span>
              <span className={styles.kpiValue}>{ui.scores.health}</span>
              <div className={styles.meter}>
                <i style={{ width: toPercent(ui.scores.health) }} />
              </div>
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

        <Display result={raw} />

        {quests.length ? (
          <section className={styles.section}>
            <h2 className={styles.h2}>Action Quests</h2>
            <div className={styles.questGrid}>
              {quests.map((q, i) => (
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
        ) : null}

        {decorated ? (
          <section className={styles.section}>
            <details className={styles.acc}>
              <summary>Decorated Summary</summary>
              <div dangerouslySetInnerHTML={{ __html: decorated }} />
            </details>
          </section>
        ) : null}

        <footer className={styles.footer}>
          <a className={styles.back} href="/destiny-map">
            ← Back to form
          </a>
        </footer>
      </section>
    </main>
  );
}