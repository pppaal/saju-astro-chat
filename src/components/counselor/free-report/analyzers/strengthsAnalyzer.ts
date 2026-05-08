// 강점/약점 분석
import {
  extractFiveElementsSorted,
  selectLang
} from './utils';
import {
  elementStrengthDescriptions,
  elementWeaknessDescriptions
} from '../data/elementAnalysisTraits';
import type { SajuData, AstroData, AspectData } from '../types';

export function getStrengthsAndWeaknesses(saju: SajuData | undefined, astro: AstroData | undefined, lang: string): {
  strengths: { text: string; source: string }[];
  weaknesses: { text: string; source: string; advice: string }[];
} | null {
  const isKo = lang === "ko";
  const strengths: { text: string; source: string }[] = [];
  const weaknesses: { text: string; source: string; advice: string }[] = [];

  // 사주 오행 분석
  const fiveElements = saju?.fiveElements;
  if (fiveElements) {
    const sorted = extractFiveElementsSorted(saju);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    if (strongest && typeof strongest[1] === 'number') {
      const element = strongest[0];
      const strength = elementStrengthDescriptions[element];
      if (strength) {
        strengths.push({
          text: selectLang(isKo, strength),
          source: isKo ? "사주" : "Saju"
        });
      }
    }

    if (weakest && typeof weakest[1] === 'number') {
      const element = weakest[0];
      const weakness = elementWeaknessDescriptions[element];
      if (weakness) {
        weaknesses.push({
          text: selectLang(isKo, weakness.text),
          source: isKo ? "사주" : "Saju",
          advice: selectLang(isKo, weakness.advice)
        });
      }
    }
  }

  // 점성술 강점 - 좋은 aspect 찾기
  const aspects = astro?.aspects;
  if (Array.isArray(aspects)) {
    const trineOrSextile = aspects.filter((a: AspectData) =>
      (a.type === 'Trine' || a.type === 'Sextile') && (a.orb ?? 10) < 3
    );
    if (trineOrSextile.length > 0) {
      const aspectCount = trineOrSextile.length;
      strengths.push({
        text: isKo
          ? `조화로운 행성 배치(${aspectCount}개)로 재능이 자연스럽게 발휘돼요.`
          : `Harmonious planetary aspects (${aspectCount}) help talents flow naturally.`,
        source: isKo ? "점성술" : "Astrology"
      });
    }
  }

  // 점성술 약점 - 어려운 aspect 찾기
  if (Array.isArray(aspects)) {
    const squareOrOpposition = aspects.filter((a: AspectData) =>
      (a.type === 'Square' || a.type === 'Opposition') && (a.orb ?? 10) < 3
    );
    if (squareOrOpposition.length >= 3) {
      weaknesses.push({
        text: isKo
          ? `긴장 관계 행성들이 있어 내적 갈등을 느낄 수 있어요.`
          : `Tense planetary aspects may create internal conflicts.`,
        source: isKo ? "점성술" : "Astrology",
        advice: isKo
          ? "이 긴장이 오히려 성장의 동력이 될 수 있어요. 갈등을 인정하고 균형을 찾으세요."
          : "This tension can be a catalyst for growth. Acknowledge conflicts and find balance."
      });
    }
  }

  if (strengths.length === 0 && weaknesses.length === 0) {return null;}

  return { strengths, weaknesses };
}
