import type { SajuData, UnseItem } from '../types';

export function getCurrentFlowAnalysis(saju: SajuData | undefined, lang: string): { title: string; flow: string; advice: string; emoji: string } | null {
  const isKo = lang === "ko";
  const unse = saju?.unse;

  if (!unse) return null;

  // 현재 대운 찾기 - age 기준으로 현재 대운 계산
  const daeunList = Array.isArray(unse.daeun) ? unse.daeun : [];
  const currentYear = new Date().getFullYear();

  // birthYear 계산 - 여러 경로 시도
  let birthYear: number | null = null;
  if (saju?.facts?.birthDate) {
    birthYear = new Date(saju.facts.birthDate).getFullYear();
  } else if (saju?.pillars?.year?.heavenlyStem) {
    // pillars.year에서 간지로 연도 역산 (간단히 대운 첫 번째 항목에서 추정)
    // 더 정확한 방법: 대운 age를 이용
    if (daeunList.length > 0) {
      const firstDaeun = daeunList[0];
      const daeunAge = firstDaeun.age || 0;
      birthYear = currentYear - 31; // 임시: 현재 나이 31세 가정 (나중에 개선)
    }
  }

  // 만 나이와 한국 나이 둘 다 계산
  const koreanAge = birthYear ? currentYear - birthYear + 1 : null;
  const westernAge = birthYear ? currentYear - birthYear : null;

  // 대운 찾기 - 만 나이와 한국 나이 둘 다 시도
  let currentDaeun = null;
  if (koreanAge) {
    // 한국 나이로 먼저 시도 (age부터 age+9까지, 총 10년)
    currentDaeun = daeunList.find((d: UnseItem) => {
      const startAge = d.age || 0;
      const endAge = startAge + 9;
      return koreanAge >= startAge && koreanAge <= endAge;
    });

    // 못 찾으면 만 나이로 시도
    if (!currentDaeun && westernAge) {
      currentDaeun = daeunList.find((d: UnseItem) => {
        const startAge = d.age || 0;
        const endAge = startAge + 9;
        return westernAge >= startAge && westernAge <= endAge;
      });
    }
  }

  // 올해 연운 찾기
  const annualList = Array.isArray(unse.annual) ? unse.annual : [];
  const thisYear = annualList.find((a: UnseItem) => a.year === currentYear);

  if (!currentDaeun && !thisYear) return null;

  const daeunGanji = currentDaeun ? `${currentDaeun.heavenlyStem}${currentDaeun.earthlyBranch}` : "";
  const daeunAge = currentDaeun?.age != null ? `${currentDaeun.age}-${currentDaeun.age + 9}세` : "";
  const yearGanji = thisYear ? `${thisYear.heavenlyStem}${thisYear.earthlyBranch}` : "";
  const yearNum = thisYear?.year || currentYear;

  // 십신 정보 추출 - sibsin이 string일 수도 있고 object일 수도 있음
  const daeunSibsinRaw = currentDaeun?.sibsin;
  const daeunSibsin = typeof daeunSibsinRaw === 'object' && daeunSibsinRaw?.cheon ? daeunSibsinRaw.cheon : (typeof daeunSibsinRaw === 'string' ? daeunSibsinRaw : "");
  const yearSibsinRaw = thisYear?.sibsin;
  const yearSibsin = typeof yearSibsinRaw === 'object' && yearSibsinRaw?.cheon ? yearSibsinRaw.cheon : (typeof yearSibsinRaw === 'string' ? yearSibsinRaw : "");

  // 십신별 간단한 설명
  const sibsinFlow: Record<string, { ko: string; en: string }> = {
    "비견": { ko: "독립·경쟁", en: "Independence" },
    "겁재": { ko: "변화·도전", en: "Challenge" },
    "식신": { ko: "창작·여유", en: "Creativity" },
    "상관": { ko: "표현·혁신", en: "Expression" },
    "편재": { ko: "사업·활동", en: "Business" },
    "정재": { ko: "안정·재물", en: "Stability" },
    "편관": { ko: "변화·추진", en: "Drive" },
    "정관": { ko: "명예·질서", en: "Honor" },
    "편인": { ko: "탐구·자유", en: "Exploration" },
    "정인": { ko: "학습·성장", en: "Learning" }
  };

  const daeunFlow = sibsinFlow[daeunSibsin]?.[isKo ? "ko" : "en"] || "";
  const yearFlow = sibsinFlow[yearSibsin]?.[isKo ? "ko" : "en"] || "";

  // 대운 표시: 간지 + 연령대 + 십신
  const daeunDisplay = daeunGanji
    ? `${daeunGanji}(${daeunAge})${daeunFlow ? ` - ${daeunFlow}` : ""}`
    : isKo ? "정보 없음" : "N/A";

  // 세운 표시: 연도 + 간지 + 십신
  const yearDisplay = yearGanji
    ? `${yearNum}년 ${yearGanji}${yearFlow ? ` - ${yearFlow}` : ""}`
    : isKo ? "정보 없음" : "N/A";

  const flow = isKo
    ? `대운(10년 주기): ${daeunDisplay}\n세운(올해): ${yearDisplay}`
    : `Daeun (10-year): ${daeunDisplay}\nAnnual Luck: ${yearDisplay}`;

  const advice = isKo
    ? daeunSibsin && yearSibsin
      ? `${daeunFlow} 에너지 속에서 올해는 ${yearFlow}에 집중하세요.`
      : "현재 흐름에 맞춰 차근차근 나아가세요."
    : daeunSibsin && yearSibsin
      ? `Focus on ${yearFlow} within ${daeunFlow} energy this year.`
      : "Move forward steadily with the current flow.";

  return {
    title: isKo ? "지금 내 흐름" : "Current Flow",
    flow,
    advice,
    emoji: "🌊"
  };
}
