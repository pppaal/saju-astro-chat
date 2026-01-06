const fs = require("fs");
const path = require("path");

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs" });
require("ts-node/register");
require("tsconfig-paths/register");
require("dotenv").config();

const { computeDestinyMap } = require("../src/lib/destiny-map/astrologyengine.ts");
const {
  buildAllDataPrompt,
} = require("../src/lib/destiny-map/prompt/fortune/base/baseAllDataPrompt.ts");

const API_BASE = "http://127.0.0.1:5000";

function buildHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = process.env.ADMIN_API_TOKEN || process.env.METRICS_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, text, json };
}

async function postStream(url, body, outPath) {
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  fs.writeFileSync(outPath, text, "utf8");
  return { status: res.status, bytes: text.length };
}

function parseSse(text) {
  const events = text.split(/\n\n/);
  let mainText = "";
  let followups = null;

  for (const event of events) {
    if (!event.trim()) continue;
    const lines = event.split(/\r?\n/);
    const dataLines = lines.filter((line) => line.startsWith("data:"));
    if (!dataLines.length) continue;
    const data = dataLines
      .map((line) => line.replace(/^data:\s?/, ""))
      .join("\n");

    if (!data || data === "[DONE]" || data.startsWith("[ERROR]")) {
      continue;
    }
    if (data.startsWith("||FOLLOWUP||")) {
      const jsonPart = data.slice("||FOLLOWUP||".length);
      try {
        followups = JSON.parse(jsonPart);
      } catch {
        followups = null;
      }
      continue;
    }
    mainText += data;
  }

  return { mainText, followups };
}

function stripRagDebug(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("[RAG "))
    .join("\n")
    .trim();
}

function parseRagSummary(text) {
  const line = text
    .split(/\r?\n/)
    .find((l) => {
      const trimmed = l.trimStart();
      return trimmed.startsWith("[RAG 요약]") || trimmed.startsWith("[RAG Summary]");
    });
  if (!line) return {};
  const cleaned = line
    .trimStart()
    .replace("[RAG 요약]", "")
    .replace("[RAG Summary]", "")
    .trim();
  if (!cleaned) return {};
  const meta = {};
  for (const part of cleaned.split(";")) {
    const [key, value] = part.split("=");
    if (!key) continue;
    meta[key.trim()] = value ? value.trim() : "";
  }
  return meta;
}

function evaluateText(text) {
  const timingRegex =
    /(?:\d{1,2}\s*~\s*\d{1,2}\s*월|\d{1,2}\s*월|\d{1,2}\s*주|\d{1,2}\/\d{1,2}|이번\s*달|다음\s*달|다다음\s*달|이번\s*주|다음\s*주|상반기|하반기)/g;
  const weekRegex =
    /(?:\d{1,2}\s*월\s*(?:\d{1,2}\s*주|1~2주차|2~3주차|3~4주차|첫째주|둘째주|셋째주|넷째주|다섯째주))/;
  const cautionRegex = /(주의|피하|조심|무리|리스크|갈등|충돌|실수|보류|미루)/;
  const sajuRegex = /(일간|오행|십성|대운|세운|월주|일주|년주|시주)/;
  const astroRegex = /(행성|하우스|상승|태양|달|ASC|아센던트|별자리|트랜짓|아스펙트)/i;

  const matches = text.match(timingRegex) || [];
  const timingCount = new Set(matches).size;

  return {
    length: text.length,
    hasSajuEvidence: sajuRegex.test(text),
    hasAstroEvidence: astroRegex.test(text),
    timingCount,
    hasWeekTiming: weekRegex.test(text),
    hasCaution: cautionRegex.test(text),
    endsWithQuestion: /\?\s*$/.test(text),
  };
}

function analyzeSseOutput(outPath) {
  const sseText = fs.readFileSync(outPath, "utf8");
  const { mainText, followups } = parseSse(sseText);
  const ragMeta = parseRagSummary(mainText);
  const analysisText = stripRagDebug(mainText);
  const metrics = evaluateText(analysisText);

  return {
    ragMeta,
    metrics,
    followups,
  };
}

function buildPayloads(result) {
  const planets = Array.isArray(result.astrology?.planets)
    ? result.astrology.planets
    : [];
  const byName = Object.create(null);
  for (const p of planets) {
    if (p && p.name) byName[String(p.name).toLowerCase()] = p;
  }

  const astroPayload = {
    sun: byName.sun,
    moon: byName.moon,
    mercury: byName.mercury,
    venus: byName.venus,
    mars: byName.mars,
    jupiter: byName.jupiter,
    saturn: byName.saturn,
    ascendant: result.astrology?.ascendant,
    houses: result.astrology?.houses,
    aspects: result.astrology?.aspects,
    facts: result.astrology?.facts,
    planets: result.astrology?.planets,
    mc: result.astrology?.mc,
  };

  const saju = result.saju || {};
  const facts = saju.facts || {};
  const sajuPayload = {
    ...saju,
    fiveElements: facts.fiveElements,
    dominantElement: facts.dominantElement,
    tenGods: facts.tenGods,
  };

  return { sajuPayload, astroPayload };
}

async function runScenario(baseInput, scenario, variant) {
  const result = await computeDestinyMap({ ...baseInput, theme: scenario.theme });
  const { sajuPayload, astroPayload } = buildPayloads(result);

  const snapshot = buildAllDataPrompt("ko", scenario.theme, result);
  const prompt = [
    "당신은 따뜻하고 전문적인 운명 상담사입니다.",
    "[사주/점성 기본 데이터]",
    snapshot,
    `질문: ${scenario.question}`,
  ].join("\n");

  const initPayload = {
    saju: sajuPayload,
    astro: astroPayload,
    theme: scenario.theme,
    locale: "ko",
    birth: {
      date: baseInput.birthDate,
      time: baseInput.birthTime,
      gender: baseInput.gender,
      tz: baseInput.tz,
      latitude: baseInput.latitude,
      longitude: baseInput.longitude,
    },
  };

  const initRes = await postJson(`${API_BASE}/counselor/init`, initPayload);
  if (!initRes.json?.session_id) {
    const outPath = path.join("logs", `tmp-dm-qa-${scenario.theme}-init.json`);
    fs.writeFileSync(outPath, initRes.text || "", "utf8");
    throw new Error(
      `Init failed for ${scenario.theme} (status ${initRes.status}). See ${outPath}`
    );
  }

  const askPayload = {
    session_id: initRes.json.session_id,
    theme: scenario.theme,
    locale: "ko",
    prompt,
    debug_rag: true,
    ab_variant: variant.ab_variant,
  };

  const outPath = path.join(
    "logs",
    `tmp-dm-qa-${scenario.theme}-${variant.name}.sse`
  );
  const askRes = await postStream(`${API_BASE}/ask-stream`, askPayload, outPath);
  const analysis = analyzeSseOutput(outPath);
  return {
    outPath,
    status: askRes.status,
    bytes: askRes.bytes,
    analysis,
  };
}

async function main() {
  const baseInput = {
    name: "User",
    birthDate: "1995-02-09",
    birthTime: "06:40",
    latitude: 37.5665,
    longitude: 126.978,
    gender: "male",
    tz: "Asia/Seoul",
    userTimezone: "Asia/Seoul",
  };

  let scenarios = [
    {
      theme: "love",
      question: "연애운 흐름과 좋은 시점을 알려줘.",
    },
    {
      theme: "career",
      question: "커리어 전환 시기와 주의점이 궁금해.",
    },
    {
      theme: "wealth",
      question: "재물운 흐름과 안정적인 전략을 봐줘.",
    },
    {
      theme: "health",
      question: "건강운의 흐름과 생활 관리 포인트가 궁금해.",
    },
    {
      theme: "family",
      question: "가족 관계에서 올해 조심할 점이 있을까?",
    },
    {
      theme: "life",
      question: "인생 전반 흐름과 큰 전환 타이밍을 알려줘.",
    },
    {
      theme: "today",
      question: "오늘의 운세와 행동 가이드를 알려줘.",
    },
    {
      theme: "month",
      question: "이번 달 운세와 주차별 포인트가 궁금해.",
    },
    {
      theme: "year",
      question: "올해 흐름과 중요한 분기점을 알려줘.",
    },
    {
      theme: "newyear",
      question: "새해 전체 흐름과 분기별 전략을 알려줘.",
    },
  ];

  let variants = [
    { name: "A", ab_variant: "A" },
    { name: "B", ab_variant: "B" },
  ];

  const themesArg = process.argv.find((arg) => arg.startsWith("--themes="));
  const themeArg = process.argv.find((arg) => arg.startsWith("--theme="));
  const variantArg = process.argv.find((arg) => arg.startsWith("--variant="));
  if (themesArg) {
    const value = themesArg.split("=")[1] || "";
    const list = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (list.length) {
      scenarios = scenarios.filter((s) => list.includes(s.theme));
    }
  } else if (themeArg) {
    const value = themeArg.split("=")[1];
    scenarios = scenarios.filter((s) => s.theme === value);
  }
  if (variantArg) {
    const value = variantArg.split("=")[1];
    variants = variants.filter(
      (v) => v.name.toLowerCase() === value.toLowerCase()
    );
  }

  if (!fs.existsSync("logs")) {
    fs.mkdirSync("logs");
  }

  const suiteResults = [];

  for (const scenario of scenarios) {
    for (const variant of variants) {
      const result = await runScenario(baseInput, scenario, variant);
      const metrics = result.analysis?.metrics || {};
      const ragMeta = result.analysis?.ragMeta || {};
      suiteResults.push({
        theme: scenario.theme,
        variant: variant.name,
        status: result.status,
        bytes: result.bytes,
        outPath: result.outPath,
        ...metrics,
        ...ragMeta,
      });
      console.log(
        `[qa] ${scenario.theme} ${variant.name} -> ${result.status} (${result.bytes} bytes) ${result.outPath}`
      );
    }
  }

  const jsonPath = path.join("logs", "qa-dm-suite.json");
  fs.writeFileSync(jsonPath, JSON.stringify(suiteResults, null, 2), "utf8");

  const headers = [
    "theme",
    "variant",
    "status",
    "bytes",
    "length",
    "hasSajuEvidence",
    "hasAstroEvidence",
    "timingCount",
    "hasWeekTiming",
    "hasCaution",
    "endsWithQuestion",
    "model",
    "temp",
    "ab",
    "graph_nodes",
    "corpus_quotes",
    "persona_jung",
    "persona_stoic",
    "cross_analysis",
    "theme_fusion",
    "lifespan",
    "therapeutic",
    "outPath",
  ];
  const csvLines = [headers.join(",")];
  for (const row of suiteResults) {
    const values = headers.map((key) => {
      const raw = row[key] ?? "";
      const str = String(raw);
      if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
        return `"${str.replace(/\"/g, "\"\"")}"`;
      }
      return str;
    });
    csvLines.push(values.join(","));
  }
  const csvPath = path.join("logs", "qa-dm-suite.csv");
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
