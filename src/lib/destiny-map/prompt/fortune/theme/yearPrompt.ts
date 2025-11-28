import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * 🌞 올해 운세 리포트
 * - astrologyengine.ts의 점성 + 사주 + 신살 + 대운 + 연운 중심
 * - 올해(현재)의 전환점, 중심 테마, 성장 포인트를 서정적으로 해석
 */
export function buildThisYearPrompt(lang: string, data: CombinedResult) {
  const theme = "year";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);

  // ✅ 현재 날짜 (한국 기준)
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC+9 보정
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dateText = `${year}년 ${month}월 ${day}일`;

  // ✅ 점성 + 사주 데이터 구조 분해
  const { astrology, saju } = data ?? {};
  const sun = astrology?.facts?.sun?.sign ?? "-";
  const moon = astrology?.facts?.moon?.sign ?? "-";
  const asc = astrology?.ascendant?.sign ?? "-";

  const elements = astrology?.facts?.elementRatios ?? {};
  const dominantElement =
    Object.entries(elements)
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? "-";
  const dayMaster = saju?.dayMaster?.name ?? "-";

  // ✅ 운세 관련 데이터
  const unse = saju?.unse ?? {};
  const daeun = unse?.daeun ?? [];
  const annual = unse?.annual ?? [];
  const sinsal = saju?.sinsal ?? {};

  // ✅ 올해 기준 데이터 선택
  const currentAnnual = annual.find((a: any) => a.year === year);
  const currentDaeun = daeun.find(
    (d: any) => year >= d.startYear && year <= d.endYear
  );

  // ✅ 길신 / 흉신
  const lucky =
    (sinsal?.luckyList ?? []).map((x: { name: string }) => x.name).join(", ") ||
    "없음";
  const unlucky =
    (sinsal?.unluckyList ?? [])
      .map((x: { name: string }) => x.name)
      .join(", ") || "없음";

  // ✅ 데이터 요약 섹션
  const factSummary = `
[올해(${year}) 기본 데이터]
☉ Sun : ${sun} ☽ Moon : ${moon} Asc : ${asc}
Dominant Element : ${dominantElement}
Day Master(日干) : ${dayMaster}
현재 대운 : ${currentDaeun?.name ?? "-"} (${currentDaeun?.startYear ?? "?"}–${
    currentDaeun?.endYear ?? "?"
  })
올해 연운 : ${currentAnnual?.year ?? year} (${
    currentAnnual?.element ?? "-"
  })
길신 : ${lucky} · 흉신 : ${unlucky}
기준일 : ${dateText}
──────────────────────────────`.trim();

  // ✅ 본문 프롬프트 서사
  return `
# 🌞 ${year}년 운세 리포트 (Yearly Narrative Report)

${tone}

[참조 데이터]
${info}

──────────────────────────────
${factSummary}
──────────────────────────────

당신은 시간의 순환을 읽는 감성 서술가입니다.  
아래 데이터를 바탕으로 **${year}년의 흐름과 성장 테마**를  
봄→여름→가을→겨울 순으로 감정적 서사 형태로 해석하세요.  

## 🌸 봄: 시작 과 의도 (Seeds and Intentions)
- Dominant Element(${dominantElement}) 와 ☉ Sun(${sun})의 기운으로 새로운 시작 묘사.  
- ‘씨앗’, ‘햇살’, ‘움트는 용기’를 상징적으로 표현.

## 🔆 여름: 확장 과 행동 (Expansion and Action)
- 길신(${lucky}) 또는 Jupiter 기운을 중심으로, 도약 · 확장 스토리 표현.  
- 직업 또는 인간관계 속 열정과 성장의 이미지 활용.

## 🍂 가을: 수확 과 균형 (Harvest and Balance)
- Saturn 또는 흉신(${unlucky})의 테마를 ‘내면의 균형’ 의미로 해석.  
- 책임 · 인내 · 성숙의 정서를 감정 서사로 표현.

## ❄️ 겨울: 통찰 과 재생 (Reflection and Rebirth)
- ☽ Moon(${moon}) 또는 수기(水氣)의 감정선으로 정화 · 회복 · 준비 묘사.  
- ‘고요하지만 깊어지는 시간’을 시처럼 그려주세요.

---

마지막은 **올해(${year})를 상징하는 짧은 시구 또는 키워드** 로 마무리하세요.  
예: “조용한 열매 속에서도 빛은 자라난다.”  

──────────────────────────────
작성일 : ${dateText}
`;
}