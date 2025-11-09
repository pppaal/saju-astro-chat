import React from "react";
import styles from "./result.module.css";
import { analyzeDestiny } from "@/components/destiny-map/Analyzer";
import Display from "@/components/destiny-map/Display";

// Simple i18n dictionary (5 languages)
const I18N = {
  en: {
    title: "Destiny Map — Integrated Report",
    subtitle: "A synthesis of your Korean Four Pillars cycles and Western astrological chart.",
    name: "Name",
    birthDate: "Birth Date",
    birthTime: "Birth Time",
    city: "City",
    gender: "Gender",
    overall: "Overall",
    career: "Career",
    relationship: "Relationship",
    vitality: "Vitality",
    actionQuests: "Action Quests",
    decoratedSummary: "Decorated Summary",
    back: "← Back to form",
  },
  ko: {
    title: "운명 지도 — 통합 리포트",
    subtitle: "사주 흐름과 서양 점성술 차트를 통합한 요약입니다.",
    name: "이름",
    birthDate: "생년월일",
    birthTime: "출생시간",
    city: "출생지",
    gender: "성별",
    overall: "종합",
    career: "커리어",
    relationship: "관계",
    vitality: "활력",
    actionQuests: "실천 퀘스트",
    decoratedSummary: "강조 요약",
    back: "← 폼으로 돌아가기",
  },
  ja: {
    title: "デスティニーマップ — 統合レポート",
    subtitle: "四柱推命のサイクルと西洋占星術チャートを統合した要約です。",
    name: "名前",
    birthDate: "生年月日",
    birthTime: "出生時刻",
    city: "出生地",
    gender: "性別",
    overall: "総合",
    career: "キャリア",
    relationship: "関係",
    vitality: "活力",
    actionQuests: "アクションクエスト",
    decoratedSummary: "強調サマリー",
    back: "← フォームに戻る",
  },
  zh: {
    title: "命运地图 — 综合报告",
    subtitle: "整合韩国四柱与西方占星图的综合摘要。",
    name: "姓名",
    birthDate: "出生日期",
    birthTime: "出生时间",
    city: "出生城市",
    gender: "性别",
    overall: "总体",
    career: "事业",
    relationship: "关系",
    vitality: "活力",
    actionQuests: "行动任务",
    decoratedSummary: "重点摘要",
    back: "← 返回表单",
  },
  es: {
    title: "Mapa del Destino — Informe Integrado",
    subtitle: "Una síntesis de tus ciclos de Cuatro Pilares y tu carta de astrología occidental.",
    name: "Nombre",
    birthDate: "Fecha de nacimiento",
    birthTime: "Hora de nacimiento",
    city: "Ciudad",
    gender: "Género",
    overall: "General",
    career: "Carrera",
    relationship: "Relaciones",
    vitality: "Vitalidad",
    actionQuests: "Misiones de acción",
    decoratedSummary: "Resumen destacado",
    back: "← Volver al formulario",
  },
} as const;

type LangKey = keyof typeof I18N;
function t(lang: LangKey) {
  return I18N[lang] ?? I18N.en;
}

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

function makeQuests(text: string, lang: LangKey) {
  const TR = {
    en: {
      comm: { title: "Daily communication sprint", why: "Balances Mercury and the Air element—keeps dialogues crisp." },
      partner: { title: "Partnership alignment charter", why: "Defuses Martial friction in collaborative zones." },
      cardio: { title: "3x weekly cardio ignition", why: "Restores Fire energy and anchors routine rhythm." },
      reflect: { title: "Weekly 20-minute reflection", why: "Integrates Saju insights with astro transits for conscious decisions." },
      kw: {
        comm: ["communication", "mercury", "air element", "dialogue", "message"],
        partner: ["conflict", "mars", "seventh house", "partnership", "relationship"],
        cardio: ["low fire", "vitality deficit", "burnout risk", "low energy", "fatigue"],
      },
    },
    ko: {
      comm: { title: "매일 커뮤니케이션 스프린트", why: "수성/바람 기운의 균형을 맞춰 대화를 또렷하게 유지합니다." },
      partner: { title: "파트너십 정렬 합의서", why: "협업 영역의 화성 마찰을 완화합니다." },
      cardio: { title: "주 3회 유산소 점화", why: "화(火) 기운을 보충하고 루틴 리듬을 고정합니다." },
      reflect: { title: "주 1회 20분 성찰", why: "사주 인사이트와 트랜짓을 통합해 의식적인 결정을 돕습니다." },
      kw: {
        comm: ["소통", "커뮤니케이션", "수성", "바람", "대화", "메시지"],
        partner: ["갈등", "화성", "파트너", "관계", "협업", "제7하우스"],
        cardio: ["화기 부족", "활력 저하", "번아웃", "피로", "기력 저하"],
      },
    },
    ja: {
      comm: { title: "毎日のコミュニケーション・スプリント", why: "水星/風の要素のバランスを整え、対話を明瞭にします。" },
      partner: { title: "パートナーシップ整合チャーター", why: "協働領域での火星的摩擦を和らげます。" },
      cardio: { title: "週3回の有酸素点火", why: "火のエネルギーを補い、ルーチンのリズムを固定します。" },
      reflect: { title: "週1回20分の内省", why: "四柱とトランジットの示唆を統合し、意識的な意思決定を促します。" },
      kw: {
        comm: ["コミュニケーション", "水星", "風", "対話", "メッセージ"],
        partner: ["衝突", "火星", "パートナー", "関係", "第7ハウス", "協働"],
        cardio: ["火不足", "活力低下", "燃え尽き", "疲労"],
      },
    },
    zh: {
      comm: { title: "每日沟通冲刺", why: "平衡水星与风元素，让对话更清晰。" },
      partner: { title: "伙伴关系对齐章程", why: "缓解协作区域中的火星摩擦。" },
      cardio: { title: "每周3次有氧点火", why: "补充火元素并固定日常节律。" },
      reflect: { title: "每周20分钟反思", why: "整合四柱洞见与星象行运，助力更有意识的决策。" },
      kw: {
        comm: ["沟通", "水星", "风象", "对话", "讯息"],
        partner: ["冲突", "火星", "伙伴", "关系", "第七宫", "协作"],
        cardio: ["火元素不足", "活力下降", "倦怠", "疲劳"],
      },
    },
    es: {
      comm: { title: "Sprint diario de comunicación", why: "Equilibra Mercurio y el elemento Aire; mantiene los diálogos nítidos." },
      partner: { title: "Carta de alineación de la pareja", why: "Reduce la fricción marcial en zonas de colaboración." },
      cardio: { title: "Cardio 3 veces por semana", why: "Restaura el Fuego y fija el ritmo de la rutina." },
      reflect: { title: "Reflexión semanal de 20 minutos", why: "Integra la visión del Saju con los tránsitos para decisiones conscientes." },
      kw: {
        comm: ["comunicación", "mercurio", "aire", "diálogo", "mensaje"],
        partner: ["conflicto", "marte", "pareja", "relación", "casa siete", "colaboración"],
        cardio: ["fuego bajo", "baja vitalidad", "riesgo de burnout", "fatiga"],
      },
    },
  }[lang];

  const lower = text.toLowerCase();
  const hasAny = (arr: string[]) => arr.some((k) => lower.includes(k.toLowerCase()));

  const quests: { title: string; why: string; impact: "S" | "M" | "L" }[] = [];
  if (hasAny(TR.kw.comm)) quests.push({ title: TR.comm.title, why: TR.comm.why, impact: "M" });
  if (hasAny(TR.kw.partner)) quests.push({ title: TR.partner.title, why: TR.partner.why, impact: "L" });
  if (hasAny(TR.kw.cardio)) quests.push({ title: TR.cardio.title, why: TR.cardio.why, impact: "M" });
  if (quests.length < 3) quests.push({ title: TR.reflect.title, why: TR.reflect.why, impact: "S" });

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
return typeof r?.interpretation === "string" ? r.interpretation : "";
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

  // language from query (?lang=ko|en|ja|zh|es), default 'en'
  const rawLang = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? "";
  const supported: LangKey[] = ["en", "ko", "ja", "zh", "es"];
  const lang = (supported.includes(rawLang as LangKey) ? (rawLang as LangKey) : "en") as LangKey;
  const tr = t(lang);

  const name = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? "";
  const birthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? "";
  const birthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? "";
  const city = (Array.isArray(sp.city) ? sp.city[0] : sp.city) ?? "";
  const gender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? "";

  const raw = await analyzeDestiny({ name, birthDate, birthTime, city, gender, lang });
  const ui = adaptToUI(raw);
  const textBlob = gatherText(raw);
  const quests = makeQuests(textBlob || "", lang);
  const decorated = textBlob ? decorateText(textBlob) : null;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>{tr.title}</h1>
          <p className={styles.subtitle}>{tr.subtitle}</p>

          <div className={styles.profile}>
            <span className={styles.kv}>
              <b>{tr.name}:</b> {name || "--"}
            </span>
            <span className={styles.kv}>
              <b>{tr.birthDate}:</b> {birthDate || "--"}
            </span>
            <span className={styles.kv}>
              <b>{tr.birthTime}:</b> {birthTime || "--"}
            </span>
            <span className={styles.kv}>
              <b>{tr.city}:</b> {city || "--"}
            </span>
            <span className={styles.kv}>
              <b>{tr.gender}:</b> {gender || "--"}
            </span>
          </div>

          <div className={styles.summaryBar}>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>{tr.overall}</span>
              <span className={styles.kpiValue}>{ui.scores.overall}</span>
              <div className={styles.meter}>
                <i style={{ width: toPercent(ui.scores.overall) }} />
              </div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>{tr.career}</span>
              <span className={styles.kpiValue}>{ui.scores.career}</span>
              <div className={styles.meter}>
                <i style={{ width: toPercent(ui.scores.career) }} />
              </div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>{tr.relationship}</span>
              <span className={styles.kpiValue}>{ui.scores.love}</span>
              <div className={styles.meter}>
                <i style={{ width: toPercent(ui.scores.love) }} />
              </div>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>{tr.vitality}</span>
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

        <Display result={raw} lang={lang} />

        {quests.length ? (
          <section className={styles.section}>
            <h2 className={styles.h2}>{tr.actionQuests}</h2>
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
              <summary>{tr.decoratedSummary}</summary>
              <div dangerouslySetInnerHTML={{ __html: decorated }} />
            </details>
          </section>
        ) : null}

        <footer className={styles.footer}>
          <a className={styles.back} href={`/destiny-map?lang=${lang}`}>
            {tr.back}
          </a>
        </footer>
      </section>
    </main>
  );
}