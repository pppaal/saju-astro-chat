/**
 * Topic detection and question generation utilities
 * Extracted from TarotChat.tsx lines 13-21, 213-304
 */

/**
 * Pre-compiled regex patterns for topic detection (performance optimization)
 */
export const TOPIC_PATTERNS = {
  love: /연애|사랑|이별|짝사랑|결혼|연인|데이트|소개팅|love|relationship|dating|marriage|crush|ex/i,
  career: /취업|이직|직장|회사|업무|승진|면접|사업|창업|job|career|work|business|promotion|interview/i,
  money: /돈|재정|투자|주식|재물|월급|빚|대출|money|finance|invest|wealth|salary/i,
  health: /건강|다이어트|운동|병|치료|스트레스|health|diet|exercise|stress/i,
  study: /공부|시험|합격|학업|자격증|study|exam|test|school|university/i,
  family: /가족|부모|자녀|형제|집안|family|parents|children/i,
  decision: /선택|결정|고민|어떻게|해야|decision|choice|should|choose/i,
} as const;

/**
 * Generate topic-based questions from user topic
 * Uses pre-compiled TOPIC_PATTERNS for performance
 *
 * @param userTopic - The user's topic/question
 * @param language - Language code ('ko' or 'en')
 * @returns Array of topic-based questions
 */
export function generateTopicBasedQuestions(
  userTopic: string | undefined,
  language: 'ko' | 'en'
): string[] {
  if (!userTopic || userTopic.trim().length === 0) return [];

  const topic = userTopic.toLowerCase();
  const topicQuestions: string[] = [];

  // Detect topic themes using pre-compiled patterns
  const isLove = TOPIC_PATTERNS.love.test(topic);
  const isCareer = TOPIC_PATTERNS.career.test(topic);
  const isMoney = TOPIC_PATTERNS.money.test(topic);
  const isHealth = TOPIC_PATTERNS.health.test(topic);
  const isStudy = TOPIC_PATTERNS.study.test(topic);
  const isFamily = TOPIC_PATTERNS.family.test(topic);
  const isDecision = TOPIC_PATTERNS.decision.test(topic);

  if (language === 'ko') {
    // Add the user's original topic as a question prefix
    if (userTopic.length < 50) {
      topicQuestions.push(`"${userTopic}"에 대해 카드가 알려주는 조언은?`);
    }

    if (isLove) {
      topicQuestions.push("이 연애 고민에서 상대방의 마음은 어떤가요?");
      topicQuestions.push("이 관계의 미래는 어떻게 될까요?");
    }
    if (isCareer) {
      topicQuestions.push("이 커리어 결정에서 가장 중요하게 봐야 할 점은?");
      topicQuestions.push("직장에서의 전망은 어떤가요?");
    }
    if (isMoney) {
      topicQuestions.push("재정 상황이 언제쯤 나아질까요?");
      topicQuestions.push("금전적으로 주의해야 할 점은?");
    }
    if (isHealth) {
      topicQuestions.push("건강을 위해 특별히 신경 써야 할 부분은?");
    }
    if (isStudy) {
      topicQuestions.push("시험/공부 운이 어떤가요?");
      topicQuestions.push("학업에서 집중해야 할 방향은?");
    }
    if (isFamily) {
      topicQuestions.push("가족 관계를 개선하려면 어떻게 해야 할까요?");
    }
    if (isDecision) {
      topicQuestions.push("이 선택에서 어떤 방향이 더 좋을까요?");
      topicQuestions.push("결정을 내리기 전에 고려해야 할 점은?");
    }

    // Generic topic-related questions
    if (topicQuestions.length < 2) {
      topicQuestions.push("이 상황에서 가장 주의해야 할 점은?");
      topicQuestions.push("이 문제 해결을 위한 구체적인 조언은?");
    }
  } else {
    if (userTopic.length < 50) {
      topicQuestions.push(`What do the cards advise about "${userTopic}"?`);
    }

    if (isLove) {
      topicQuestions.push("What are their true feelings about this?");
      topicQuestions.push("What is the future of this relationship?");
    }
    if (isCareer) {
      topicQuestions.push("What's most important for this career decision?");
      topicQuestions.push("What does my professional future look like?");
    }
    if (isMoney) {
      topicQuestions.push("When will my financial situation improve?");
      topicQuestions.push("What financial pitfalls should I avoid?");
    }
    if (isHealth) {
      topicQuestions.push("What health aspects need special attention?");
    }
    if (isStudy) {
      topicQuestions.push("How are my study/exam prospects?");
    }
    if (isFamily) {
      topicQuestions.push("How can I improve family relationships?");
    }
    if (isDecision) {
      topicQuestions.push("Which direction is better for this choice?");
      topicQuestions.push("What should I consider before deciding?");
    }

    if (topicQuestions.length < 2) {
      topicQuestions.push("What should I watch out for in this situation?");
      topicQuestions.push("What's the specific advice for this issue?");
    }
  }

  return topicQuestions;
}
