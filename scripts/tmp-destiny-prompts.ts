import fs from "fs";
import path from "path";
import { buildAllDataPrompt } from "../src/lib/destiny-map/prompt/fortune/base/baseAllDataPrompt";
import type { CombinedResult } from "../src/lib/destiny-map/astrologyengine";

const samplePath = path.join("logs", "tmp-destiny-sample.json");
const raw = fs.readFileSync(samplePath, "utf8");
const parsed = JSON.parse(raw);

const data: CombinedResult = {
  meta: { generator: "tmp", generatedAt: new Date().toISOString(), name: "User", gender: "male" },
  astrology: parsed.astro ?? {},
  saju: parsed.saju ?? {},
  summary: "",
  userTimezone: "Asia/Seoul",
  analysisDate: new Date().toISOString().slice(0, 10),
};

const scenarios = [
  {
    id: "career",
    theme: "career",
    question: "요즘 커리어 방향과 6개월 내 중요한 타이밍이 궁금해요.",
  },
  {
    id: "love",
    theme: "love",
    question: "연애가 잘 안 풀리는 이유랑 6개월 안에 만남 타이밍이 언제인지 알려줘.",
  },
  {
    id: "wealth",
    theme: "wealth",
    question: "이직과 창업 중 어디가 더 맞는지, 돈 흐름과 6개월 타이밍도 보고 싶어.",
  },
  {
    id: "health",
    theme: "health",
    question: "요즘 체력이 떨어지고 스트레스가 큰데, 6개월 안에 건강관리 포인트와 타이밍이 궁금해.",
  },
];

const out = scenarios.map((scenario) => {
  const snapshot = buildAllDataPrompt("ko", scenario.theme, data);
  const prompt = [
    "[사주/점성 기본 데이터]",
    snapshot.slice(0, 3000),
    "",
    `질문: ${scenario.question}`,
  ].join("\n");
  return {
    ...scenario,
    prompt,
  };
});

const outPath = path.join("logs", "tmp-destiny-prompts.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log(`Wrote ${outPath}`);
