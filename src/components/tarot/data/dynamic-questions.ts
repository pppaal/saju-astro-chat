/**
 * @file Dynamic question generation utilities for TarotChat
 */

import type { LangKey } from './tarot-chat-i18n';
import {
  CARD_SPECIFIC_QUESTIONS,
  REVERSED_QUESTIONS,
  COMBINATION_QUESTIONS,
  SUIT_QUESTIONS,
  COURT_CARD_QUESTIONS,
  MINOR_ARCANA_QUESTIONS,
  ELEMENT_INTERACTION_QUESTIONS,
  COURT_RELATIONSHIP_QUESTIONS,
} from './card-questions';

// Helper: Extract suit from card name
export function getSuitFromCard(cardName: string): string | null {
  if (cardName.includes("Wands")) {return "Wands";}
  if (cardName.includes("Cups")) {return "Cups";}
  if (cardName.includes("Swords")) {return "Swords";}
  if (cardName.includes("Pentacles")) {return "Pentacles";}
  return null;
}

// Helper: Extract number/rank from card name
export function getNumberFromCard(cardName: string): string | null {
  const numbers = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  for (const num of numbers) {
    if (cardName.includes(num)) {return num;}
  }
  return null;
}

// Helper: Extract court rank from card name
export function getCourtRankFromCard(cardName: string): string | null {
  if (cardName.includes("Page")) {return "Page";}
  if (cardName.includes("Knight")) {return "Knight";}
  if (cardName.includes("Queen")) {return "Queen";}
  if (cardName.includes("King")) {return "King";}
  return null;
}

// Generate dynamic questions based on actual drawn cards (울트라 프리미엄)
export function generateDynamicQuestions(
  drawnCards: { card: { name: string }; isReversed: boolean }[],
  language: LangKey
): string[] {
  const questions: string[] = [];
  const cardNames = drawnCards.map(dc => dc.card.name);

  // Track for advanced analysis
  const suitCounts: Record<string, number> = { Wands: 0, Cups: 0, Swords: 0, Pentacles: 0 };
  const numberCounts: Record<string, number> = {};
  const courtRanks: string[] = [];
  const elements: string[] = [];
  const suitToElement: Record<string, string> = {
    Wands: "Fire", Cups: "Water", Swords: "Air", Pentacles: "Earth"
  };

  for (const dc of drawnCards) {
    const cardName = dc.card.name;

    // 1. PRIORITY: Specific Minor Arcana questions (most precise)
    const specificMinorQ = MINOR_ARCANA_QUESTIONS[cardName]?.[language];
    if (specificMinorQ && specificMinorQ.length > 0 && questions.length < 2) {
      questions.push(specificMinorQ[0]);
      continue; // Skip generic suit/number for this card
    }

    // 2. Major Arcana - Card-specific questions
    const majorQuestions = CARD_SPECIFIC_QUESTIONS[cardName]?.[language];
    if (majorQuestions && majorQuestions.length > 0 && questions.length < 3) {
      questions.push(majorQuestions[0]);
    }

    // Track suit for element analysis
    const suit = getSuitFromCard(cardName);
    if (suit) {
      suitCounts[suit]++;
      elements.push(suitToElement[suit]);

      // Add suit question only if no specific minor arcana question
      if (suitCounts[suit] === 1 && !specificMinorQ && questions.length < 4) {
        const suitQs = SUIT_QUESTIONS[suit]?.[language];
        if (suitQs && suitQs.length > 0) {
          questions.push(suitQs[0]);
        }
      }
    }

    // Track number for numerology
    const number = getNumberFromCard(cardName);
    if (number) {
      numberCounts[number] = (numberCounts[number] || 0) + 1;
    }

    // Track court cards for relationship dynamics
    const courtRank = getCourtRankFromCard(cardName);
    if (courtRank) {
      courtRanks.push(courtRank);
      if (questions.length < 5) {
        const courtQs = COURT_CARD_QUESTIONS[courtRank]?.[language];
        if (courtQs && courtQs.length > 0) {
          questions.push(courtQs[0]);
        }
      }
    }
  }

  // 3. Court Card Relationship Dynamics (궁정 카드 관계)
  if (courtRanks.length >= 2) {
    const uniqueRanks = Array.from(new Set(courtRanks)).sort();
    for (let i = 0; i < uniqueRanks.length - 1; i++) {
      for (let j = i + 1; j < uniqueRanks.length; j++) {
        const comboKey = `${uniqueRanks[i]}+${uniqueRanks[j]}`;
        const courtComboQ = COURT_RELATIONSHIP_QUESTIONS[comboKey]?.[language];
        if (courtComboQ && courtComboQ.length > 0) {
          questions.push(courtComboQ[0]);
          break;
        }
      }
    }
  }

  // 4. Element Interaction Questions (원소 상호작용)
  const uniqueElements = Array.from(new Set(elements));
  if (uniqueElements.length >= 2) {
    const elem1 = uniqueElements[0];
    const elem2 = uniqueElements[1];
    const elementComboKey = `${elem1}+${elem2}`;
    const reverseKey = `${elem2}+${elem1}`;
    const elementQ = ELEMENT_INTERACTION_QUESTIONS[elementComboKey]?.[language] ||
                     ELEMENT_INTERACTION_QUESTIONS[reverseKey]?.[language];
    if (elementQ && elementQ.length > 0) {
      questions.push(elementQ[0]);
    }
  }

  // 5. Reversed card questions
  const reversedCards = drawnCards.filter(dc => dc.isReversed).slice(0, 2);
  for (const rc of reversedCards) {
    if (questions.length < 7) {
      const reversedQs = REVERSED_QUESTIONS[language](rc.card.name);
      if (reversedQs.length > 0) {
        questions.push(reversedQs[0]);
      }
    }
  }

  // 6. Major Arcana Combinations
  for (const comboKey of Object.keys(COMBINATION_QUESTIONS)) {
    const [card1, card2] = comboKey.split("+");
    if (cardNames.includes(card1) && cardNames.includes(card2)) {
      const comboQuestions = COMBINATION_QUESTIONS[comboKey]?.[language];
      if (comboQuestions && comboQuestions.length > 0) {
        questions.push(comboQuestions[0]);
      }
      break;
    }
  }

  // 7. Dominant element analysis
  const dominantSuit = Object.entries(suitCounts).find(([_, count]) => count >= 2)?.[0];
  if (dominantSuit) {
    const elementNames: Record<string, Record<LangKey, string>> = {
      Wands: { ko: "불", en: "Fire" },
      Cups: { ko: "물", en: "Water" },
      Swords: { ko: "공기", en: "Air" },
      Pentacles: { ko: "땅", en: "Earth" }
    };
    const element = elementNames[dominantSuit]?.[language] || dominantSuit;
    questions.push(
      language === "ko"
        ? `${element}의 에너지가 지배적입니다. 이 원소의 균형을 어떻게 맞출까요?`
        : `${element} energy is dominant. How should I balance this element?`
    );
  }

  // 8. Missing element insight
  const presentElements = Object.entries(suitCounts).filter(([_, c]) => c > 0).map(([s]) => s);
  const allSuits = ["Wands", "Cups", "Swords", "Pentacles"];
  const missingSuits = allSuits.filter(s => !presentElements.includes(s));
  if (missingSuits.length > 0 && missingSuits.length < 4 && questions.length < 8) {
    const missingElementNames: Record<string, Record<LangKey, string>> = {
      Wands: { ko: "열정과 행동(불)", en: "passion and action (Fire)" },
      Cups: { ko: "감정과 직관(물)", en: "emotion and intuition (Water)" },
      Swords: { ko: "사고와 소통(공기)", en: "thought and communication (Air)" },
      Pentacles: { ko: "물질과 현실(땅)", en: "material and reality (Earth)" }
    };
    const missing = missingElementNames[missingSuits[0]]?.[language];
    if (missing) {
      questions.push(
        language === "ko"
          ? `${missing}의 에너지가 부족합니다. 이 영역에 더 주의를 기울여야 할까요?`
          : `${missing} energy is missing. Should I pay more attention to this area?`
      );
    }
  }

  // 9. Repeated number emphasis
  const repeatedNumber = Object.entries(numberCounts).find(([_, count]) => count >= 2)?.[0];
  if (repeatedNumber) {
    questions.push(
      language === "ko"
        ? `${repeatedNumber} 카드가 여러 장 나왔습니다. 이 숫자의 강조된 의미는?`
        : `Multiple ${repeatedNumber} cards appeared. What is the emphasized meaning of this number?`
    );
  }

  // 10. Transformation timing
  const timingCards = ["Death", "Wheel of Fortune", "The World", "The Sun", "The Tower", "Judgement"];
  if (cardNames.some(name => timingCards.includes(name)) && questions.length < 10) {
    questions.push(
      language === "ko"
        ? "이 변화나 완성이 언제쯤 일어날까요?"
        : "When will this change or completion happen?"
    );
  }

  // 11. Card flow/story question (for 3+ cards)
  if (drawnCards.length >= 3 && questions.length < 10) {
    questions.push(
      language === "ko"
        ? "이 카드들이 보여주는 전체적인 이야기의 흐름은?"
        : "What is the overall story flow these cards are showing?"
    );
  }

  // Return unique questions (max 10 for 울트라 프리미엄)
  return Array.from(new Set(questions)).slice(0, 10);
}
