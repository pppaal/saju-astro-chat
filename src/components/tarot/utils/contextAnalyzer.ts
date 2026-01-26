/**
 * Context analysis and contextual question generation
 * Extracted from TarotChat.tsx lines 24-31, 326-404
 */

import type { DrawnCard } from "@/lib/Tarot/tarot.types";

/**
 * Pre-compiled regex patterns for contextual question generation
 */
export const CONTEXT_PATTERNS = {
  love: /연애|사랑|관계|감정|연인|love|relationship/i,
  career: /직장|커리어|일|사업|job|career|work/i,
  change: /변화|전환|바꾸|change|transform/i,
  choice: /선택|결정|decision|choice/i,
  timing: /시기|타이밍|언제|when|timing/i,
  warning: /주의|조심|경고|warning|caution/i,
} as const;

/**
 * Generate contextual follow-up questions based on the last assistant response
 * Uses pre-compiled CONTEXT_PATTERNS for performance
 *
 * @param lastResponse - The last assistant response content
 * @param cards - The drawn cards for context
 * @param language - Language code ('ko' or 'en')
 * @returns Array of contextual questions
 */
export function generateContextualQuestions(
  lastResponse: string,
  cards: DrawnCard[],
  language: 'ko' | 'en'
): string[] {
  if (!lastResponse) {return [];}

  const contextualQuestions: string[] = [];

  // Extract key themes from the response using pre-compiled patterns
  const hasLove = CONTEXT_PATTERNS.love.test(lastResponse);
  const hasCareer = CONTEXT_PATTERNS.career.test(lastResponse);
  const hasChange = CONTEXT_PATTERNS.change.test(lastResponse);
  const hasChoice = CONTEXT_PATTERNS.choice.test(lastResponse);
  const hasTiming = CONTEXT_PATTERNS.timing.test(lastResponse);
  const hasWarning = CONTEXT_PATTERNS.warning.test(lastResponse);

  if (language === 'ko') {
    if (hasChoice) {
      contextualQuestions.push("어떤 선택이 더 나은 결과를 가져올까요?");
      contextualQuestions.push("결정을 내릴 때 가장 중요하게 봐야 할 점은?");
    }
    if (hasTiming) {
      contextualQuestions.push("구체적으로 언제쯤 행동하는 게 좋을까요?");
      contextualQuestions.push("이 시기가 지나면 어떻게 될까요?");
    }
    if (hasLove) {
      contextualQuestions.push("상대방은 어떻게 생각하고 있을까요?");
      contextualQuestions.push("관계를 발전시키려면 무엇이 필요한가요?");
    }
    if (hasCareer) {
      contextualQuestions.push("현재 직장에서 더 성장할 수 있을까요?");
      contextualQuestions.push("커리어 전환의 적기는 언제인가요?");
    }
    if (hasChange) {
      contextualQuestions.push("변화에 대비해 지금 준비해야 할 것은?");
      contextualQuestions.push("변화를 받아들이기 위한 마음가짐은?");
    }
    if (hasWarning) {
      contextualQuestions.push("구체적으로 어떤 점을 조심해야 하나요?");
      contextualQuestions.push("이 위험을 피하려면 어떻게 해야 할까요?");
    }

    // Card-specific questions based on what was mentioned
    if (cards.length > 1) {
      contextualQuestions.push(`${cards[0].card.nameKo || cards[0].card.name} 카드를 더 자세히 알고 싶어요`);
      contextualQuestions.push("카드들의 조합이 가진 특별한 의미가 있나요?");
    }
  } else {
    if (hasChoice) {
      contextualQuestions.push("Which choice leads to a better outcome?");
      contextualQuestions.push("What's most important to consider when deciding?");
    }
    if (hasTiming) {
      contextualQuestions.push("When exactly should I take action?");
      contextualQuestions.push("What happens after this period passes?");
    }
    if (hasLove) {
      contextualQuestions.push("What are they thinking/feeling?");
      contextualQuestions.push("What's needed to develop this relationship?");
    }
    if (hasCareer) {
      contextualQuestions.push("Can I grow more at my current job?");
      contextualQuestions.push("When is the right time for a career change?");
    }
    if (hasChange) {
      contextualQuestions.push("What should I prepare for this change?");
      contextualQuestions.push("How should I embrace this transformation?");
    }
    if (hasWarning) {
      contextualQuestions.push("What specifically should I be careful about?");
      contextualQuestions.push("How can I avoid this risk?");
    }

    if (cards.length > 1) {
      contextualQuestions.push(`Tell me more about the ${cards[0].card.name} card`);
      contextualQuestions.push("Is there special meaning in this card combination?");
    }
  }

  return contextualQuestions;
}
