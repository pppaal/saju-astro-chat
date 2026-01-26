// src/lib/icp/analysis.ts
/**
 * ICP 설문 분석 로직
 */

import type { ICPQuizAnswers, ICPAnalysis, ICPOctant, ICPOctantCode, PersonaAxisData, CrossSystemCompatibility } from './types';
import { icpQuestions } from './questions';

// 8 Octant definitions with emojis for intuitive display
export const ICP_OCTANTS: Record<ICPOctantCode, ICPOctant> = {
  PA: {
    code: 'PA',
    emoji: '👑',
    name: 'The Leader',
    korean: '리더형',
    traits: ['Leadership', 'Confidence', 'Decisive', 'Takes initiative'],
    traitsKo: ['리더십', '자신감', '결단력', '주도적'],
    shadow: '때로는 다른 사람의 의견을 듣지 않고 혼자 결정하려 할 수 있어요. 모든 걸 내가 해야 한다는 생각이 오히려 팀을 지치게 만들 수도 있습니다.',
    shadowKo: '때로는 다른 사람의 의견을 듣지 않고 혼자 결정하려 할 수 있어요. 모든 걸 내가 해야 한다는 생각이 오히려 팀을 지치게 만들 수도 있습니다.',
    dominance: 1.0,
    affiliation: 0.5,
    description: 'You naturally take the lead and guide others with confidence. You\'re the friend who picks the restaurant, organizes the trip, and makes sure everyone has a good time.',
    descriptionKo: '당신은 자연스럽게 앞장서서 사람들을 이끄는 타입이에요. 친구들 모임에서 식당을 정하고, 여행을 계획하고, 모두가 즐거운 시간을 보낼 수 있도록 챙기는 역할을 맡곤 하죠. 어려운 결정도 피하지 않고, 책임지는 것을 두려워하지 않아요.',
    therapeuticQuestions: [
      'When you delegate, do you find yourself monitoring closely or truly stepping back? What does this reveal about your comfort with others\' methods?',
      'Recall a time when someone else\'s idea worked better than yours. How did that feel, and what did you learn?',
      'If you weren\'t the one in charge, what would you miss most? What might you gain?',
    ],
    therapeuticQuestionsKo: [
      '일을 맡길 때 계속 확인하게 되나요, 아니면 완전히 맡기나요?',
      '다른 사람 아이디어가 더 좋았던 적, 그때 기분이 어땠나요?',
      '리더가 아니어도 괜찮다면, 뭐가 좋을까요?',
    ],
    growthRecommendations: [
      'Week 1: In one meeting, ask 3 open-ended questions before sharing your view. Notice what insights emerge.',
      'Week 2-3: Follow up on someone else\'s idea instead of proposing yours. Actively support their vision.',
      'Month 1: Delegate a high-visibility project and resist checking in for 2 weeks. Trust the process.',
      'Integration: Reflect on how good outcomes can happen through others\' ideas and methods, not just your own.',
    ],
    growthRecommendationsKo: [
      '이번 주: 회의에서 의견 내기 전에 먼저 질문 3개 해보기',
      '다음 주: 내 아이디어 대신 다른 사람 아이디어 밀어주기',
      '한 달 목표: 프로젝트 맡기고 2주간 참견 안 하기',
      '핵심: 좋은 결과는 내 방식만으로 나오는 게 아니에요',
    ],
  },
  BC: {
    code: 'BC',
    emoji: '🏆',
    name: 'The Achiever',
    korean: '성취형',
    traits: ['Ambitious', 'Goal-driven', 'Competitive', 'Independent'],
    traitsKo: ['야망', '목표지향', '승부욕', '독립적'],
    shadow: '이기려는 마음이 너무 강해지면 주변 사람들이 불편해할 수 있어요. 때로는 협력하는 게 혼자 이기는 것보다 더 큰 성과를 가져다줘요.',
    shadowKo: '이기려는 마음이 너무 강해지면 주변 사람들이 불편해할 수 있어요. 때로는 협력하는 게 혼자 이기는 것보다 더 큰 성과를 가져다줘요.',
    dominance: 0.7,
    affiliation: -0.7,
    description: 'You\'re driven by goals and love the thrill of achieving them. Whether it\'s work, games, or personal challenges, you give it your all.',
    descriptionKo: '당신은 목표를 세우고 달성하는 데서 에너지를 얻어요. 게임에서 이기든, 업무에서 성과를 내든, 승부욕이 강하고 최선을 다하죠. 다른 사람과 비교하면서 동기부여를 받고, 어려운 도전일수록 더 불타오르는 타입이에요.',
    therapeuticQuestions: [
      'What would success look like if it wasn\'t measured by rankings or comparisons? What intrinsic goals matter to you?',
      'When did you last genuinely celebrate someone else\'s achievement without comparison to your own? How did that feel?',
      'What vulnerability or weakness are you avoiding by staying in constant competition mode?',
    ],
    therapeuticQuestionsKo: [
      '순위나 비교 없이 성공이란 어떤 모습일까요?',
      '마지막으로 진심으로 다른 사람 성공을 축하해준 적은 언제예요?',
      '계속 경쟁하면서 피하고 있는 감정이 있나요?',
    ],
    growthRecommendations: [
      'Week 1: Notice when you compare yourself to others. Pause and redirect to your own progress instead.',
      'Week 2-3: In one collaboration, genuinely praise someone else\'s idea. Let it be their win, not yours.',
      'Month 1: Ask someone for help with something you don\'t excel at. Notice how it feels to be vulnerable.',
      'Integration: Explore what "enough" looks like - when is achievement fulfilling without the need to surpass others?',
    ],
    growthRecommendationsKo: [
      '이번 주: 남과 비교할 때 멈추고, 내 성장에 집중하기',
      '다음 주: 다른 사람 아이디어 진심으로 칭찬해보기',
      '한 달 목표: 못하는 분야에서 도움 요청해보기',
      '핵심: "충분하다"는 게 뭔지 생각해보기',
    ],
  },
  DE: {
    code: 'DE',
    emoji: '🧊',
    name: 'The Analyst',
    korean: '분석형',
    traits: ['Logical', 'Objective', 'Independent', 'Thoughtful'],
    traitsKo: ['논리적', '객관적', '독립적', '신중함'],
    shadow: '혼자만의 시간이 너무 많아지면 외로워질 수 있어요. 가끔은 감정을 드러내는 게 관계를 더 깊게 만들어요.',
    shadowKo: '혼자만의 시간이 너무 많아지면 외로워질 수 있어요. 가끔은 감정을 드러내는 게 관계를 더 깊게 만들어요.',
    dominance: 0.0,
    affiliation: -1.0,
    description: 'You think before you feel, and prefer logic over drama. You\'re the friend who gives honest, objective advice without sugarcoating.',
    descriptionKo: '당신은 감정보다 논리를 앞세우는 타입이에요. 객관적으로 상황을 바라보고, 드라마 같은 감정 소모를 피하려고 해요. 혼자만의 시간이 필요하고, 사람 많은 모임은 에너지가 빠지는 느낌이 들죠. 가까운 친구에게는 솔직하고 진실된 조언을 해주는 든든한 존재예요.',
    therapeuticQuestions: [
      'What would it feel like to let someone see your uncertainty or confusion, not just your analytical conclusions?',
      'Recall a moment when you felt truly connected to another person. What made that safe enough to allow?',
      'What might you be missing by staying in observer mode rather than participant mode in relationships?',
    ],
    therapeuticQuestionsKo: [
      '결론 대신 고민하는 모습을 보여주면 어떨까요?',
      '누군가와 진짜 연결됐다고 느낀 적 있나요? 그때 뭐가 달랐나요?',
      '관찰만 하다가 놓치는 게 있을까요?',
    ],
    growthRecommendations: [
      'Week 1: Schedule one social activity. Before declining, notice your automatic "no" and choose to attend anyway.',
      'Week 2-3: Share one feeling (not just a thought) with someone daily. Start with "I felt..." not "I think..."',
      'Month 1: Initiate a conversation about something personal, not just intellectual topics. Ask "How are you feeling?" and listen.',
      'Integration: Recognize that connection doesn\'t require losing your independence - you can be close AND autonomous.',
    ],
    growthRecommendationsKo: [
      '이번 주: 거절하고 싶을 때 한 번은 참석해보기',
      '다음 주: "나는 이렇게 느꼈어"로 대화 시작해보기',
      '한 달 목표: 개인적인 이야기로 대화 시작해보기',
      '핵심: 가까워져도 독립성은 잃지 않아요',
    ],
  },
  FG: {
    code: 'FG',
    emoji: '🌙',
    name: 'The Observer',
    korean: '관찰형',
    traits: ['Thoughtful', 'Careful', 'Perceptive', 'Quiet'],
    traitsKo: ['사려깊음', '신중함', '관찰력', '조용함'],
    shadow: '너무 조용하면 원하는 걸 얻지 못할 수도 있어요. 가끔은 먼저 말하는 게 필요해요.',
    shadowKo: '너무 조용하면 원하는 걸 얻지 못할 수도 있어요. 가끔은 먼저 말하는 게 필요해요.',
    dominance: -0.7,
    affiliation: -0.7,
    description: 'You watch and listen before speaking. You notice details others miss and prefer deep one-on-one conversations over crowded parties.',
    descriptionKo: '당신은 말하기 전에 충분히 관찰하고 듣는 타입이에요. 다른 사람들이 놓치는 세세한 것들을 잘 알아채고, 시끌벅적한 모임보다 조용히 깊은 대화를 나누는 걸 좋아해요. 뒤에서 묵묵히 지원하는 역할을 할 때 편안함을 느끼죠.',
    therapeuticQuestions: [
      'If you gave yourself the same compassion you give others, what would change in how you see yourself?',
      'What evidence contradicts the belief that you\'re not good enough? Can you list three examples?',
      'Imagine someone you respect saying your self-critical thoughts out loud to you. How would that feel? Would you accept it?',
    ],
    therapeuticQuestionsKo: [
      '나한테도 남한테처럼 너그러워진다면?',
      '내가 괜찮다는 증거 3가지 생각해볼 수 있나요?',
      '내 자기비판을 존경하는 사람이 말한다면, 받아들일 수 있나요?',
    ],
    growthRecommendations: [
      'Week 1: Each day, write down one thing you did well - no matter how small. Read the list weekly.',
      'Week 2-3: When someone compliments you, say "Thank you" without deflecting or minimizing. Notice the urge to dismiss it.',
      'Month 1: Voice one opinion in a meeting or conversation each week. Start with "I think..." or "My perspective is..."',
      'Integration: Your humility is valuable, but it shouldn\'t mean invisibility. You can be both humble AND visible.',
    ],
    growthRecommendationsKo: [
      '이번 주: 매일 잘한 거 하나씩 적어보기',
      '다음 주: 칭찬 들으면 겸손 떨지 말고 "고마워!" 해보기',
      '한 달 목표: 매주 회의에서 한 번은 의견 말하기',
      '핵심: 겸손해도 존재감은 있을 수 있어요',
    ],
  },
  HI: {
    code: 'HI',
    emoji: '🕊️',
    name: 'The Peacemaker',
    korean: '평화형',
    traits: ['Easygoing', 'Flexible', 'Gentle', 'Accepting'],
    traitsKo: ['유순함', '유연함', '온화함', '수용적'],
    shadow: '항상 다른 사람 의견에 맞추다 보면 정작 내가 원하는 게 뭔지 잊을 수 있어요.',
    shadowKo: '항상 다른 사람 의견에 맞추다 보면 정작 내가 원하는 게 뭔지 잊을 수 있어요.',
    dominance: -1.0,
    affiliation: 0.0,
    description: 'You go with the flow and hate conflict. You\'re the friend who says "I\'m fine with anything!" and genuinely means it.',
    descriptionKo: '당신은 흐름을 잘 따르고 갈등을 싫어해요. "난 아무거나 괜찮아!"라고 말하고 진심으로 그렇게 느끼는 타입이죠. 평화로운 분위기를 만들고, 다른 사람들이 편하게 자기 의견을 말할 수 있는 공간을 만들어줘요. 다만 때로는 자기 의견을 말하는 연습도 필요해요.',
    therapeuticQuestions: [
      'What do YOU want, separate from what others want for you or from you? Can you name even one thing?',
      'When did you last make a decision without seeking approval or reassurance? How did that feel?',
      'If asserting yourself didn\'t risk rejection or conflict (which it rarely does), what would you say or do differently?',
    ],
    therapeuticQuestionsKo: [
      '남들이 원하는 거 빼고, 내가 원하는 건 뭐예요?',
      '마지막으로 혼자 결정 내린 게 언제예요?',
      '거절당할 걱정 없다면, 뭐라고 말하고 싶어요?',
    ],
    growthRecommendations: [
      'Week 1: Make one small decision daily without asking for input - what to eat, wear, or watch. Notice the discomfort.',
      'Week 2-3: When someone asks "What do you want?", answer with YOUR preference first, before asking theirs.',
      'Month 1: Say "no" to one request that doesn\'t align with your needs or values. Observe that the relationship survives.',
      'Integration: Being accommodating is kind, but losing yourself isn\'t. Your preferences matter as much as anyone else\'s.',
    ],
    growthRecommendationsKo: [
      '이번 주: 매일 작은 거 하나는 혼자 결정해보기 (뭐 먹을지, 뭐 입을지)',
      '다음 주: "뭐 먹고 싶어?" 물으면 내 의견 먼저 말하기',
      '한 달 목표: 원치 않는 요청에 "아니"라고 말해보기',
      '핵심: 맞춰주는 건 좋지만, 나를 잃으면 안 돼요',
    ],
  },
  JK: {
    code: 'JK',
    emoji: '🤝',
    name: 'The Supporter',
    korean: '협력형',
    traits: ['Cooperative', 'Kind', 'Harmony-seeking', 'Considerate'],
    traitsKo: ['협력적', '친절함', '조화추구', '배려심'],
    shadow: '"싫어"라고 말하는 게 어려워서 번아웃될 수 있어요. 가끔은 거절도 필요해요.',
    shadowKo: '"싫어"라고 말하는 게 어려워서 번아웃될 수 있어요. 가끔은 거절도 필요해요.',
    dominance: -0.7,
    affiliation: 0.7,
    description: 'You\'re the friend everyone can count on. You care about others\' feelings and work hard to keep everyone happy.',
    descriptionKo: '당신은 모두가 믿고 의지하는 친구예요. 다른 사람 감정을 잘 읽고, 모두가 행복할 수 있도록 노력하죠. 싸움이나 갈등을 보면 중재하려고 하고, 따뜻한 분위기를 만드는 데 뛰어나요. 다만 자기 의견을 말하는 것도 중요하다는 걸 기억하세요.',
    therapeuticQuestions: [
      'What would happen if you openly disagreed with someone you care about? What\'s the worst-case scenario, and how likely is it really?',
      'How do you feel when you can\'t please everyone? Does that feeling drive your choices more than your actual values?',
      'What needs or desires of yours have you been postponing or ignoring to keep the peace?',
    ],
    therapeuticQuestionsKo: [
      '소중한 사람이랑 다른 의견을 말하면 어떻게 될까요? 최악의 경우는?',
      '모두를 만족시키지 못할 때 기분이 어때요?',
      '평화 유지하려고 미뤄둔 내 욕구가 있나요?',
    ],
    growthRecommendations: [
      'Week 1: Set one small boundary this week - say no to something you don\'t want to do. Notice the guilt and let it pass.',
      'Week 2-3: Express a different opinion in a low-stakes conversation. Practice: "I see it differently..." or "I prefer..."',
      'Month 1: Schedule one hour of self-care time weekly that\'s non-negotiable. Don\'t cancel it for others\' requests.',
      'Integration: True harmony includes your voice, not just agreement. Disagreement can deepen relationships, not destroy them.',
    ],
    growthRecommendationsKo: [
      '이번 주: 하기 싫은 거 하나 거절해보기',
      '다음 주: 가벼운 대화에서 "나는 다르게 생각해" 연습하기',
      '한 달 목표: 매주 1시간 나만의 시간 지키기',
      '핵심: 진짜 조화는 내 목소리도 포함해요',
    ],
  },
  LM: {
    code: 'LM',
    emoji: '💗',
    name: 'The Connector',
    korean: '친화형',
    traits: ['Warm', 'Sociable', 'Caring', 'Approachable'],
    traitsKo: ['따뜻함', '사교적', '돌봄', '친근함'],
    shadow: '다른 사람 감정을 너무 많이 흡수하면 지칠 수 있어요. 나를 위한 시간도 필요해요.',
    shadowKo: '다른 사람 감정을 너무 많이 흡수하면 지칠 수 있어요. 나를 위한 시간도 필요해요.',
    dominance: 0.0,
    affiliation: 1.0,
    description: 'You make everyone feel welcome. You\'re warm, friendly, and people naturally open up to you.',
    descriptionKo: '당신은 누구나 편하게 느끼게 만드는 타입이에요. 따뜻하고 친근해서 사람들이 자연스럽게 마음을 열죠. 새로운 사람도 금방 친해지고, 모임에서 분위기를 부드럽게 만드는 역할을 해요. 다만 다른 사람 문제를 너무 깊이 안고 가면 지칠 수 있으니 주의하세요.',
    therapeuticQuestions: [
      'Where does caring for others end and losing yourself begin? Can you identify the exact moment you cross that line?',
      'What do you need emotionally that you keep giving to others instead of receiving for yourself?',
      'How do you recharge when depleted? Do you actually do it, or do you tell yourself you should but then prioritize others?',
    ],
    therapeuticQuestionsKo: [
      '남 챙기다가 나를 잃는 순간, 어디서 선을 넘나요?',
      '남한테 주기만 하고 나는 못 받고 있는 게 뭔가요?',
      '지쳤을 때 정말 쉬나요, 아니면 또 남 먼저 챙기나요?',
    ],
    growthRecommendations: [
      'Week 1: Practice emotional detachment - when someone shares a problem, listen without immediately absorbing their emotion.',
      'Week 2-3: Let someone solve their own problem without offering help. Resist the urge to rescue. Trust their capability.',
      'Month 1: Take 30 minutes of alone time daily for recharge - non-negotiable. Notice when you feel guilty and challenge it.',
      'Integration: You can care deeply without carrying everything. Empathy doesn\'t require emotional fusion.',
    ],
    growthRecommendationsKo: [
      '이번 주: 상대 감정 흡수하지 않고 들어보기',
      '다음 주: 도와주고 싶어도 참고 지켜보기',
      '한 달 목표: 매일 30분 나만의 충전 시간 갖기',
      '핵심: 깊이 공감해도 다 짊어질 필요는 없어요',
    ],
  },
  NO: {
    code: 'NO',
    emoji: '🌻',
    name: 'The Mentor',
    korean: '멘토형',
    traits: ['Guiding', 'Encouraging', 'Protective', 'Generous'],
    traitsKo: ['지도', '격려', '보호', '관대함'],
    shadow: '도와주고 싶은 마음이 너무 강하면 오히려 상대방 자립을 방해할 수 있어요.',
    shadowKo: '도와주고 싶은 마음이 너무 강하면 오히려 상대방 자립을 방해할 수 있어요.',
    dominance: 0.7,
    affiliation: 0.7,
    description: 'You love helping others grow. You\'re the friend who gives great advice and cheers everyone on.',
    descriptionKo: '당신은 다른 사람이 성장하는 걸 돕는 데서 보람을 느껴요. 조언을 잘 해주고, 응원을 아끼지 않죠. 후배나 친구들이 어려울 때 찾아오는 든든한 선배 같은 존재예요. 사람들의 잠재력을 알아보고 끌어올려주는 재능이 있어요. 다만 조언을 너무 많이 하면 상대가 부담스러워할 수도 있으니 주의하세요.',
    therapeuticQuestions: [
      'Can you let someone fail and learn from their own experience, even when you could prevent it? What makes that difficult?',
      'What happens inside you when your advice isn\'t taken or someone rejects your help? What does that trigger?',
      'Who nurtures YOU? Do you allow yourself to receive care, or do you always need to be the strong one?',
    ],
    therapeuticQuestionsKo: [
      '막을 수 있어도 실패하게 둘 수 있나요? 뭐가 어렵나요?',
      '조언이 안 받아들여지면 기분이 어때요?',
      '누가 나를 돌봐주나요? 받는 것도 괜찮나요?',
    ],
    growthRecommendations: [
      'Week 1: Before giving advice, ask "Would you like my input on this?" and respect the answer, especially if it\'s no.',
      'Week 2-3: When you see someone struggling, wait. Let them ask for help rather than jumping in. Notice your discomfort.',
      'Month 1: Identify one area where you need support and actively ask someone for help. Practice receiving without deflecting.',
      'Integration: True nurturing empowers independence, not dependence. Let others find their own path, even through mistakes.',
    ],
    growthRecommendationsKo: [
      '이번 주: 조언 전에 "내 의견 들어볼래?" 물어보기',
      '다음 주: 어려워하는 사람 보면 바로 나서지 말고 기다려보기',
      '한 달 목표: 내가 도움이 필요한 분야에서 도움 요청해보기',
      '핵심: 진짜 성장은 스스로 해낼 때 와요',
    ],
  },
};

/**
 * ICP 점수 매핑
 *
 * 점수 체계 설명:
 * - A (1.0): 해당 축의 높은 쪽 극단 (지배적/친화적)
 * - B (0.5): 중간 입장 또는 상황에 따라 다름
 * - C (0.0): 해당 축의 낮은 쪽 극단 (복종적/적대적)
 *
 * 설계 근거:
 * - ICP 모델은 두 축(지배-복종, 친화-적대)에서의 위치를 측정
 * - B 선택지는 명확한 극단이 아닌 중간/상황적 응답을 나타냄
 * - 0.5는 수학적 중간값으로 축 점수에 중립적 영향
 *
 * 일관성 점수 관련:
 * - B 선택이 많으면 일관성 점수가 낮아짐
 * - 이는 결과가 부정확하다는 뜻이 아니라,
 *   응답자가 상황에 따라 다르게 행동함을 의미
 */
const SCORE_MAP: Record<string, number> = {
  A: 1.0,  // 높은 극단 (dominant/friendly)
  B: 0.5,  // 중간/상황적 (balanced/situational)
  C: 0.0,  // 낮은 극단 (submissive/hostile)
};

/**
 * Analyze ICP quiz answers
 */
export function analyzeICP(answers: ICPQuizAnswers, locale: string = 'en'): ICPAnalysis {
  const isKo = locale === 'ko';

  // Calculate axis scores
  let dominanceSum = 0;
  let dominanceCount = 0;
  let affiliationSum = 0;
  let affiliationCount = 0;

  for (const question of icpQuestions) {
    const answer = answers[question.id];
    if (!answer) {continue;}

    const score = SCORE_MAP[answer] ?? 0.5;

    if (question.axis === 'dominance') {
      dominanceSum += score;
      dominanceCount++;
    } else {
      affiliationSum += score;
      affiliationCount++;
    }
  }

  // Convert to 0-100 scale
  const dominanceScore = dominanceCount > 0 ? (dominanceSum / dominanceCount) * 100 : 50;
  const affiliationScore = affiliationCount > 0 ? (affiliationSum / affiliationCount) * 100 : 50;

  // Normalize to -1 to 1
  const dominanceNormalized = (dominanceScore - 50) / 50;
  const affiliationNormalized = (affiliationScore - 50) / 50;

  // Calculate octant scores based on distance
  // 표준 ICP 모델에서 최대 거리는 sqrt(2^2 + 2^2) = sqrt(8) ≈ 2.83
  // 더 넓은 점수 분포를 위해 가우시안 유사도 사용
  const octantScores: Record<ICPOctantCode, number> = {} as Record<ICPOctantCode, number>;

  for (const [code, octant] of Object.entries(ICP_OCTANTS) as [ICPOctantCode, ICPOctant][]) {
    // Calculate similarity based on axis alignment
    const domDiff = dominanceNormalized - octant.dominance;
    const affDiff = affiliationNormalized - octant.affiliation;
    const distanceSquared = domDiff * domDiff + affDiff * affDiff;

    // 가우시안 유사도: sigma=0.8로 설정하여 점수 분포 확대
    // 가까우면 1에 가깝고, 멀면 0에 가까움
    const sigma = 0.8;
    const similarity = Math.exp(-distanceSquared / (2 * sigma * sigma));
    octantScores[code] = similarity;
  }

  // Find primary and secondary styles
  const sortedOctants = (Object.entries(octantScores) as [ICPOctantCode, number][])
    .sort((a, b) => b[1] - a[1]);

  const primaryStyle = sortedOctants[0][0];
  const secondaryStyle = sortedOctants[1][1] > 0.3 ? sortedOctants[1][0] : null;

  const primaryOctant = ICP_OCTANTS[primaryStyle];
  const secondaryOctant = secondaryStyle ? ICP_OCTANTS[secondaryStyle] : null;

  // Calculate consistency (how clearly the profile emerges)
  // 1. 주요 스타일과 2위 스타일 간의 점수 차이가 클수록 일관성 높음
  // 2. 축 점수가 중앙(50)에서 멀수록 명확한 성향
  const primaryScore = sortedOctants[0][1];
  const secondaryScore = sortedOctants[1][1];
  const scoreDifferentiation = (primaryScore - secondaryScore) / primaryScore; // 0~1

  // 축 명확도: 50%에서 얼마나 벗어났는지 (0~50 범위를 0~1로 정규화)
  const dominanceClarity = Math.abs(dominanceScore - 50) / 50;
  const affiliationClarity = Math.abs(affiliationScore - 50) / 50;
  const axisClarity = (dominanceClarity + affiliationClarity) / 2;

  // 일관성 = 스타일 차별화(40%) + 축 명확도(60%)
  const consistencyRaw = scoreDifferentiation * 0.4 + axisClarity * 0.6;
  const consistencyScore = Math.round(Math.min(100, Math.max(30, consistencyRaw * 100 + 30)));

  // Generate summary
  const summary = isKo
    ? `당신의 대인관계 스타일은 ${primaryOctant.korean}입니다. ${primaryOctant.descriptionKo}`
    : `Your interpersonal style is ${primaryOctant.name}. ${primaryOctant.description}`;

  const summaryKo = `당신의 대인관계 스타일은 ${primaryOctant.korean}입니다. ${primaryOctant.descriptionKo}`;

  return {
    dominanceScore,
    affiliationScore,
    dominanceNormalized,
    affiliationNormalized,
    octantScores,
    primaryStyle,
    secondaryStyle,
    primaryOctant,
    secondaryOctant,
    summary,
    summaryKo,
    consistencyScore,
  };
}

/**
 * Get compatibility between two ICP styles
 */
export function getICPCompatibility(style1: ICPOctantCode, style2: ICPOctantCode, locale: string = 'en'): {
  score: number;
  level: string;
  levelKo: string;
  description: string;
  descriptionKo: string;
} {
  const octant1 = ICP_OCTANTS[style1];
  const octant2 = ICP_OCTANTS[style2];

  // Calculate complementarity
  const domDiff = Math.abs(octant1.dominance - octant2.dominance);
  const affSum = octant1.affiliation + octant2.affiliation;

  // Best compatibility: complementary dominance, both warm
  let score = 50;

  // Complementary dominance (one leads, one follows) is good
  if (domDiff > 1.0) {score += 20;}
  else if (domDiff > 0.5) {score += 10;}

  // Both being warm/friendly is good
  if (affSum > 1.0) {score += 20;}
  else if (affSum > 0) {score += 10;}
  else if (affSum < -1.0) {score -= 10;} // Both cold is harder

  // Same style: moderate (understand each other but may clash)
  if (style1 === style2) {score = 65;}

  score = Math.max(30, Math.min(95, score));

  let level: string;
  let levelKo: string;
  let description: string;
  let descriptionKo: string;

  if (score >= 80) {
    level = 'Excellent Match';
    levelKo = '탁월한 궁합';
    description = 'Your styles complement each other beautifully. Communication flows naturally.';
    descriptionKo = '두 스타일이 아름답게 보완됩니다. 소통이 자연스럽게 흐릅니다.';
  } else if (score >= 65) {
    level = 'Good Match';
    levelKo = '좋은 궁합';
    description = 'You understand each other well with some areas for growth.';
    descriptionKo = '서로를 잘 이해하며 성장할 영역이 있습니다.';
  } else if (score >= 50) {
    level = 'Moderate Match';
    levelKo = '보통 궁합';
    description = 'Different styles that can work with understanding and effort.';
    descriptionKo = '이해와 노력으로 작동할 수 있는 다른 스타일입니다.';
  } else {
    level = 'Challenging Match';
    levelKo = '도전적 궁합';
    description = 'Requires significant effort to bridge different approaches.';
    descriptionKo = '다른 접근 방식을 연결하기 위해 상당한 노력이 필요합니다.';
  }

  return { score, level, levelKo, description, descriptionKo };
}

/**
 * Get cross-system compatibility: ICP + Nova Persona combined analysis
 */
export function getCrossSystemCompatibility(
  icp1: ICPOctantCode,
  icp2: ICPOctantCode,
  _persona1Code: string,
  _persona2Code: string,
  persona1Axes: PersonaAxisData,
  persona2Axes: PersonaAxisData,
  locale: string = 'en'
): CrossSystemCompatibility {

  // Get individual compatibility scores
  const icpCompat = getICPCompatibility(icp1, icp2, locale);
  const icpScore = icpCompat.score;

  const octant1 = ICP_OCTANTS[icp1];
  const octant2 = ICP_OCTANTS[icp2];

  // Analyze cross-dimensional patterns
  let crossScore = 50;
  const insights: string[] = [];
  const insightsKo: string[] = [];

  // Pattern 1: High dominance (ICP) + High energy (Persona) = Powerful leader
  const isDominant1 = octant1.dominance > 0.5;
  const isDominant2 = octant2.dominance > 0.5;
  const isRadiant1 = persona1Axes.energy.pole === 'radiant';
  const isRadiant2 = persona2Axes.energy.pole === 'radiant';

  if ((isDominant1 && isRadiant1) && (isDominant2 && isRadiant2)) {
    crossScore += 10;
    insights.push('Both are energetic leaders - may compete for direction');
    insightsKo.push('둘 다 활력적인 리더 - 방향성 경쟁 가능');
  } else if ((isDominant1 && isRadiant1) || (isDominant2 && isRadiant2)) {
    crossScore += 5;
    insights.push('One natural leader energizes the partnership');
    insightsKo.push('한 명의 타고난 리더가 파트너십에 활력');
  }

  // Pattern 2: Warm/Friendly (ICP) + Empathic (Persona) = Deep connection
  const isWarm1 = octant1.affiliation > 0.5;
  const isWarm2 = octant2.affiliation > 0.5;
  const isEmpathic1 = persona1Axes.decision.pole === 'empathic';
  const isEmpathic2 = persona2Axes.decision.pole === 'empathic';

  if ((isWarm1 && isEmpathic1) && (isWarm2 && isEmpathic2)) {
    crossScore += 15;
    insights.push('Deep emotional attunement creates profound connection');
    insightsKo.push('깊은 감정적 조율로 심오한 연결 형성');
  } else if ((isWarm1 && isEmpathic1) || (isWarm2 && isEmpathic2)) {
    crossScore += 8;
    insights.push('One brings emotional warmth and understanding');
    insightsKo.push('한 명이 감정적 따뜻함과 이해 제공');
  }

  // Pattern 3: Cold/Distant (ICP) + Logic (Persona) = Analytical powerhouse
  const isCold1 = octant1.affiliation < -0.5;
  const isCold2 = octant2.affiliation < -0.5;
  const isLogic1 = persona1Axes.decision.pole === 'logic';
  const isLogic2 = persona2Axes.decision.pole === 'logic';

  if ((isCold1 && isLogic1) && (isCold2 && isLogic2)) {
    crossScore += 5;
    insights.push('Both analytical - may lack emotional warmth together');
    insightsKo.push('둘 다 분석적 - 함께 감정적 따뜻함 부족 가능');
  } else if ((isCold1 && isLogic1) || (isCold2 && isLogic2)) {
    crossScore += 10;
    insights.push('One provides objective clarity and rational perspective');
    insightsKo.push('한 명이 객관적 명료성과 합리적 관점 제공');
  }

  // Pattern 4: Submissive (ICP) + Grounded (Persona) = Supportive backbone
  const isSubmissive1 = octant1.dominance < -0.5;
  const isSubmissive2 = octant2.dominance < -0.5;
  const isGrounded1 = persona1Axes.energy.pole === 'grounded';
  const isGrounded2 = persona2Axes.energy.pole === 'grounded';

  if ((isSubmissive1 && isGrounded1) && (isSubmissive2 && isGrounded2)) {
    crossScore += 8;
    insights.push('Both prefer supporting roles - may need external leadership');
    insightsKo.push('둘 다 지원 역할 선호 - 외부 리더십 필요 가능');
  } else if (
    (isSubmissive1 && isGrounded1 && isDominant2 && isRadiant2) ||
    (isSubmissive2 && isGrounded2 && isDominant1 && isRadiant1)
  ) {
    crossScore += 15;
    insights.push('Perfect leader-supporter dynamic with clear roles');
    insightsKo.push('명확한 역할의 완벽한 리더-지원자 역학');
  }

  // Pattern 5: Visionary (Persona) + Dominant (ICP) = Change agent
  const isVisionary1 = persona1Axes.cognition.pole === 'visionary';
  const isVisionary2 = persona2Axes.cognition.pole === 'visionary';

  if ((isVisionary1 && isDominant1) || (isVisionary2 && isDominant2)) {
    crossScore += 10;
    insights.push('Visionary leadership drives innovation forward');
    insightsKo.push('비전적 리더십이 혁신을 앞으로 추진');
  }

  // Pattern 6: Structured (Persona) + Cooperative (ICP) = Reliable executor
  const isStructured1 = persona1Axes.cognition.pole === 'structured';
  const isStructured2 = persona2Axes.cognition.pole === 'structured';
  const isCooperative1 = Math.abs(octant1.dominance) < 0.3 && octant1.affiliation > 0.3;
  const isCooperative2 = Math.abs(octant2.dominance) < 0.3 && octant2.affiliation > 0.3;

  if ((isStructured1 && isCooperative1) && (isStructured2 && isCooperative2)) {
    crossScore += 12;
    insights.push('Both bring organized collaboration - highly reliable partnership');
    insightsKo.push('둘 다 조직화된 협력 - 매우 신뢰할 수 있는 파트너십');
  }

  // Pattern 7: Flow (Persona) + Warm (ICP) = Adaptive connector
  const isFlow1 = persona1Axes.rhythm.pole === 'flow';
  const isFlow2 = persona2Axes.rhythm.pole === 'flow';

  if ((isFlow1 && isWarm1) || (isFlow2 && isWarm2)) {
    crossScore += 8;
    insights.push('Flexible warmth creates welcoming, adaptive environment');
    insightsKo.push('유연한 따뜻함이 환영적이고 적응적인 환경 조성');
  }

  // Pattern 8: Anchor (Persona) + Dominant (ICP) = Structured authority
  const isAnchor1 = persona1Axes.rhythm.pole === 'anchor';
  const isAnchor2 = persona2Axes.rhythm.pole === 'anchor';

  if ((isAnchor1 && isDominant1) || (isAnchor2 && isDominant2)) {
    crossScore += 10;
    insights.push('Disciplined leadership establishes clear systems');
    insightsKo.push('훈련된 리더십이 명확한 시스템 확립');
  }

  // Complementary check: Do they cover different strengths?
  const complementaryCount =
    (isDominant1 !== isDominant2 ? 1 : 0) +
    (isWarm1 !== isWarm2 ? 1 : 0) +
    (isVisionary1 !== isVisionary2 ? 1 : 0) +
    (isEmpathic1 !== isEmpathic2 ? 1 : 0);

  if (complementaryCount >= 3) {
    crossScore += 10;
    insights.push('Highly complementary across multiple dimensions');
    insightsKo.push('여러 차원에서 매우 상호보완적');
  }

  // Weight the cross score with ICP score
  const finalScore = Math.round(crossScore * 0.6 + icpScore * 0.4);
  const score = Math.max(30, Math.min(95, finalScore));

  let level: string;
  let levelKo: string;
  let description: string;
  let descriptionKo: string;

  if (score >= 80) {
    level = 'Exceptional Synergy';
    levelKo = '탁월한 시너지';
    description = 'Your interpersonal style and personality create extraordinary synergy across all dimensions.';
    descriptionKo = '대인관계 스타일과 성격이 모든 차원에서 특별한 시너지를 만듭니다.';
  } else if (score >= 65) {
    level = 'Strong Compatibility';
    levelKo = '강한 적합성';
    description = 'Your combined profiles complement each other well, creating a balanced partnership.';
    descriptionKo = '결합된 프로필이 서로를 잘 보완하여 균형잡힌 파트너십을 만듭니다.';
  } else if (score >= 50) {
    level = 'Moderate Fit';
    levelKo = '중간 적합성';
    description = 'Your profiles can work together with mutual awareness and adjustment.';
    descriptionKo = '상호 인식과 조정으로 함께 작동할 수 있습니다.';
  } else {
    level = 'Growth Opportunity';
    levelKo = '성장 기회';
    description = 'Your different approaches offer opportunities for learning and expansion.';
    descriptionKo = '다른 접근 방식이 학습과 확장의 기회를 제공합니다.';
  }

  return {
    score,
    level,
    levelKo,
    description,
    descriptionKo,
    insights,
    insightsKo,
  };
}
