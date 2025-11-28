import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * 💞 Love / Relationship Report – 정서 중심 내러티브 버전
 * astrologyengine의 점성 + 사주 + 신살 + 운세 데이터 기반
 * 관계 · 감정 · 사랑 패턴 · 치유 리듬 을 서정적으로 표현
 */
export function buildLovePrompt(lang: string, data: CombinedResult) {
  const theme = "love";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);

  // 현재 날짜
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateText = `${yyyy}-${mm}-${dd}`;

  // 점성 & 사주 데이터 추출
  const { astrology, saju } = data ?? {};
  const planets = astrology?.planets ?? [];
  const venus = planets.find((p: any) => p.name === "Venus");
  const moon = planets.find((p: any) => p.name === "Moon");
  const mars = planets.find((p: any) => p.name === "Mars");
  const asc = astrology?.ascendant?.sign ?? "-";
  const elementRatio = astrology?.facts?.elementRatios ?? {};
  const dominantElement =
    Object.entries(elementRatio).sort(
      (a, b) => (b[1] as number) - (a[1] as number)
    )[0]?.[0] ?? "-";

  const dayMaster = saju?.dayMaster?.name ?? "-";
  const dayElement = saju?.dayMaster?.element ?? "-";

  // 운세 정보
  const daeun = saju?.unse?.daeun ?? [];
  const currentDaeun = daeun.find(
    (d: any) => yyyy >= d.startYear && yyyy <= d.endYear
  );
  const annual = saju?.unse?.annual ?? [];
  const currentAnnual = annual.find((a: any) => a.year === yyyy);

  // 타이핑 오류 방지를 위한 임시 타입
  interface SinsalItem {
    name?: string;
    type?: string;
  }

  // 신살 – 연애 긍정 · 부정 에너지
  const luckyLove = (saju?.sinsal?.luckyList ?? []).filter((x: SinsalItem) =>
    ["홍염", "천희", "천요", "음성", "월덕", "천덕"].some((k) =>
      x.name?.includes(k)
    )
  );
  const unluckyLove = (saju?.sinsal?.unluckyList ?? []).filter(
    (x: SinsalItem) =>
      ["파", "형", "충", "해", "겁재"].some((k) => x.name?.includes(k))
  );

  // 데이터 요약 블록
  const factSummary = `
[💞 Love Profile Summary]
☽ Moon : ${moon?.sign ?? "-"} ♀ Venus : ${venus?.sign ?? "-"} ♂ Mars : ${mars?.sign ?? "-"} Asc : ${asc}
Dominant Element : ${dominantElement}
Day Master : ${dayMaster} (${dayElement})
현재 대운 : ${currentDaeun?.name ?? "-"} (${currentDaeun?.startYear ?? "?"}–${currentDaeun?.endYear ?? "?"})
올해 연운 : ${currentAnnual?.year ?? "-"} (${currentAnnual?.element ?? "-"})
길신(연애+) : ${luckyLove.map((x: SinsalItem) => x.name).join(", ") || "없음"}
흉신(연애–) : ${unluckyLove.map((x: SinsalItem) => x.name).join(", ") || "없음"}
────────────────────────────`.trim();

  // ──────────────────────────────
  // 결과 프롬프트 본문
  // ──────────────────────────────
  return `
# 💞 사랑과 관계 리포트 (Love Narrative Report)

📅 **기준일:** ${dateText}

${tone}

[참고 데이터]
${info}

──────────────────────────────
${factSummary}
──────────────────────────────

## 💗 서사 가이드
1. **Ⅰ. 감정의 기후 (Love Temperament)**  
  - ☽ Moon 과 ♀ Venus 의 관계로 감정 스타일과 애착 패턴 묘사.  
  - ♂ Mars 위치로 욕망 · 표현 · 관계 리듬 설명.  
  - 오행 과 日干 기운으로 감정 표현 패턴 비유.  

2. **Ⅱ. 관계 리듬 (Relationship Cycle)**  
  - 현재 대운(${currentDaeun?.name ?? "-"}) 및 연운(${currentAnnual?.year ?? "-"}) 기운 을 ‘사랑의 계절’로 묘사.  
  - 길신(${luckyLove.map((x: SinsalItem) => x.name).join("·") || "없음"}) 과 흉신(${unluckyLove
    .map((x: SinsalItem) => x.name)
    .join("·") || "없음"}) 기운으로 현재 관계 에너지 분석.  

3. **Ⅲ. 감정의 깊이 (Emotional Depth)**  
  - Moon 또는 Water 비율로 감정 회복력 묘사.  
  - 감정의 온도 · 거리 · 수용 과 표현 의 균형 중심.  

4. **Ⅳ. 관계 패턴 과 교훈 (Relational Lessons)**  
  - 재성(財) 또는 Venus aspect 로 관계 습관 · 자존감 테마 묘사.  
  - 반복되는 감정 패턴을 성장 이야기로 변환.  

5. **Ⅴ. 결론 및 메시지 (Closing Message)**  
  - 사랑을 통해 이 사람이 배우는 인생의 교훈 제시.  
  - 감정이 끝나지 않고 성숙하는 이야기로 마무리.  

──────────────────────────────

## ✨ 스타일 요청
- 감성적 이지만 절제된 톤.  
- 심리적 깊이 와 관계 성장 중심 표현.  
- 🌿 💫 💖 ✨ 이모지 활용 가능.  
- 약 3500자 내외, 따뜻하고 인간적인 서정 톤.
`.trim();
}