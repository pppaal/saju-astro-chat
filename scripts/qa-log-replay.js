const fs = require("fs");
const path = require("path");

require("dotenv").config();

const API_BASE = process.env.NEXT_PUBLIC_AI_BACKEND || "http://127.0.0.1:5000";

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

async function postStream(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
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
      return trimmed.startsWith("[RAG ??]") || trimmed.startsWith("[RAG Summary]");
    });
  if (!line) return {};
  const cleaned = line
    .trimStart()
    .replace("[RAG ??]", "")
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
    /(?:\d{4}\s*\uB144|\d{1,2}\s*\uC6D4|\d{1,2}\s*\uC8FC\uCC28|\d{1,2}\s*\uC8FC|\d{1,2}\s*\/\s*\d{1,2}|\bweek\s*\d{1,2}\b|\bQ[1-4]\b)/gi;
  const weekRegex =
    /(?:\d{1,2}\s*\uC8FC\uCC28|\d{1,2}\s*\uC8FC|\bweek\s*\d{1,2}\b)/i;
  const cautionRegex =
    /(\uC8FC\uC758|\uACBD\uACE0|\uC870\uC2EC|\uC704\uD5D8|\uACBD\uACC4|\uC720\uC758|\uD53C\uD558|\uC911\uC694\uD55C\s*\uACB0\uC815|\uD55C\s*\uD15C\uD3EC|\uBB34\uB9AC\uD558\uAC8C|\uC810\uAC80|avoid|caution|warning)/i;
  const sajuRegex = /(\uC0AC\uC8FC|\uC77C\uAC04|\uC624\uD589|\uC2ED\uC131|\uB300\uC6B4|\uC138\uC6B4|\uBA85\uC2DD)/;
  const astroRegex = /(\uD0DC\uC591|\uB2EC|ASC|\uC0C1\uC2B9\uAD81|\uD589\uC131|\uD558\uC6B0\uC2A4|\uAD81|sign|planet|house|ascendant|rising)/i;

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

function buildPayloads(source) {
  const astrology = source?.astrology || {};
  const planets = Array.isArray(astrology.planets)
    ? astrology.planets
    : Array.isArray(astrology.facts?.planets)
      ? astrology.facts.planets
      : [];
  const byName = Object.create(null);
  for (const p of planets) {
    if (p && p.name) byName[String(p.name).toLowerCase()] = p;
  }

  const astroPayload = {
    ...astrology,
    sun: byName.sun,
    moon: byName.moon,
    mercury: byName.mercury,
    venus: byName.venus,
    mars: byName.mars,
    jupiter: byName.jupiter,
    saturn: byName.saturn,
  };

  const saju = source?.saju || {};
  const facts = saju.facts || {};
  const sajuPayload = {
    ...saju,
    fiveElements: facts.fiveElements,
    dominantElement: facts.dominantElement,
    tenGods: facts.tenGods,
  };

  return { sajuPayload, astroPayload };
}

function mapTheme(rawTheme) {
  const theme = String(rawTheme || "").trim();
  const normalized = theme.toLowerCase();
  if (!normalized) return "life";
  if (normalized === "focus_overall") return "overall";
  if (["love", "career", "wealth", "health", "family", "life", "overall"].includes(normalized)) {
    return normalized;
  }
  return "life";
}

function buildPrompt(theme) {
  const prompts = {
    love: "\uc5f0\uc560 \ud750\ub984\uc744 \uc9c4\uc9dc\uc801\uc73c\ub85c \ubd84\uc11d\ud574 \uc904\ub798\uc694?",
    career: "\uc9c0\uae08 \ucee4\ub9ac\uc5b4 \ud750\ub984\uc5d0\uc11c \uc8fc\uc758\ud560 \ud3ec\uc778\ud2b8\ub97c \uc54c\ub824\uc918.",
    wealth: "\uc790\uc0b0/\uc7ac\ubb3c \ud750\ub984\uc5d0\uc11c \ud0c0\uc774\ubc0d\uacfc \uc8fc\uc758\uc810\uc744 \uac10\uc0c1\ud574 \uc904\ub798?",
    health: "\uac74\uac15\uc5d0 \uc720\uc758\ud574\uc57c \ud560 \ubd80\ubd84\uc744 \uc54c\ub824\uc918.",
    family: "\uac00\uc871 \uad00\uacc4\uc640 \uc2ec\ub9ac\uc801 \ud3ec\uc778\ud2b8\ub97c \ud22c\uba85\ud558\uac8c \ubd84\uc11d\ud574 \uc918.",
    overall: "\ucd5c\uadfc \uc778\uc0dd \ud750\ub984\uc5d0\uc11c \uc9c4\uc9dc \ud575\uc2ec\uc744 \ub9d0\ud574 \uc918.",
    life: "\ucd5c\uadfc \uc778\uc0dd \ud750\ub984\uc5d0\uc11c \uc9c4\uc9dc \ud575\uc2ec\uc744 \ub9d0\ud574 \uc918.",
  };
  return prompts[theme] || prompts.life;
}

async function runCase(filePath, index) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  const report = data.report || {};
  const rawReport = report.raw || {};
  const input = data.input || data.body || {};

  const theme = mapTheme(input.theme);
  const prompt = buildPrompt(theme);
  const source = {
    saju: report.saju || rawReport.saju || {},
    astrology: report.astrology || rawReport.astrology || {},
  };
  const { sajuPayload, astroPayload } = buildPayloads(source);

  const initPayload = {
    saju: sajuPayload,
    astro: astroPayload,
    theme,
    locale: "ko",
  };

  const initRes = await postJson(`${API_BASE}/counselor/init`, initPayload);
  const sessionId = initRes.json?.session_id;
  if (!sessionId) {
    return {
      file: path.basename(filePath),
      theme,
      status_init: initRes.status,
      status_ask: 0,
      error: initRes.text?.slice(0, 200) || "init failed",
    };
  }

  const askPayload = {
    session_id: sessionId,
    theme,
    locale: "ko",
    prompt,
    debug_rag: true,
  };
  const askRes = await postStream(`${API_BASE}/ask-stream`, askPayload);
  const { mainText, followups } = parseSse(askRes.text);
  const ragMeta = parseRagSummary(mainText);
  const analysisText = stripRagDebug(mainText);
  const metrics = evaluateText(analysisText);

  const fail = !metrics.hasSajuEvidence || !metrics.hasAstroEvidence || !metrics.hasWeekTiming || !metrics.hasCaution || !metrics.endsWithQuestion;
  if (fail) {
    const outDir = path.join("logs", "qa-log-replay");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const outPath = path.join(outDir, `case-${String(index).padStart(3, "0")}.sse`);
    fs.writeFileSync(outPath, askRes.text, "utf8");
  }

  return {
    file: path.basename(filePath),
    theme,
    status_init: initRes.status,
    status_ask: askRes.status,
    length: metrics.length,
    hasSajuEvidence: metrics.hasSajuEvidence,
    hasAstroEvidence: metrics.hasAstroEvidence,
    timingCount: metrics.timingCount,
    hasWeekTiming: metrics.hasWeekTiming,
    hasCaution: metrics.hasCaution,
    endsWithQuestion: metrics.endsWithQuestion,
    followupCount: Array.isArray(followups) ? followups.length : 0,
    model: ragMeta.model || "",
    temp: ragMeta.temp || "",
    ab: ragMeta.ab || "",
    graph_nodes: ragMeta.graph_nodes || "",
    corpus_quotes: ragMeta.corpus_quotes || "",
    persona_jung: ragMeta.persona_jung || "",
    persona_stoic: ragMeta.persona_stoic || "",
    cross_analysis: ragMeta.cross_analysis || "",
    theme_fusion: ragMeta.theme_fusion || "",
    lifespan: ragMeta.lifespan || "",
    therapeutic: ragMeta.therapeutic || "",
  };
}

async function main() {
  const countArg = process.argv.find((arg) => arg.startsWith("--count="));
  const count = countArg ? Number(countArg.split("=")[1]) : 50;

  const files = fs
    .readdirSync("logs")
    .filter((f) => f.startsWith("destinymap-") && f.endsWith(".json"))
    .map((f) => path.join("logs", f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(0, Number.isFinite(count) && count > 0 ? count : 50);

  if (!files.length) {
    console.error("No destinymap logs found.");
    process.exit(1);
  }

  const results = [];
  let passAll = 0;

  for (let i = 0; i < files.length; i += 1) {
    let result;
    try {
      result = await runCase(files[i], i + 1);
    } catch (err) {
      result = {
        file: path.basename(files[i]),
        theme: "unknown",
        status_init: 0,
        status_ask: 0,
        error: String(err && err.message ? err.message : err),
      };
    }
    results.push(result);
    const ok =
      result.status_init === 200 &&
      result.status_ask === 200 &&
      result.hasSajuEvidence &&
      result.hasAstroEvidence &&
      result.hasWeekTiming &&
      result.hasCaution &&
      result.endsWithQuestion;
    if (ok) passAll += 1;
    console.log(
      `[log-qa] ${result.file} theme=${result.theme} init=${result.status_init} ask=${result.status_ask} ok=${ok}`
    );
  }

  const outJson = {
    checked: results.length,
    pass_all: passAll,
    files: results,
  };

  const jsonPath = path.join("logs", "qa-log-replay.json");
  fs.writeFileSync(jsonPath, JSON.stringify(outJson, null, 2), "utf8");

  const headers = [
    "file",
    "theme",
    "status_init",
    "status_ask",
    "length",
    "hasSajuEvidence",
    "hasAstroEvidence",
    "timingCount",
    "hasWeekTiming",
    "hasCaution",
    "endsWithQuestion",
    "followupCount",
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
  ];
  const csvLines = [headers.join(",")];
  for (const row of results) {
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
  const csvPath = path.join("logs", "qa-log-replay.csv");
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
