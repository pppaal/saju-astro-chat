import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * 👪 Family Report – 감정적 유대 · 가정 리듬 리포트
 * - astrologyengine 결과 + 현재 시점 기준
 * - 가족관계 · 돌봄 · 감정적 뿌리 · 세대간 에너지 해석
 */

export function buildFamilyPrompt(lang: string, data: CombinedResult) {
  const theme = "family";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);

  // 현재 날짜
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateText = `${yyyy}-${mm}-${dd}`;

  // 사주 · 점성 주요요소
  const { astrology, saju } = data ?? {};
  const moon = astrology?.facts?.moon?.sign ?? "-";
  const sun = astrology?.facts?.sun?.sign ?? "-";
  const asc = astrology?.ascendant?.sign ?? "-";
  const dominantElement =
    Object.entries(astrology?.facts?.elementRatios ?? {})
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? "-";

  const dayMaster = saju?.dayMaster?.name ?? "-";
  const sinsal = saju?.sinsal ?? {};
  const daeun = saju?.unse?.daeun ?? [];
  const annual = saju?.unse?.annual ?? [];

  const currentYear = yyyy;
  const currentDaeun = daeun.find(
    (d: any) => currentYear >= d.startYear && currentYear <= d.endYear
  );
  const annualEnergy = annual.find((a: any) => a.year === currentYear)?.element ?? "-";
  const lucky = (sinsal?.luckyList ?? []).map((x: any) => x.name).join(", ") || "없음";
  const unlucky = (sinsal?.unluckyList ?? []).map((x: any) => x.name).join(", ") || "없음";

  // 핵심 요약 블록
  const factSummary = `
[🏡 Family Core Summary]
☉ Sun : ${sun} ☽ Moon : ${moon} Asc : ${asc}
Dominant Element : ${dominantElement}
Day Master(日干) : ${dayMaster}
현재 대운 : ${currentDaeun?.name ?? "-"} (${currentDaeun?.startYear ?? "?"}–${currentDaeun?.endYear ?? "?"})
올해 연운 기운 : ${annualEnergy}
길신 : ${lucky} · 흉신 : ${unlucky}
────────────────────────────`.trim();

  return `
# 👪 가족 리포트 (Family Narrative Fortune)

📅 **기준일:** ${dateText}

${tone}

[참고 데이터]
${info}

──────────────────────────────
${factSummary}
──────────────────────────────

## 🧭 해석 가이드
1. **가족 에너지의 기반 (Roots of Connection)**  
  - Dominant Element 또는 ☽ Moon 을 가정의 ‘정서적 기류’로 묘사.  
  - 공기/물/불/흙 의 성향으로 가족 분위기를 비유.  
  - 감정의 온도감, 따스함 또는 거리감을 시적 이미지로 표현.  

2. **관계의 균형 과 돌봄 (Balance & Care)**  
  - 현재 대운(${currentDaeun?.name ?? "-"}) 의 기운이 가족 관계에 어떤 ‘역할 변화’ 를 주었는가.  
  - 돌봄과 자율성 사이의 조율을 묘사.  
  - 감정의 리듬 또는 서로의 성장 패턴 묘사.  

3. **세대 간 통찰 (Generational Insight)**  
  - 부모/형제/자녀/파트너 중 상징적 한 관계를 중심으로 감정 흐름 서술.  
  - Day Master 또는 월운 변화 를 감정적 교훈으로 전환.  

4. **치유 와 회복 (Healing the Home Space)**  
  - 흉신(${unlucky}) 또는 Saturn 영향 → ‘갈등의 교정’ 혹은 ‘대화의 복원’으로 전환.  
  - 이해와 기다림의 행동, 일상의 치유 묘사.  

5. **가족 메시지 (Family Message)**  
  - 짧은 문장 또는 상징 (예: “돌아보면 항상 그 자리에 있던 사랑”).  
  - 마지막 한 줄은 감사 또는 수용의 에너지로 마무리.  

──────────────────────────────
## ✨ 스타일 요청
- 예언 아닌 ‘감정의 리듬’ 리포트.  
- 💞 🏡 🌕 🌿 이모지 활용 가능.  
- 시적이지만 진심 있는 문체로.  
- 전체 길이: 약 3200 ~ 3500 자.
`.trim();
}