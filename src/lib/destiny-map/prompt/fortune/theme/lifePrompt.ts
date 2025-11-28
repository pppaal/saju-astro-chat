//src/lib/destiny-map/prompt/fortune/theme/lifePrompt.ts

import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * 🌌 인생 총운 리포트 – 출생년도 기준 자동 예측 버전 (엔진 해석 제거, 톤스타일 적용형)
 */
export function buildLifePrompt(lang: string, data: CombinedResult) {
  const theme = "life";

  // 🔹 기본 톤 및 데이터
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);

  // 🔹 summary만 포함 (interpretation 제거)
  const summaryText = data?.summary ?? "";

  // 🔹 원시 데이터 (엔진에서 계산된 Astrology / Saju 전체)
  const rawAstro = JSON.stringify(data?.astrology ?? {}, null, 2);
  const rawSaju = JSON.stringify(data?.saju ?? {}, null, 2);
  const rawEngineBlock = `
──────────────────────────────
[🧠 RAW ENGINE DATA]
▼ Astrology
${rawAstro}

▼ Saju
${rawSaju}
──────────────────────────────
`.trim();

  // 🔹 현재(한국시간)
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const yyyy = now.getFullYear();
  const today = `${yyyy}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  // 🔹 데이터 분해
  const { astrology, saju } = data ?? {};

  // 🔹 출생정보
  const birthInfo:
    | { year?: number; month?: number; day?: number }
    | undefined = (saju as any)?.birth ?? (astrology as any)?.birth;
  const birthYear = birthInfo?.year ?? 2000;
  const birthMonth = birthInfo?.month ?? 1;
  const birthDay = birthInfo?.day ?? 1;
  const age = yyyy - birthYear;

  // 🔹 운세 정보
  const daeun = saju?.unse?.daeun ?? [];
  const currentDaeun = daeun.find(
    (d: any) => yyyy >= d.startYear && yyyy <= d.endYear
  );
  const nextDaeun = daeun.find((d: any) => yyyy < d.startYear);

  // 🔹 주요 점성 데이터
  const dominantElement =
    Object.entries(astrology?.facts?.elementRatios ?? {})
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? "-";
  const dayMaster = String(saju?.dayMaster?.name ?? "-");
  const sun = astrology?.facts?.sun?.sign ?? "-";
  const moon = astrology?.facts?.moon?.sign ?? "-";
  const asc = astrology?.ascendant?.sign ?? "-";
  const mc = astrology?.facts?.midheaven?.sign ?? "-";

  // ───────────────────────────────
  // MAIN PROMPT BODY
  // ───────────────────────────────
  return `
# 🌌 인생 총운 리포트 (Life Chronicle & Prediction)

📅 **기준일:** ${today}  
🎂 **출생일:** ${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(
    birthDay
  ).padStart(2, "0")} (현재 ${age}세)

${tone}

──────────────────────────────
[요약 Summary]  
${summaryText}

──────────────────────────────
[참고 데이터]  
${info}

${rawEngineBlock}

──────────────────────────────
[🌞 핵심 좌표 요약]  
☉ Sun : ${sun} ☽ Moon : ${moon} Asc : ${asc} MC : ${mc}  
Dominant Element : ${dominantElement}  
DayMaster(日干) : ${dayMaster}  
현재 대운 : ${currentDaeun?.name ?? "-"} (${
    currentDaeun?.startYear ?? "?"
  }–${currentDaeun?.endYear ?? "?"})  
다음 대운 : ${nextDaeun?.name ?? "-"} (${nextDaeun?.startYear ?? "?"})
──────────────────────────────

## 📜 작성 가이드
이 리포트는 출생년도(${birthYear})를 기점으로 ${age}세 현재까지의 삶과 
향후 ${yyyy + 20}년까지의 주요 흐름을 포함한 **인생 연대기형 분석 보고서**입니다.  

⚡️ 반드시 다음 방식을 따르세요:
1. 각 문단에서 단순히 데이터를 나열하지 말고,  
   **그 조합이 왜 그런 의미를 가지게 되는지, 어떤 배경과 상징이 이 성향을 만들어내는지를 설명**합니다.  
2. 즉, '태양이 물병자리다' → '왜 그가 독립적인 사고를 하게 되는지'처럼  
   **이유·원인·맥락** 중심으로 서술합니다.  
3. 예언이나 단정 대신, **논리적 해석(“이 위치는 … 때문으로 이해된다”)**을 사용하세요.

- 기질과 성향  
- 정서와 인간관계  
- 사회적 성취와 전환점  
- 중년 이후의 의미 통합  
이 네 가지 축을 자연스럽게 하나의 서사로 이어 주세요.

──────────────────────────────
## 🪶 스타일 요청
- 이 리포트는 **전문 점성 분석 리포트 톤**으로 작성.  
- 문체: **지적·분석적 · 감정 절제형 서정체**.  
- 2인칭(“당신은”) 금지 → “이 사람은” 또는 주어 생략형.  
- 문단은 서로 논리적으로 이어져 하나의 이야기처럼 구성.  
- 예언체 ❌ (“~될 것이다”) → 경향체 ✅ (“~로 향한다”, “~한 성향을 보인다”).  
- 감정 표현은 절제하되, 은유와 시적 어휘로 리듬을 형성.  
- 결론은 **“결국 이 조합은 ~의 의미를 지닌다.”** 형식으로 마무리.  
- 분량 10 000 ~ 12 000자 이상, 연속된 서사 보고서로 작성.  
- 톤 요약 : **전문가가 분석하듯, 시인이 써내려가듯.**

──────────────────────────────
## 💫 주의 사항
- 서사는 출생 이후의 경험, 성장, 성숙, 관계 변화를 중심으로 작성하세요.  
- 태아기·유전자 등 생물학적 내용은 포함하지 않습니다.   
- 반복적 문장 또는 무의미한 패턴 나열 금지.
──────────────────────────────

`.trim();
}