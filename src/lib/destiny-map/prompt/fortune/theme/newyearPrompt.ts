import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * 🎆 New Year Fortune Report – 새해 감정 전환 리포트
 * astrologyengine 결과 + 시점 데이터 + 희망 서사
 * - 새해를 여는 감정의 변화 · 의미 · 방향성을 서정적으로 표현
 */
export function buildNewyearPrompt(lang: string, data: CombinedResult) {
  const theme = "newyear";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);

  // 현재 날짜 및 내년 계산
  const now = new Date();
  const yyyy = now.getFullYear();
  const nextYear = yyyy + 1;
  const dateText = `${yyyy}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  // 데이터 기초
  const { astrology, saju } = data ?? {};
  const sun = astrology?.facts?.sun?.sign ?? "-";
  const moon = astrology?.facts?.moon?.sign ?? "-";
  const asc = astrology?.ascendant?.sign ?? "-";

  const elementRatio = astrology?.facts?.elementRatios ?? {};
  const dominantElement =
    Object.entries(elementRatio).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? "-";

  const dayMaster = saju?.dayMaster?.name ?? "-";
  const unse = saju?.unse ?? {};
  const daeun = unse.daeun ?? [];
  const annual = unse.annual ?? [];
  const sinsal = saju?.sinsal ?? {};

  // 내년 기준 연운 검색
  const nextAnnual = annual.find((a: any) => a.year === nextYear);
  const nextDaeun = daeun.find(
    (d: any) => nextYear >= d.startYear && nextYear <= d.endYear
  );

  // 길신 · 흉신
  const lucky = (sinsal?.luckyList ?? []).map((x: { name: string }) => x.name).join(", ") || "없음";
  const unlucky =
    (sinsal?.unluckyList ?? []).map((x: { name: string }) => x.name).join(", ") || "없음";

  // 데이터 요약
  const factSummary = `
[🎆 신년 요약 데이터]
☉ Sun : ${sun} ☽ Moon : ${moon} Asc : ${asc}
Dominant Element : ${dominantElement}
DayMaster (日干) : ${dayMaster}
진행 대운 : ${nextDaeun?.name ?? "-"} (${nextDaeun?.startYear ?? "?"}–${nextDaeun?.endYear ?? "?"})
내년 연운 : ${nextAnnual?.year ?? nextYear} (${nextAnnual?.element ?? "-"})
길신 : ${lucky} · 흉신 : ${unlucky}
기준 날짜 : ${dateText}
────────────────────────────`.trim();

  // ────────────────────────────
  // 프롬프트 본문
  // ────────────────────────────
  return `
# 🎇 ${nextYear}년 신년 리포트 (New Year Narrative Report)

📅 **기준일:** ${dateText}

${tone}

[참고 데이터]
${info}

──────────────────────────────
${factSummary}
──────────────────────────────

## 🧭 서사 가이드
1. **Ⅰ. 새해의 빛 (The First Light of the Year)**  
  - 내년 연운(${nextAnnual?.element ?? "-"})과 Dominant Element(${dominantElement}) 를 아침 빛·계절 비유로 표현.  
  - ☉ Sun 과 Asc 위치로 “새롭게 움직이기 시작하는 방향” 서술.  

2. **Ⅱ. 기회의 싹 (Seeds of Growth)**  
  - 길신(${lucky}) 또는 Jupiter / Earth 기운으로 ‘확장과 기회’ 서술.  
  - 직업·관계·자기성장 분야의 새로운 시작 묘사.  

3. **Ⅲ. 감정의 정화 (Emotional Renewal)**  
  - ☽ Moon 또는 수기(水氣) 기운을 기반으로 ‘감정의 비움과 새로움’.  
  - 지난 해의 피로 또는 상처를 정화·치유하는 상징 묘사.  

4. **Ⅳ. 책임과 성숙 (Awareness & Balance)**  
  - 흉신(${unlucky}) 또는 Saturn 영향을 ‘성숙의 통과의례’로 해석.  
  - “시작은 가볍지만, 지탱은 깊이에서 온다” 같은 철학적 메시지 활용.  

5. **Ⅴ. 희망의 메시지 (Message of the Year)**  
  - ${nextYear}년을 상징할 키워드 또는 짧은 시구로 마무리.  
  - 예: “찬 겨울빛 속 새로운 숨결이 피어난다.”  

──────────────────────────────
## ✨ 스타일 요청
- 🌅 ✨ 🌿 🎆 등 이모지 사용 가능.  
- 예언체 X, 감정 기반 희망 리포트.  
- 시적이되 현실 감각 있는 서사.  
- 약 3500자 분량, 감성 · 철학적 톤으로.
`.trim();
}