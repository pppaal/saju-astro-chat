const fs = require("fs");
const path = require("path");

require("dotenv").config();

const API_BASE = process.env.QA_API_BASE || "http://127.0.0.1:5000";

function buildHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = process.env.ADMIN_API_TOKEN || process.env.METRICS_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
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

function evaluateText(text) {
  const timingRegex = new RegExp(
    [
      "\\d{1,2}\\s*~\\s*\\d{1,2}\\s*\\uc6d4",
      "\\d{1,2}\\s*\\uc6d4",
      "\\d{1,2}\\s*\\uc8fc",
      "\\d{1,2}/\\d{1,2}",
      "\\uc774\\ubc88\\s*\\ub2ec",
      "\\ub2e4\\uc74c\\s*\\ub2ec",
      "\\ub2e4\\ub2e4\\uc74c\\s*\\ub2ec",
      "\\uc774\\ubc88\\s*\\uc8fc",
      "\\ub2e4\\uc74c\\s*\\uc8fc",
      "\\uc0c1\\ubc18\\uae30",
      "\\ud558\\ubc18\\uae30",
    ].join("|"),
    "g"
  );
  const weekRegex = new RegExp(
    [
      "\\d{1,2}\\s*\\uc6d4\\s*(?:",
      "\\d{1,2}\\s*\\uc8fc",
      "1~2\\uc8fc\\ucc28",
      "2~3\\uc8fc\\ucc28",
      "3~4\\uc8fc\\ucc28",
      "\\uccab\\uc9f8\\uc8fc",
      "\\ub458\\uc9f8\\uc8fc",
      "\\uc14b\\uc9f8\\uc8fc",
      "\\ub137\\uc9f8\\uc8fc",
      "\\ub2e4\\uc12f\\uc9f8\\uc8fc",
      ")",
    ].join("")
  );
  const cautionTokens = [
    "\uc8fc\uc758",
    "\ud53c\ud558",
    "\uc870\uc2ec",
    "\ubb34\ub9ac",
    "\ub9ac\uc2a4\ud06c",
    "\uac08\ub4f1",
    "\ucda9\ub3cc",
    "\uc2e4\uc218",
    "\ubcf4\ub958",
    "\ubbf8\ub8e8",
  ];
  const sajuTokens = [
    "\uc77c\uac04",
    "\uc624\ud589",
    "\uc2ed\uc131",
    "\ub300\uc6b4",
    "\uc138\uc6b4",
    "\uc6d4\uc8fc",
    "\uc77c\uc8fc",
    "\ub144\uc8fc",
    "\uc2dc\uc8fc",
  ];
  const astroTokens = [
    "\ud589\uc131",
    "\ud558\uc6b0\uc2a4",
    "\ud0dc\uc591",
    "ASC",
    "\uc544\uc13c\ub358\ud2b8",
    "\ubcc4\uc790\ub9ac",
    "\ud2b8\ub79c\uc9d3",
    "\uc544\uc2a4\ud399\ud2b8",
  ];

  const matches = text.match(timingRegex) || [];
  const timingCount = new Set(matches).size;

  const hasWeekTiming = text.includes("\uc8fc\ucc28") || weekRegex.test(text);

  return {
    length: text.length,
    hasSajuEvidence: sajuTokens.some((token) => text.includes(token)),
    hasAstroEvidence: astroTokens.some((token) => text.includes(token)),
    timingCount,
    hasWeekTiming,
    hasCaution: cautionTokens.some((token) => text.includes(token)),
    endsWithQuestion: /\?\s*$/.test(text),
  };
}

async function runScenario(endpoint, basePayload, scenario, variantName) {
  const payload = {
    ...basePayload,
    theme: scenario.theme,
    prompt: scenario.question,
  };
  if (variantName) {
    payload.ab_variant = variantName;
  }
  const outPath = path.join(
    "logs",
    `qa-${endpoint.replace("/", "")}-${scenario.theme}-${variantName || "A"}.sse`
  );
  const res = await postStream(`${API_BASE}/${endpoint}`, payload, outPath);
  const sseText = fs.readFileSync(outPath, "utf8");
  const parsed = parseSse(sseText);
  const metrics = evaluateText(parsed.mainText);
  return { outPath, status: res.status, bytes: res.bytes, metrics };
}

async function main() {
  const basePayload = {
    locale: "ko",
    birth: {
      date: "1995-02-09",
      time: "06:40",
      gender: "male",
      tz: "Asia/Seoul",
      latitude: 37.5665,
      longitude: 126.978,
    },
  };

  let scenarios = [
    { theme: "love", question: "\uc5f0\uc560\uc6b4 \ud750\ub984\uacfc \uc88b\uc740 \uc2dc\uc810\uc744 \uc54c\ub824\uc918." },
    { theme: "career", question: "\ucee4\ub9ac\uc5b4 \uc804\ud658 \uc2dc\uae30\uc640 \uc8fc\uc758\uc810\uc774 \uad81\uae08\ud574." },
    { theme: "wealth", question: "\uc7ac\ubb3c\uc6b4 \ud750\ub984\uacfc \uc548\uc815\uc801\uc778 \uc804\ub7b5\uc744 \ubd10\uc918." },
    { theme: "health", question: "\uac74\uac15\uc6b4 \ud750\ub984\uacfc \uc0dd\ud65c \uad00\ub9ac \ud3ec\uc778\ud2b8\uac00 \uad81\uae08\ud574." },
    { theme: "family", question: "\uac00\uc871 \uad00\uacc4\uc5d0\uc11c \uc62c\ud574 \uc870\uc2ec\ud560 \uc810\uc774 \uc788\uc744\uae4c?" },
    { theme: "life", question: "\uc778\uc0dd \uc804\ubc18 \ud750\ub984\uacfc \ud070 \uc804\ud658 \ud0c0\uc774\ubc0d\uc744 \uc54c\ub824\uc918." },
    { theme: "today", question: "\uc624\ub298 \uc6b4\uc138\uc640 \ud589\ub3d9 \uac00\uc774\ub4dc\ub97c \uc54c\ub824\uc918." },
    { theme: "month", question: "\uc774\ubc88 \ub2ec \uc6b4\uc138\uc640 \uc8fc\ucc28\ubcc4 \ud3ec\uc778\ud2b8\uac00 \uad81\uae08\ud574." },
    { theme: "year", question: "\uc62c\ud574 \ud750\ub984\uacfc \uc911\uc694\ud55c \ubd84\uae30\uc810\uc744 \uc54c\ub824\uc918." },
    { theme: "newyear", question: "\uc0c8\ud574 \uc804\uccb4 \ud750\ub984\uacfc \ubd84\uae30\ubcc4 \uc804\ub7b5\uc744 \uc54c\ub824\uc918." },
  ];

  let variants = ["A"];

  const themesArg = process.argv.find((arg) => arg.startsWith("--themes="));
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
  }
  if (variantArg) {
    const value = variantArg.split("=")[1];
    variants = [value.toUpperCase()];
  }

  if (!fs.existsSync("logs")) {
    fs.mkdirSync("logs");
  }

  const suiteResults = [];
  const endpoints = ["saju/ask-stream", "astrology/ask-stream"];

  for (const endpoint of endpoints) {
    for (const scenario of scenarios) {
      for (const variant of variants) {
        const result = await runScenario(endpoint, basePayload, scenario, variant);
        suiteResults.push({
          endpoint,
          theme: scenario.theme,
          variant,
          status: result.status,
          bytes: result.bytes,
          outPath: result.outPath,
          ...result.metrics,
        });
        console.log(
          `[qa] ${endpoint} ${scenario.theme} ${variant} -> ${result.status} (${result.bytes} bytes) ${result.outPath}`
        );
      }
    }
  }

  const jsonPath = path.join("logs", "qa-saju-astro-suite.json");
  fs.writeFileSync(jsonPath, JSON.stringify(suiteResults, null, 2), "utf8");

  const headers = [
    "endpoint",
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
  const csvPath = path.join("logs", "qa-saju-astro-suite.csv");
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
