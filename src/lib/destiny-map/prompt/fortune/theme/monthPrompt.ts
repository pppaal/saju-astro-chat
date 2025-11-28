import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * 🌙 월운 리포트 (Monthly Fortune Narrative)
 * - astrologyengine.ts 결과 + 현재 날짜 인식 + 월간 주요 시점 감정 리듬
 * - “이번 달의 중심 테마, 기회 날짜, 주의 날짜” 자동 참조
 */
export function buildMonthPrompt(lang: string, data: CombinedResult) {
  const theme = "month";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);

  // 현재 날짜
  const now = new Date();
  const yyyy = now.getFullYear();
  const monthIdx = now.getMonth() + 1;
  const dd = String(now.getDate()).padStart(2, "0");
  const dateText = `${yyyy}-${String(monthIdx).padStart(2, "0")}-${dd}`;

  // 사주 + 점성
  const { astrology, saju } = data ?? {};
  const dayMaster = saju?.dayMaster?.name ?? "-";
  const sun = astrology?.facts?.sun?.sign ?? "-";
  const moon = astrology?.facts?.moon?.sign ?? "-";
  const asc = astrology?.ascendant?.sign ?? "-";

  const elementRatio = astrology?.facts?.elementRatios ?? {};
  const dominantElement =
    Object.entries(elementRatio)
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? "-";

  // 운세 주기
  const unse = saju?.unse ?? {};
  const daeun = unse.daeun ?? [];
  const annual = unse.annual ?? [];
  const monthly = unse.monthly ?? [];
  const sinsal = saju?.sinsal ?? {};

  // 현재 대운/연운/월운
  const currentDaeun = daeun.find(
    (d: any) => yyyy >= d.startYear && yyyy <= d.endYear
  );
  const currentAnnual = annual.find((a: any) => a.year === yyyy);
  const currentMonth = monthly.find(
    (m: any) => m.year === yyyy && m.month === monthIdx
  );
  const currentMonthElement = currentMonth?.element ?? "-";

  // 길신 / 흉신
  const lucky = (sinsal?.luckyList ?? []).map((x: { name: string }) => x.name).join(", ") || "없음";
  const unlucky =
    (sinsal?.unluckyList ?? []).map((x: { name: string }) => x.name).join(", ") || "없음";

  // ✨ 중요 날짜 계산 (예시: 월중 강한 에너지 변화일)
  // - 월운 날짜 배열이 있을 경우, 변화 폭이 큰 3개 날짜 선택
  const activeDays =
    currentMonth?.details
      ?.filter((d: any) => Math.abs(d.energy ?? 0) > 0.7)
      .slice(0, 3)
      .map((d: any) => `${d.day}일(${d.energy > 0 ? "상승" : "하강"})`) ??
    [];
  const highlightDays =
    activeDays.length > 0
      ? activeDays.join(", ")
      : `${monthIdx}월 중순~하순에 감정선 변화가 예상됨`;

  // 데이터 요약
  const factSummary = `
[🌙 ${monthIdx}월 요약 데이터]
☉ Sun : ${sun} ☽ Moon : ${moon} Asc : ${asc}
Dominant Element : ${dominantElement}
Day Master(日干) : ${dayMaster}
현재 대운 : ${currentDaeun?.name ?? "-"} (${currentDaeun?.startYear ?? "?"}–${currentDaeun?.endYear ?? "?"})
올해 연운 : ${currentAnnual?.year ?? "-"} (${currentAnnual?.element ?? "-"})
이번 달 기운 : ${currentMonthElement}
주요 변화일: ${highlightDays}
길신 : ${lucky} · 흉신 : ${unlucky}
기준일 : ${dateText}
────────────────────────────`.trim();

  // ──────────────────────────────
  // 결과 프롬프트 본문
  // ──────────────────────────────
  return `
# 🌙 ${yyyy}년 ${monthIdx}월 운세 리포트 (Monthly Narrative Report)

📅 **생성일:** ${dateText}  

${tone}

[참고 데이터]
${info}

──────────────────────────────
${factSummary}
──────────────────────────────

## 🧭 서사 가이드
1. **Ⅰ. 이번 달의 전체 기류 (Overall Energy)**  
  - Sun · Moon · Asc 조합으로 감정과 생활 리듬 묘사.  
  - Dominant Element(${dominantElement}) 또는 日干(${dayMaster}) 으로 이번 달의 ‘내면 날씨’ 표현.  
  - 월초~월말로 갈수록 기류가 어떻게 변하는지 묘사.  

2. **Ⅱ. 주요 시점 및 기회 (Dates & Opportunities)**  
  - ${highlightDays} 근처 날짜를 중심으로 기회 또는 변화 에너지 강조.  
  - 길신(${lucky}) 이나 Jupiter 기운과 연결 지어 “긍정적 방향” 제시.  

3. **Ⅲ. 감정의 흐름 (Emotional Tides)**  
  - Moon 기반으로 감정의 고조·완화 묘사.  
  - 휴식 vs 활동 의 균형 주제 제시.  

4. **Ⅳ. 조심 · 균형 포인트 (Cautions & Transitions)**  
  - 흉신(${unlucky}) 또는 Saturn 영역 기운으로 ‘집중력 vs 지속력’ 을 테마로 묘사.  
  - 현실적 조언 · 태도 · 감정 관리 실마리 제시.  

5. **Ⅴ. 한달의 메시지 (Closing Message)**  
  - ${monthIdx}월을 상징하는 짧은 키워드(예: 정리·회복·확장 등) 제시.  
  - 철학적 한 문장 또는 이미지 로 마무리.

──────────────────────────────
## ✨ 스타일 요청
- 예언 X, 리듬 중심 감정 서사.  
- 🌕 🌸 💫 이모지 활용.  
- 구체적 날짜 묘사 (예: “12~15일 사이 의사결정의 기류”).  
- 전체 길이 : 약 3500자, 시적 이지만 현실적 톤.
`.trim();
}