// lib/numerology-analysis.ts
import { CoreNumerologyProfile, NumerologyNumber } from './numerology';

// 숫자들을 특정 그룹(Essence)으로 묶어 분석을 용이하게 함
const getNumberEssence = (num: NumerologyNumber): string => {
  const n = parseInt(num.toString(), 10);
  if ([1, 5, 7, 11].includes(n)) return '정신적/독립적';
  if ([2, 4, 8, 22].includes(n)) return '물질적/현실적';
  if ([3, 6, 9, 33].includes(n)) return '창의적/감성적';
  return '기타';
};

/**
 * 두 숫자 간의 관계를 분석 (조화, 도전, 중립)
 */
const getRelationshipType = (num1: NumerologyNumber, num2: NumerologyNumber): '조화' | '도전' | '중립' => {
    if (num1 === num2) return '조화';
    if (getNumberEssence(num1) === getNumberEssence(num2)) return '조화';
    
    // 예: 현실적(4)과 정신적(7)은 도전적인 관계일 수 있음
    const essence1 = getNumberEssence(num1);
    const essence2 = getNumberEssence(num2);
    if ((essence1 === '물질적/현실적' && essence2 === '정신적/독립적') || (essence1 === '정신적/독립적' && essence2 === '물질적/현실적')) {
        return '도전';
    }

    return '중립';
}


export function getSynergyAnalysis(profile: CoreNumerologyProfile): string[] {
  const analysis: string[] = [];
  const { lifePathNumber: lp, expressionNumber: exp, soulUrgeNumber: soul, personalityNumber: pers, birthdayNumber: birth } = profile;

  analysis.push("--- 🧬 핵심 정체성 분석 (인생 경로 + 표현) ---");

  // 1. 인생 경로 vs 표현 숫자 분석
  const lpExpRelation = getRelationshipType(lp, exp);
  if (lp === exp) {
    analysis.push(`✨ [완벽한 조화] 인생의 목표(${lp})와 타고난 재능(${exp})이 완벽하게 일치합니다. 당신은 자신의 재능을 발휘하는 것만으로도 자연스럽게 운명의 길을 걷게 되며, 삶에서 큰 성취를 이룰 가능성이 높습니다.`);
  } else if (lpExpRelation === '조화') {
    analysis.push(`👍 [자연스러운 흐름] 당신의 재능(${exp})은 인생의 목표(${lp})를 자연스럽게 지지해줍니다. 큰 노력 없이도 재능을 활용하여 행복과 성공을 향해 나아갈 수 있는 긍정적인 조합입니다.`);
  } else if (lpExpRelation === '도전') {
    analysis.push(`💡 [성장의 기회] 당신의 재능(${exp})과 인생의 목표(${lp})는 서로 다른 가치를 추구할 수 있습니다. 이는 때로 내적 갈등을 유발하지만, 두 영역의 균형을 맞추는 법을 배운다면 누구보다 다재다능하고 지혜로운 사람으로 성장할 것입니다.`);
  } else {
    analysis.push(`🧩 [독특한 조합] 인생의 목표(${lp})와 재능(${exp})은 서로 다른 영역에 속해 있습니다. 이는 당신의 삶을 다채롭게 만들며, 두 가지 능력을 연결하여 자신만의 독특한 길을 개척할 수 있는 잠재력을 의미합니다.`);
  }

  analysis.push("\n--- 💖 내면과 외면 분석 (소울 + 페르소나) ---");

  // 2. 소울 vs 페르소나 숫자 분석
  const soulPersRelation = getRelationshipType(soul, pers);
  if (soul === pers) {
    analysis.push(`💖 [투명한 자아] 당신의 진정한 내면(${soul})과 세상에 보여지는 모습(${pers})이 완벽히 일치합니다. 사람들은 당신을 진실되고 일관된 사람으로 신뢰하며, 당신 스스로도 내적 갈등이 적어 편안함을 느낍니다.`);
  } else if (soulPersRelation === '조화') {
    analysis.push(`😊 [매력적인 일관성] 당신의 내면적 욕망(${soul})은 자연스럽게 외적인 모습(${pers})으로 드러납니다. 사람들은 당신을 편안하고 매력적인 사람으로 느끼며, 당신의 진심은 잘 전달되는 편입니다.`);
  } else {
    analysis.push(`🎭 [신비로운 매력] 당신의 깊은 내적 욕망(${soul})과 다른 사람들에게 보여지는 모습(${pers}) 사이에는 차이가 있습니다. 사람들은 당신의 진정한 모습을 모두 알지 못할 수 있으며, 이것이 당신만의 신비롭고 흥미로운 매력이 되기도 합니다. 때로는 혼자만의 시간이 꼭 필요합니다.`);
  }
  
  analysis.push("\n--- 🚀 잠재력과 과제 분석 ---");

  // 3. 브릿지 숫자 (인생 경로와 표현의 차이)
  const bridgeNumber = Math.abs(parseInt(lp.toString()) - parseInt(exp.toString()));
  if (bridgeNumber > 0) {
      analysis.push(`🌉 [숨겨진 과제] 당신의 인생 목표와 재능 사이의 다리(Bridge)는 숫자 ${bridgeNumber}입니다. 이는 당신이 두 영역을 연결하기 위해 '${getNumberEssence(bridgeNumber)}'적인 가치를 발전시켜야 함을 의미합니다. 이것이 당신의 숨겨진 성장 포인트입니다.`);
  }

  // 4. 생일 숫자의 영향력
  analysis.push(`🎁 [타고난 재능] 당신의 생일 숫자 ${birth}는 당신에게 특별한 재능을 부여합니다. 이 재능은 인생의 어려움을 극복하거나, 핵심 정체성을 더욱 빛나게 하는 당신만의 '비밀 무기'와 같습니다.`);

  // 5. 전체적인 프로필 경향성
  const allNumbers = [lp, exp, soul, pers];
  const essenceCounts = {
    '정신적/독립적': 0,
    '물질적/현실적': 0,
    '창의적/감성적': 0,
  };

  allNumbers.forEach(num => {
    const essence = getNumberEssence(num);
    if (essence !== '기타') {
      essenceCounts[essence]++;
    }
  });

  const dominantEssence = Object.keys(essenceCounts).reduce((a, b) => essenceCounts[a] > essenceCounts[b] ? a : b);
  if (essenceCounts[dominantEssence] >= 3) {
      analysis.push(`📈 [전체적 성향] 당신의 프로필 전반에 '${dominantEssence}' 에너지가 강하게 나타납니다. 이는 당신의 삶에서 이 영역이 매우 중요한 역할을 한다는 것을 의미합니다.`);
  }

  return analysis;
}