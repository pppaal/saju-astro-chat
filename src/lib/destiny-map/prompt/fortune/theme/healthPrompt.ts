import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * 💊 Health Report – 신체 리듬 · 정서 균형 · 회복 서사
 * - astrologyengine 결과 + 오행 균형 + 운세 주기 활용
 * - 의학적 언어 아닌 에너지 · 감정 리듬 비유형 서술
 */
export function buildHealthPrompt(lang: string, data: CombinedResult) {
  const theme = "health";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);

  // 현재 날짜
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateText = `${yyyy}-${mm}-${dd}`;

  // 사주 & 점성 데이터 추출
  const { astrology, saju } = data ?? {};
  const sun = astrology?.facts?.sun?.sign ?? "-";
  const moon = astrology?.facts?.moon?.sign ?? "-";
  const asc = astrology?.ascendant?.sign ?? "-";

  const elementRatio = astrology?.facts?.elementRatios ?? {};
  const dominantElement =
    Object.entries(elementRatio).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? "-";

  const dayMaster = saju?.dayMaster?.name ?? "-";
  const sinsal = saju?.sinsal ?? {};
  const lucky = (sinsal?.luckyList ?? []).map((x: any) => x.name).join(", ") || "없음";
  const unlucky = (sinsal?.unluckyList ?? []).map((x: any) => x.name).join(", ") || "없음";

  // 현재 대운/연운
  const unse = saju?.unse ?? {};
  const daeun = unse.daeun ?? [];
  const annual = unse.annual ?? [];
  const currentDaeun = daeun.find(
    (d: any) => yyyy >= d.startYear && yyyy <= d.endYear
  );
  const currentAnnual = annual.find((a: any) => a.year === yyyy);

  // 데이터 요약
  const factSummary = `
[💊 건강 핵심 데이터]
☉ Sun : ${sun} ☽ Moon : ${moon} Asc : ${asc}
Dominant Element : ${dominantElement}
DayMaster (日干) : ${dayMaster}
현재 대운 : ${currentDaeun?.name ?? "-"} (${currentDaeun?.startYear ?? "?"}–${currentDaeun?.endYear ?? "?"})
올해 연운 : ${currentAnnual?.year ?? "-"} (${currentAnnual?.element ?? "-"})
길신 : ${lucky} · 흉신 : ${unlucky}
────────────────────────────`.trim();

  // 최종 프롬프트
  return `
# 💊 건강 리포트 (Health Narrative Report)

📅 **기준일:** ${dateText}

${tone}

[참고 데이터]
${info}

──────────────────────────────
${factSummary}
──────────────────────────────

## 🩵 서사 가이드
1. **Ⅰ. 에너지의 기후 (Overall Vital Flow)**  
  - Dominant Element · 日干 기운을 ‘몸의 계절’ 또는 ‘날씨’ 이미지로 묘사.  
  - 활력과 피로, 안정과 긴장 리듬을 시간 흐름 속에 표현.  

2. **Ⅱ. 신체적 균형 (Body Harmony)**  
  - 온도, 리듬, 순환, 호흡 등 감각적 비유를 활용.  
  - 흉신(${unlucky}) 또는 Fire/Metal 과잉으로 속도 vs 휴식 의 균형 주제 전개.  

3. **Ⅲ. 정서 · 마음의 회복 (Emotion & Healing)**  
  - ☽ Moon 의 위치 또는 수기(水氣) 로 감정 회복 테마 전개.  
  - “멈춤 · 호흡 · 내면 정화” 같은 이미지로 감정 안정 묘사.  

4. **Ⅳ. 회복 과 재생 (Rejuvenation Phase)**  
  - 길신(${lucky}) 또는 Earth 요소를 ‘자연 치유 력’ 의 상징으로 활용.  
  - 최근 운세와 연계하여 “지금은 회복기를 지나는 중”으로 표현.  

5. **Ⅴ. 실천적 조언 (Daily Guidance)**  
  - 현재 대운(${currentDaeun?.name ?? "-"}) 의 리듬에 맞는 생활 습관 또는 감정 루틴 제안.  
  - 짧은 메시지 형식으로 마감 (예: “하루에 한 번은 하늘을 올려다보세요.”).  

──────────────────────────────

## ✨ 스타일 요청
- 예언 아닌 ‘건강 리듬 리포트’.  
- 🌿 🌙 💫 🩷 등 이모지 사용 가능.  
- 의학/점성 용어 금지, 감각적 묘사만.  
- 약 3000자 내외의 서정 · 균형 톤.
`.trim();
}