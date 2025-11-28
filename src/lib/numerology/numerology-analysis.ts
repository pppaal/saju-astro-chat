// src/lib/numerology/numerology-analysis.ts
import { CoreNumerologyProfile, NumerologyNumber } from "./numerology";
import { reduceToCore } from "./utils";

const getNumberEssence = (num: NumerologyNumber): "정신적/독립적" | "물질적/현실적" | "창의적/감성적" | "기타" => {
  const n = reduceToCore(num);
  if ([1, 5, 7, 11].includes(n)) return "정신적/독립적";
  if ([2, 4, 8, 22].includes(n)) return "물질적/현실적";
  if ([3, 6, 9, 33].includes(n)) return "창의적/감성적";
  return "기타";
};

const getRelationshipType = (num1: NumerologyNumber, num2: NumerologyNumber): "조화" | "도전" | "중립" => {
  const a = reduceToCore(num1);
  const b = reduceToCore(num2);
  if (a === b) return "조화";
  if (getNumberEssence(a) === getNumberEssence(b)) return "조화";
  const e1 = getNumberEssence(a);
  const e2 = getNumberEssence(b);
  if (
    (e1 === "물질적/현실적" && e2 === "정신적/독립적") ||
    (e1 === "정신적/독립적" && e2 === "물질적/현실적")
  ) return "도전";
  return "중립";
};

export function getSynergyAnalysis(profile: CoreNumerologyProfile): string[] {
  const analysis: string[] = [];
  const {
    lifePathNumber: lp,
    expressionNumber: exp,
    soulUrgeNumber: soul,
    personalityNumber: pers,
    birthdayNumber: birth,
  } = profile;

  analysis.push("--- 🧬 핵심 정체성 분석 (인생 경로 + 표현) ---");

  const lpExpRelation = getRelationshipType(lp, exp);
  if (reduceToCore(lp) === reduceToCore(exp)) {
    analysis.push(`✨ [완벽한 조화] 인생의 목표(${lp})와 타고난 재능(${exp})이 완벽하게 일치합니다. 자연스럽게 큰 성취를 이룰 가능성이 높습니다.`);
  } else if (lpExpRelation === "조화") {
    analysis.push(`👍 [자연스러운 흐름] 재능(${exp})이 목표(${lp})를 지지합니다. 강점을 전면에 두면 성과가 빨라집니다.`);
  } else if (lpExpRelation === "도전") {
    analysis.push(`💡 [성장의 기회] 재능(${exp})과 목표(${lp})의 관점 차이가 내적 갈등을 만들 수 있습니다. 균형 훈련이 곧 성장 포인트입니다.`);
  } else {
    analysis.push(`🧩 [독특한 조합] 두 영역이 달라 당신만의 길을 개척할 잠재력이 큽니다. 연결 전략을 연구해보세요.`);
  }

  analysis.push("\n--- 💖 내면과 외면 분석 (소울 + 페르소나) ---");

  const soulPersRelation = getRelationshipType(soul, pers);
  if (reduceToCore(soul) === reduceToCore(pers)) {
    analysis.push(`💖 [투명한 자아] 내면(${soul})과 외면(${pers})이 일치합니다. 신뢰와 편안함이 강점입니다.`);
  } else if (soulPersRelation === "조화") {
    analysis.push(`😊 [매력적인 일관성] 욕망(${soul})이 자연스레 모습(${pers})으로 드러납니다. 메시지 전달력이 좋습니다.`);
  } else {
    analysis.push(`🎭 [신비로운 매력] 내면(${soul})과 외면(${pers})의 차이가 독특함을 만듭니다. 회복을 위해 혼자만의 시간이 필요할 수 있습니다.`);
  }

  analysis.push("\n--- 🚀 잠재력과 과제 분석 ---");

  const bridgeNumberRaw = Math.abs(Number(lp) - Number(exp));
  const bridgeNumber = reduceToCore(bridgeNumberRaw);
  if (bridgeNumberRaw > 0) {
    analysis.push(`🌉 [브릿지] 두 축을 연결하는 키는 ${bridgeNumber} 에너지입니다. 이것이 현재 성장 포인트입니다.`);
  }

  analysis.push(`🎁 [타고난 재능] 생일 숫자 ${birth}는 당신의 고유한 재능을 비춥니다.`);

  const all = [lp, exp, soul, pers];
  type Essence = "정신적/독립적" | "물질적/현실적" | "창의적/감성적";
  const counts: Record<Essence, number> = { "정신적/독립적": 0, "물질적/현실적": 0, "창의적/감성적": 0 };
  all.forEach((n) => {
    const e = getNumberEssence(n);
    if (e !== "기타") counts[e]++;
  });
  const dominant = (Object.keys(counts) as Essence[]).reduce((a, b) => (counts[a] > counts[b] ? a : b), "정신적/독립적");
  if (counts[dominant] >= 3) {
    analysis.push(`📈 [전체 성향] '${dominant}' 에너지가 두드러집니다. 이 영역을 전략의 중심에 두세요.`);
  }

  return analysis;
}