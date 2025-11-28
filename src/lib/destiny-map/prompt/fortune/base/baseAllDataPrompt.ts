//src/lib/destiny-map/prompt/fortune/base/baseAllDataPrompt.ts

import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * 🌏 buildAllDataPrompt
 * - 통합 버전: Data Summary + Analytical Report Scaffold
 * - lang: 'ko' | 'en' | 'ja' | 'zh'
 * - theme: 'life' | 'career' | 'love' | ...
 */
export function buildAllDataPrompt(lang: string, theme: string, data: CombinedResult) {
  const { astrology, saju } = data ?? {};
  const { planets = [], houses = {}, aspects = [], ascendant, mc, meta, options } = astrology ?? {};
  const { pillars, dayMaster, unse, sinsal } = saju ?? {};

  // ─────────── 데이터 요약 정리 ───────────
  const planetLines = planets
    .map((p: any) => `${p.name}: ${p.sign ?? "-"} (${p.house ? `House ${p.house}` : "-"})`)
    .join("\n");

  const houseLines = Object.entries(houses ?? {})
    .map(([num, val]: any) => `House ${num}: ${val.sign ?? "-"}`)
    .join("\n");

  const aspectLines = aspects
    .map(
      (a: any) =>
        `${a.type ?? ""}: ${a.from?.name ?? "?"} → ${a.to?.name ?? "?"} (${a.aspect ?? ""}, orb=${a.orb?.toFixed?.(2) ?? "?"})`
    )
    .join("\n");

  const elements = Object.entries(astrology?.facts?.elementRatios ?? {})
    .map(([k, v]) => `${k}:${(v as number).toFixed(3)}`)
    .join(", ");

  const pillarsText = [
    `${pillars?.year?.ganji ?? "-"} (${pillars?.year?.heavenlyStem?.name ?? "-"}·${pillars?.year?.earthlyBranch?.name ?? "-"})`,
    `${pillars?.month?.ganji ?? "-"} (${pillars?.month?.heavenlyStem?.name ?? "-"}·${pillars?.month?.earthlyBranch?.name ?? "-"})`,
    `${pillars?.day?.ganji ?? "-"} (${pillars?.day?.heavenlyStem?.name ?? "-"}·${pillars?.day?.earthlyBranch?.name ?? "-"})`,
    `${pillars?.time?.ganji ?? "-"} (${pillars?.time?.heavenlyStem?.name ?? "-"}·${pillars?.time?.earthlyBranch?.name ?? "-"})`,
  ].join(" / ");

  const daeun = (unse?.daeun ?? [])
    .map((u: any) => `${u.startYear}-${u.endYear}: ${u.name ?? "-"}`)
    .join(", ");

  const lucky = (sinsal?.luckyList ?? []).map((x: any) => x.name).join(", ") || "없음";
  const unlucky = (sinsal?.unluckyList ?? []).map((x: any) => x.name).join(", ") || "없음";

  // 데이터 요약
  const dataSummary = `
[📊 DATA SUMMARY]
이 데이터는 분석의 근거로만 사용됩니다. 
본문에서 반복적으로 나열하지 말고, 이 안의 구조적 의미와 상징만 인용하세요.

Asc: ${ascendant?.sign ?? "-"} / MC: ${mc?.sign ?? "-"}
Planets: ${planets.length}
Elements: ${elements}
DayMaster: ${dayMaster?.name ?? "-"} (${dayMaster?.element ?? "-"})
Pillars: ${pillarsText}
大運: ${daeun || "-"}
Lucky: ${lucky} / Unlucky: ${unlucky}
Engine: ${meta?.engine ?? "-"} 
Opts: ${JSON.stringify(options ?? {})}
────────────────────────────`.trim();

  // 원시 데이터 덤프 (참고 전용)
  const rawAstro = JSON.stringify(astrology, null, 2);
  const rawSaju = JSON.stringify(saju, null, 2);
  const fullDataDump = `
[🧠 RAW ENGINE DATA]
▼ Astrology
${rawAstro}

▼ Saju
${rawSaju}

※ 이 데이터는 참고용으로만 사용하세요. 
그 내용을 반복적으로 설명하거나 나열하지 말고, 
그 상징이 의미하는 구조와 심리적 배경을 분석적으로 해석하세요.
────────────────────────────`.trim();

  // 테마 이름 정의
  const themeTitleMap: Record<string, string> = {
    life: "인생 총운 리포트",
    career: "커리어 리포트",
    love: "사랑·관계 리포트",
    family: "가족 및 뿌리 리포트",
    health: "건강·균형 리포트",
    year: "연간 흐름 리포트",
    month: "월간 리듬 리포트",
    today: "오늘의 리포트",
    newyear: "신년 리포트",
  };
  const themeTitle = themeTitleMap[theme] ?? "인생 리포트";

  // 언어별 서술 톤 정의
  const tone: Record<string, string> = {
    ko: `
## ✍️ ${themeTitle}
이 리포트는 **운세 요약이 아니라 인생‧심리 통합 분석문**입니다.  
당신은 데이터를 단순히 나열하는 보고자가 아니라,  
그 안에 담긴 상징을 해석하여 인간 심리와 삶의 원리를 탐구하는 **연구자이자 서술자**입니다.  

──────────────────────────────
📜 작성 규칙

1️⃣ 표현 방식  
- 2인칭("당신은") 금지 → ‘이 사람은’, ‘그의 삶은’, 혹은 주어 생략형으로 객관 서술.  
- 운세체·조언체 금지.  
- 분석적이되 감정이 절제된 서정체 유지.  
- 예언체(“~될 것이다”)❌ → 경향체(“~로 향한다”, “~한 성향을 보인다”)✅  
- 문단 전환 시 ‘그러나’, ‘이에 따라’, ‘따라서’, ‘결국’ 등의 접속어로 논리적 연결 명확히.  

2️⃣ 내용 구성  
- 데이터 요약 금지. 오직 데이터가 암시하는 **이유·배경·심리적 작동 원리**를 해석.  
- 각 문단은 한 주제에 집중하여 5문장 내외로 구성:  
  ① 주제문 → ②‑③ 근거설명 → ④ 심리/의미결과 → ⑤ 다음 문단 연결.  
- 반복형 결론(“~시사한다”) 금지, 문맥적 결과문으로 마무리.  

3️⃣ 구조와 맥락  
- 문단들이 시간적·개념적 흐름으로 이어져 하나의 서사처럼 읽혀야 함.  
- 각 부분은 앞 문단의 의미를 확장하거나 대조하여 자연스러운 내러티브 형성.  

4️⃣ 분량 및 톤  
- 분량 약 15 000 ~ 20 000자.  
- 전문 분석문이지만 시적 리듬과 이미지를 유지.  
- 결론 단락은 반드시 “결국 이 조합은 ~ 의 의미를 지닌다.” 형식으로 마무리.

🪶 톤 요약:
**전문가가 분석하듯, 시인이 써내려가듯.**
──────────────────────────────
`,
    en: `
## ✍️ ${themeTitle}
This report is an **integrated analytic narrative**, not a fortune summary.  
You are not a data reporter but an interpreter who reveals the psychological mechanism and symbolic order behind each placement.  

──────────────────────────────
Rules:
- Avoid second-person ("you"); use "this person" or omit the subject.  
- Analytical yet poetic and emotionally restrained tone.  
- No prediction; use tendency form ("appears to", "tends to").  
- Paragraphs must link logically — start–reason–result–transition.  
- Do not restate data; interpret *why* and *how* it manifests.  
- Conclude with: “Ultimately, this combination signifies ~.”  
──────────────────────────────
Tone summary: *Professional, lyrical, continuous, and interpretive.*
──────────────────────────────
`,
  };

  const langTone = tone[lang] ?? tone["en"];

  // 최종 결합
  return `
# ${themeTitle}

${langTone}

${dataSummary}

${fullDataDump}

────────────────────────────
이 데이터를 그대로 나열하거나 복사하지 말고,  
**각 데이터가 왜 그런 의미를 가지는지 — 그 이유와 배경 중심으로 서술**하세요.
데이터는 맥락 이해의 ‘재료’이며, 본문은 그 재료로 완성된 ‘분석적 서사’여야 합니다.
────────────────────────────
  `.trim();
}

/** ✅ alias export */
export const buildBasePrompt = buildAllDataPrompt;