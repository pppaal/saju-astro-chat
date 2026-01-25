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
    name: 'Dominant-Assured',
    korean: '지배적-확신형',
    traits: ['Leadership', 'Confidence', 'Decisive', 'Assertive'],
    traitsKo: ['리더십', '자신감', '결단력', '주장적'],
    shadow: 'Can be controlling and domineering. Under pressure, may override others\' input and become dictatorial, making team members feel unheard or resentful. The need for control can prevent delegation and create bottlenecks.',
    shadowKo: '통제적이고 독선적일 수 있습니다. 압박 상황에서 다른 사람의 의견을 무시하고 독재적으로 변할 수 있어 팀원들이 무시당하거나 분개하게 만들 수 있습니다. 통제에 대한 욕구가 위임을 방해하고 병목현상을 만들 수 있습니다.',
    dominance: 1.0,
    affiliation: 0.5,
    description: 'You are a natural leader who takes charge with confidence and decisiveness. You inspire others through your clear vision and ability to guide groups toward goals. Your assertiveness helps you navigate complex situations and make tough calls when needed. People often look to you for direction, and you\'re comfortable shouldering that responsibility. In relationships, you bring warmth and care, but always with a sense of being the one who shapes the direction. You value efficiency and results, and you\'re not afraid to push for what you believe is right.',
    descriptionKo: '당신은 자신감과 결단력을 가지고 주도하는 타고난 리더입니다. 명확한 비전과 그룹을 목표로 이끄는 능력으로 다른 사람들에게 영감을 줍니다. 주장력이 있어 복잡한 상황을 헤쳐 나가고 필요할 때 어려운 결정을 내릴 수 있습니다. 사람들은 종종 당신에게 방향을 구하며, 당신은 그 책임을 지는 것이 편안합니다. 관계에서 따뜻함과 배려를 가져오지만 항상 방향을 정하는 사람이라는 감각이 있습니다. 효율성과 결과를 중시하며, 옳다고 믿는 것을 위해 밀어붙이는 것을 두려워하지 않습니다.',
    therapeuticQuestions: [
      'When you delegate, do you find yourself monitoring closely or truly stepping back? What does this reveal about your comfort with others\' methods?',
      'Recall a time when someone else\'s idea worked better than yours. How did that feel, and what did you learn?',
      'If you weren\'t the one in charge, what would you miss most? What might you gain?',
    ],
    therapeuticQuestionsKo: [
      '위임할 때 면밀히 감시하는 자신을 발견하나요, 아니면 진정으로 물러나나요? 이것이 다른 사람의 방식에 대한 당신의 편안함에 대해 무엇을 드러내나요?',
      '다른 사람의 아이디어가 당신의 것보다 더 잘 작동했던 때를 떠올려보세요. 어떤 기분이었고, 무엇을 배웠나요?',
      '당신이 책임자가 아니라면 무엇이 가장 그리울까요? 무엇을 얻을 수 있을까요?',
    ],
    growthRecommendations: [
      'Week 1: In one meeting, ask 3 open-ended questions before sharing your view. Notice what insights emerge.',
      'Week 2-3: Follow up on someone else\'s idea instead of proposing yours. Actively support their vision.',
      'Month 1: Delegate a high-visibility project and resist checking in for 2 weeks. Trust the process.',
      'Integration: Reflect on how good outcomes can happen through others\' ideas and methods, not just your own.',
    ],
    growthRecommendationsKo: [
      '1주차: 한 번의 회의에서 의견을 말하기 전에 3개의 개방형 질문을 하세요. 어떤 통찰이 나오는지 관찰하세요.',
      '2-3주차: 자신의 아이디어를 제안하는 대신 다른 사람의 아이디어를 발전시키세요. 그들의 비전을 적극 지지하세요.',
      '1개월차: 중요한 프로젝트를 위임하고 2주 동안 확인하지 않으세요. 과정을 신뢰하세요.',
      '통합: 좋은 결과가 당신의 아이디어와 방법뿐만 아니라 다른 사람의 것을 통해서도 나올 수 있다는 것을 성찰하세요.',
    ],
  },
  BC: {
    code: 'BC',
    emoji: '🏆',
    name: 'Competitive-Arrogant',
    korean: '경쟁적-거만형',
    traits: ['Ambitious', 'Competitive', 'Achievement-oriented', 'Independent'],
    traitsKo: ['야심찬', '경쟁적', '성취지향적', '독립적'],
    shadow: 'Can be dismissive, cynical, and combative. May devalue others\' contributions to maintain superiority. Under stress, becomes more hostile and skeptical, alienating potential allies. The drive to win can override ethical considerations and damage relationships.',
    shadowKo: '무시하고 냉소적이며 호전적일 수 있습니다. 우월성을 유지하기 위해 다른 사람의 기여를 평가절하할 수 있습니다. 스트레스를 받으면 더 적대적이고 회의적이 되어 잠재적 동맹을 소외시킵니다. 승리에 대한 욕구가 윤리적 고려를 무시하고 관계를 손상시킬 수 있습니다.',
    dominance: 0.7,
    affiliation: -0.7,
    description: 'You are driven by achievement, excellence, and the thrill of competition. Your ambitious nature pushes you to constantly improve and reach higher standards. You value independence and self-reliance, preferring to prove yourself through results rather than relationships. While you may come across as aloof or cold, you respect competence and directness in others. You thrive in challenging environments where performance matters and see obstacles as opportunities to demonstrate your capabilities.',
    descriptionKo: '당신은 성취, 탁월함, 그리고 경쟁의 스릴에 의해 움직입니다. 야심찬 성격이 끊임없이 발전하고 더 높은 기준에 도달하도록 밀어붙입니다. 독립성과 자립을 중시하며 관계보다는 결과를 통해 자신을 증명하는 것을 선호합니다. 냉담하거나 차갑게 보일 수 있지만 다른 사람의 능력과 직설성을 존중합니다. 성과가 중요한 도전적인 환경에서 번창하고 장애물을 자신의 능력을 입증할 기회로 봅니다.',
    therapeuticQuestions: [
      'What would success look like if it wasn\'t measured by rankings or comparisons? What intrinsic goals matter to you?',
      'When did you last genuinely celebrate someone else\'s achievement without comparison to your own? How did that feel?',
      'What vulnerability or weakness are you avoiding by staying in constant competition mode?',
    ],
    therapeuticQuestionsKo: [
      '순위나 비교로 측정되지 않는다면 성공은 어떤 모습일까요? 당신에게 중요한 본질적 목표는 무엇인가요?',
      '마지막으로 자신과 비교하지 않고 진심으로 다른 사람의 성취를 축하한 적이 언제인가요? 어떤 기분이었나요?',
      '끊임없는 경쟁 모드에 머물러 어떤 취약성이나 약점을 피하고 있나요?',
    ],
    growthRecommendations: [
      'Week 1: Notice when you compare yourself to others. Pause and redirect to your own progress instead.',
      'Week 2-3: In one collaboration, genuinely praise someone else\'s idea. Let it be their win, not yours.',
      'Month 1: Ask someone for help with something you don\'t excel at. Notice how it feels to be vulnerable.',
      'Integration: Explore what "enough" looks like - when is achievement fulfilling without the need to surpass others?',
    ],
    growthRecommendationsKo: [
      '1주차: 자신을 다른 사람과 비교할 때를 인식하세요. 멈추고 대신 자신의 진전으로 방향을 전환하세요.',
      '2-3주차: 한 협력에서 진심으로 다른 사람의 아이디어를 칭찬하세요. 그것을 그들의 승리로 두고, 당신의 것이 되지 않게 하세요.',
      '1개월차: 당신이 뛰어나지 않은 것에 대해 누군가에게 도움을 요청하세요. 취약해지는 것이 어떤 느낌인지 관찰하세요.',
      '통합: "충분함"이 무엇인지 탐구하세요 - 언제 성취가 다른 사람을 능가할 필요 없이 만족스러운가요?',
    ],
  },
  DE: {
    code: 'DE',
    emoji: '🧊',
    name: 'Cold-Distant',
    korean: '냉담-거리형',
    traits: ['Analytical', 'Objective', 'Independent', 'Reserved'],
    traitsKo: ['분석적', '객관적', '독립적', '내성적'],
    shadow: 'Can be isolated, disconnected, and emotionally unavailable. May use intellectual detachment to avoid intimacy and vulnerability. Under stress, withdraws further and becomes more critical, making others feel rejected or dismissed. The preference for solitude can lead to loneliness and missed opportunities for meaningful connection.',
    shadowKo: '고립되고 단절되며 감정적으로 이용할 수 없게 될 수 있습니다. 친밀감과 취약성을 피하기 위해 지적 분리를 사용할 수 있습니다. 스트레스를 받으면 더욱 물러나고 비판적이 되어 다른 사람들이 거부당하거나 무시당하는 느낌을 받게 합니다. 고독에 대한 선호가 외로움과 의미 있는 연결의 기회를 놓치게 만들 수 있습니다.',
    dominance: 0.0,
    affiliation: -1.0,
    description: 'You value logic, objectivity, and independence above emotional connection. You prefer to observe and analyze before engaging, which gives you unique insights and clarity that others miss. Your analytical nature allows you to see situations without the distortion of emotional bias. You need significant personal space and find most social interactions draining rather than energizing. While others may perceive you as cold or aloof, you simply prioritize rational thinking and self-sufficiency over social bonding. You\'re comfortable with solitude and often do your best thinking alone.',
    descriptionKo: '당신은 감정적 연결보다 논리, 객관성, 독립성을 중요시합니다. 참여하기 전에 관찰하고 분석하는 것을 선호하여 다른 사람들이 놓치는 독특한 통찰력과 명확성을 얻습니다. 분석적 성격이 감정적 편견의 왜곡 없이 상황을 볼 수 있게 합니다. 상당한 개인 공간이 필요하며 대부분의 사회적 상호작용이 활력을 주기보다는 소진시킨다고 느낍니다. 다른 사람들은 당신을 차갑거나 냉담하다고 인식할 수 있지만, 당신은 단순히 사회적 유대보다 합리적 사고와 자급자족을 우선시합니다. 고독함이 편안하며 종종 혼자 있을 때 최고의 사고를 합니다.',
    therapeuticQuestions: [
      'What would it feel like to let someone see your uncertainty or confusion, not just your analytical conclusions?',
      'Recall a moment when you felt truly connected to another person. What made that safe enough to allow?',
      'What might you be missing by staying in observer mode rather than participant mode in relationships?',
    ],
    therapeuticQuestionsKo: [
      '누군가에게 분석적 결론이 아니라 당신의 불확실성이나 혼란을 보여준다면 어떤 느낌일까요?',
      '다른 사람과 진정으로 연결되었다고 느꼈던 순간을 떠올려보세요. 무엇이 그것을 허용할 만큼 안전하게 만들었나요?',
      '관계에서 참여자 모드가 아니라 관찰자 모드에 머물러 있음으로써 무엇을 놓치고 있을까요?',
    ],
    growthRecommendations: [
      'Week 1: Schedule one social activity. Before declining, notice your automatic "no" and choose to attend anyway.',
      'Week 2-3: Share one feeling (not just a thought) with someone daily. Start with "I felt..." not "I think..."',
      'Month 1: Initiate a conversation about something personal, not just intellectual topics. Ask "How are you feeling?" and listen.',
      'Integration: Recognize that connection doesn\'t require losing your independence - you can be close AND autonomous.',
    ],
    growthRecommendationsKo: [
      '1주차: 하나의 사회 활동을 계획하세요. 거절하기 전에 자동적인 "거절"을 인식하고 어쨌든 참석하기로 선택하세요.',
      '2-3주차: 매일 누군가와 하나의 감정(생각이 아니라)을 공유하세요. "나는 생각한다..."가 아니라 "나는 느꼈다..."로 시작하세요.',
      '1개월차: 지적인 주제가 아니라 개인적인 것에 대한 대화를 시작하세요. "어떻게 느끼세요?"라고 묻고 경청하세요.',
      '통합: 연결이 독립성을 잃는 것을 요구하지 않는다는 것을 인식하세요 - 가까우면서도 자율적일 수 있습니다.',
    ],
  },
  FG: {
    code: 'FG',
    emoji: '🌙',
    name: 'Submissive-Introverted',
    korean: '복종적-내향형',
    traits: ['Humble', 'Cautious', 'Observant', 'Quiet'],
    traitsKo: ['겸손한', '신중한', '관찰력 있는', '조용한'],
    shadow: 'Can be self-deprecating, withdrawn, and invisible. May downplay achievements and avoid recognition, reinforcing a sense of unworthiness. Under stress, becomes more self-critical and isolated, potentially leading to depression or anxiety. The reluctance to assert needs can result in resentment and feeling perpetually overlooked.',
    shadowKo: '자기비하적이고 위축되며 보이지 않게 될 수 있습니다. 성취를 축소하고 인정을 피하여 무가치함을 강화할 수 있습니다. 스트레스를 받으면 더욱 자기비판적이고 고립되어 우울증이나 불안으로 이어질 수 있습니다. 필요를 주장하기를 꺼리는 것이 분노와 영구적으로 간과당하는 느낌을 초래할 수 있습니다.',
    dominance: -0.7,
    affiliation: -0.7,
    description: 'You are thoughtful, observant, and genuinely humble, preferring to understand situations fully before acting or speaking. Your cautious nature helps you avoid mistakes, and your quiet presence allows you to notice details others miss. You don\'t seek the spotlight and are content supporting others from behind the scenes. While you may struggle with self-doubt, your humility is an asset that makes you approachable and trustworthy. You value depth over breadth in relationships and prefer one-on-one conversations to group settings. Your introspective nature gives you rich inner life and genuine empathy for others\' struggles.',
    descriptionKo: '당신은 사려 깊고 관찰력 있으며 진정으로 겸손하며, 행동하거나 말하기 전에 상황을 완전히 이해하는 것을 선호합니다. 신중한 성격이 실수를 피하는 데 도움이 되고, 조용한 존재감이 다른 사람들이 놓치는 세부 사항을 알아차릴 수 있게 합니다. 주목받기를 원하지 않으며 무대 뒤에서 다른 사람을 지원하는 것에 만족합니다. 자기 의심으로 어려움을 겪을 수 있지만, 겸손함은 당신을 친근하고 신뢰할 수 있게 만드는 자산입니다. 관계에서 넓이보다 깊이를 중시하며 그룹 환경보다 일대일 대화를 선호합니다. 내성적 성격이 풍부한 내면의 삶과 다른 사람의 어려움에 대한 진정한 공감을 줍니다.',
    therapeuticQuestions: [
      'If you gave yourself the same compassion you give others, what would change in how you see yourself?',
      'What evidence contradicts the belief that you\'re not good enough? Can you list three examples?',
      'Imagine someone you respect saying your self-critical thoughts out loud to you. How would that feel? Would you accept it?',
    ],
    therapeuticQuestionsKo: [
      '다른 사람에게 주는 것과 같은 연민을 자신에게 준다면, 자신을 보는 방식에서 무엇이 바뀔까요?',
      '당신이 충분하지 않다는 믿음에 반하는 증거는 무엇인가요? 세 가지 예를 들 수 있나요?',
      '당신이 존경하는 누군가가 당신의 자기비판적 생각을 크게 말한다고 상상해보세요. 어떤 느낌일까요? 받아들일 수 있나요?',
    ],
    growthRecommendations: [
      'Week 1: Each day, write down one thing you did well - no matter how small. Read the list weekly.',
      'Week 2-3: When someone compliments you, say "Thank you" without deflecting or minimizing. Notice the urge to dismiss it.',
      'Month 1: Voice one opinion in a meeting or conversation each week. Start with "I think..." or "My perspective is..."',
      'Integration: Your humility is valuable, but it shouldn\'t mean invisibility. You can be both humble AND visible.',
    ],
    growthRecommendationsKo: [
      '1주차: 매일 잘한 일 하나를 기록하세요 - 아무리 작아도. 매주 목록을 읽으세요.',
      '2-3주차: 누군가 칭찬할 때 회피하거나 축소하지 않고 "감사합니다"라고 말하세요. 거부하려는 충동을 관찰하세요.',
      '1개월차: 매주 회의나 대화에서 하나의 의견을 말하세요. "제 생각은..." 또는 "제 관점은..."으로 시작하세요.',
      '통합: 겸손함은 가치 있지만 보이지 않음을 의미해서는 안 됩니다. 겸손하면서도 눈에 띌 수 있습니다.',
    ],
  },
  HI: {
    code: 'HI',
    emoji: '🕊️',
    name: 'Submissive-Unassured',
    korean: '복종적-불확신형',
    traits: ['Accommodating', 'Dependent', 'Receptive', 'Gentle'],
    traitsKo: ['수용적', '의존적', '받아들이는', '온화한'],
    shadow: 'Can be passive, indecisive, and overly dependent on others\' approval. May defer all decisions to others, avoiding responsibility and agency. Under stress, becomes paralyzed by uncertainty and seeks constant reassurance, which can exhaust relationships. The lack of self-advocacy can lead to being taken advantage of or feeling perpetually helpless.',
    shadowKo: '수동적이고 우유부단하며 다른 사람의 승인에 지나치게 의존할 수 있습니다. 모든 결정을 다른 사람에게 미루어 책임과 주도권을 피할 수 있습니다. 스트레스를 받으면 불확실성에 마비되어 끊임없는 안심을 구하며 이는 관계를 지치게 할 수 있습니다. 자기 옹호의 부족이 이용당하거나 영구적으로 무력감을 느끼게 만들 수 있습니다.',
    dominance: -1.0,
    affiliation: 0.0,
    description: 'You are accommodating, gentle, and deeply receptive to others\' needs and perspectives. Your willingness to go with the flow makes you easy to be around, and people appreciate your non-judgmental acceptance. You prefer harmony over conflict and will often yield to keep the peace, which can be a gift in tense situations. While you may struggle with making decisions independently or asserting your preferences, your receptive nature allows you to truly listen and adapt. You value relationships where you feel guided and supported, and you\'re comfortable letting others take the lead. Your gentle presence creates space for others to shine.',
    descriptionKo: '당신은 수용적이고 온화하며 다른 사람의 필요와 관점에 깊이 받아들입니다. 흐름을 따르려는 의지가 당신을 함께 있기 편한 사람으로 만들며, 사람들은 당신의 비판단적 수용을 높이 평가합니다. 갈등보다 조화를 선호하며 평화를 유지하기 위해 종종 양보하는데, 이는 긴장된 상황에서 선물이 될 수 있습니다. 독립적으로 결정을 내리거나 선호를 주장하는 데 어려움을 겪을 수 있지만, 수용적 성격이 진정으로 듣고 적응할 수 있게 합니다. 지도받고 지원받는다고 느끼는 관계를 중시하며, 다른 사람이 주도하게 하는 것이 편안합니다. 온화한 존재감이 다른 사람이 빛날 공간을 만듭니다.',
    therapeuticQuestions: [
      'What do YOU want, separate from what others want for you or from you? Can you name even one thing?',
      'When did you last make a decision without seeking approval or reassurance? How did that feel?',
      'If asserting yourself didn\'t risk rejection or conflict (which it rarely does), what would you say or do differently?',
    ],
    therapeuticQuestionsKo: [
      '다른 사람이 당신을 위해 또는 당신에게서 원하는 것과 별개로 당신이 원하는 것은 무엇인가요? 한 가지라도 말할 수 있나요?',
      '마지막으로 승인이나 안심을 구하지 않고 결정을 내린 적이 언제인가요? 어떤 느낌이었나요?',
      '자신을 주장하는 것이 거부나 갈등의 위험이 없다면 (실제로 거의 그렇지 않음), 무엇을 다르게 말하거나 하겠습니까?',
    ],
    growthRecommendations: [
      'Week 1: Make one small decision daily without asking for input - what to eat, wear, or watch. Notice the discomfort.',
      'Week 2-3: When someone asks "What do you want?", answer with YOUR preference first, before asking theirs.',
      'Month 1: Say "no" to one request that doesn\'t align with your needs or values. Observe that the relationship survives.',
      'Integration: Being accommodating is kind, but losing yourself isn\'t. Your preferences matter as much as anyone else\'s.',
    ],
    growthRecommendationsKo: [
      '1주차: 매일 하나의 작은 결정을 입력을 구하지 않고 하세요 - 무엇을 먹을지, 입을지, 볼지. 불편함을 관찰하세요.',
      '2-3주차: 누군가 "무엇을 원하세요?"라고 물으면 그들의 것을 묻기 전에 먼저 당신의 선호로 대답하세요.',
      '1개월차: 당신의 필요나 가치와 맞지 않는 하나의 요청에 "아니오"라고 말하세요. 관계가 살아남는 것을 관찰하세요.',
      '통합: 수용적인 것은 친절하지만 자신을 잃는 것은 아닙니다. 당신의 선호는 다른 사람만큼 중요합니다.',
    ],
  },
  JK: {
    code: 'JK',
    emoji: '🤝',
    name: 'Agreeable-Docile',
    korean: '동조적-순응형',
    traits: ['Agreeable', 'Kind', 'Harmony-seeking', 'Considerate'],
    traitsKo: ['동조적', '친절한', '조화추구', '배려하는'],
    shadow: 'Can be self-sacrificing, boundary-less, and unable to tolerate conflict. May say yes when meaning no, leading to resentment and burnout. Under stress, becomes more people-pleasing and loses sense of self, merging completely with others\' needs. The avoidance of disagreement can enable unhealthy dynamics and prevent authentic connection.',
    shadowKo: '자기희생적이고 경계가 없으며 갈등을 견디지 못할 수 있습니다. 아니오를 의미할 때 예라고 말하여 분노와 소진으로 이어질 수 있습니다. 스트레스를 받으면 더욱 사람을 기쁘게 하려 하고 자아감각을 잃으며 다른 사람의 필요와 완전히 합쳐집니다. 불일치를 피하는 것이 건강하지 않은 역학을 가능하게 하고 진정한 연결을 방해할 수 있습니다.',
    dominance: -0.7,
    affiliation: 0.7,
    description: 'You are naturally cooperative, kind, and deeply committed to maintaining harmony in all your relationships. Your considerate nature makes you attuned to others\' feelings, and you excel at creating warm, collaborative environments where people feel valued. You genuinely care about others\' well-being and will go out of your way to help or support them. While you may struggle with setting boundaries or expressing disagreement, your agreeableness is a gift that builds trust and goodwill. You prefer consensus over conflict and will often mediate or smooth over tensions. Your kindness and willingness to compromise make you a beloved friend and valued team member.',
    descriptionKo: '당신은 자연스럽게 협력적이고 친절하며 모든 관계에서 조화를 유지하는 데 깊이 헌신합니다. 배려하는 성격이 다른 사람의 감정에 조율되게 하며, 사람들이 가치 있다고 느끼는 따뜻하고 협력적인 환경을 만드는 데 뛰어납니다. 다른 사람의 안녕을 진심으로 돌보며 그들을 돕거나 지원하기 위해 애씁니다. 경계를 설정하거나 불일치를 표현하는 데 어려움을 겪을 수 있지만, 동조성은 신뢰와 호의를 구축하는 선물입니다. 갈등보다 합의를 선호하며 종종 긴장을 중재하거나 완화합니다. 친절함과 타협 의지가 당신을 사랑받는 친구이자 소중한 팀원으로 만듭니다.',
    therapeuticQuestions: [
      'What would happen if you openly disagreed with someone you care about? What\'s the worst-case scenario, and how likely is it really?',
      'How do you feel when you can\'t please everyone? Does that feeling drive your choices more than your actual values?',
      'What needs or desires of yours have you been postponing or ignoring to keep the peace?',
    ],
    therapeuticQuestionsKo: [
      '당신이 소중히 여기는 누군가와 공개적으로 의견이 다르면 어떤 일이 일어날까요? 최악의 시나리오는 무엇이며, 실제로 얼마나 가능성이 있나요?',
      '모든 사람을 만족시킬 수 없을 때 어떤 기분이 드나요? 그 감정이 실제 가치보다 선택을 더 많이 주도하나요?',
      '평화를 유지하기 위해 연기하거나 무시해 온 필요나 욕구는 무엇인가요?',
    ],
    growthRecommendations: [
      'Week 1: Set one small boundary this week - say no to something you don\'t want to do. Notice the guilt and let it pass.',
      'Week 2-3: Express a different opinion in a low-stakes conversation. Practice: "I see it differently..." or "I prefer..."',
      'Month 1: Schedule one hour of self-care time weekly that\'s non-negotiable. Don\'t cancel it for others\' requests.',
      'Integration: True harmony includes your voice, not just agreement. Disagreement can deepen relationships, not destroy them.',
    ],
    growthRecommendationsKo: [
      '1주차: 이번 주 하나의 작은 경계를 설정하세요 - 하고 싶지 않은 것에 거절하세요. 죄책감을 인식하고 지나가게 하세요.',
      '2-3주차: 부담이 적은 대화에서 다른 의견을 표현하세요. 연습: "저는 다르게 봅니다..." 또는 "저는 선호합니다..."',
      '1개월차: 주간 1시간의 협상 불가능한 자기 돌봄 시간을 계획하세요. 다른 사람의 요청 때문에 취소하지 마세요.',
      '통합: 진정한 조화는 단순한 동의가 아니라 당신의 목소리를 포함합니다. 불일치는 관계를 파괴하는 것이 아니라 깊게 할 수 있습니다.',
    ],
  },
  LM: {
    code: 'LM',
    emoji: '💗',
    name: 'Warm-Friendly',
    korean: '따뜻-친화형',
    traits: ['Empathetic', 'Sociable', 'Nurturing', 'Approachable'],
    traitsKo: ['공감적', '사교적', '돌보는', '친근한'],
    shadow: 'Can be over-involved, enabling, and emotionally porous. May absorb others\' feelings to the point of losing your own emotional center. Under stress, becomes more enmeshed in others\' problems and neglects self-care, leading to compassion fatigue. The desire to help everyone can prevent others from developing their own resilience and create unhealthy dependency.',
    shadowKo: '과잉관여하고 의존을 유발하며 감정적으로 다공성일 수 있습니다. 자신의 감정 중심을 잃을 정도로 다른 사람의 감정을 흡수할 수 있습니다. 스트레스를 받으면 다른 사람의 문제에 더욱 얽히고 자기 돌봄을 소홀히 하여 공감 피로로 이어집니다. 모든 사람을 돕고자 하는 욕구가 다른 사람이 자신의 회복력을 발전시키는 것을 방해하고 건강하지 않은 의존을 만들 수 있습니다.',
    dominance: 0.0,
    affiliation: 1.0,
    description: 'You naturally connect with others through genuine warmth, empathy, and approachability. Your friendly nature makes people feel immediately comfortable and welcomed in your presence. You have a gift for creating safe spaces where others can be themselves, and your nurturing instinct helps people feel seen and cared for. Your sociability and emotional openness draw others to you, and you thrive in relationships built on mutual trust and affection. While you may sometimes take on too much of others\' emotional burdens, your empathetic nature is a profound strength that builds deep, lasting connections. You genuinely enjoy being around people and find fulfillment in making others feel valued.',
    descriptionKo: '당신은 진정한 따뜻함, 공감, 친근함을 통해 다른 사람들과 자연스럽게 연결됩니다. 친화적 성격이 사람들이 당신의 존재에서 즉시 편안하고 환영받는다고 느끼게 합니다. 다른 사람이 자신답게 있을 수 있는 안전한 공간을 만드는 재능이 있으며, 양육 본능이 사람들이 보이고 돌봄받는다고 느끼게 돕습니다. 사교성과 감정적 개방성이 다른 사람을 끌어당기며, 상호 신뢰와 애정으로 구축된 관계에서 번창합니다. 때로는 다른 사람의 감정적 부담을 너무 많이 떠안을 수 있지만, 공감적 성격은 깊고 지속적인 연결을 구축하는 심오한 강점입니다. 진정으로 사람들과 함께 있는 것을 즐기며 다른 사람이 가치 있다고 느끼게 하는 데서 성취감을 찾습니다.',
    therapeuticQuestions: [
      'Where does caring for others end and losing yourself begin? Can you identify the exact moment you cross that line?',
      'What do you need emotionally that you keep giving to others instead of receiving for yourself?',
      'How do you recharge when depleted? Do you actually do it, or do you tell yourself you should but then prioritize others?',
    ],
    therapeuticQuestionsKo: [
      '다른 사람을 돌보는 것이 끝나고 자신을 잃기 시작하는 지점은 어디인가요? 그 선을 넘는 정확한 순간을 파악할 수 있나요?',
      '다른 사람에게 계속 주면서 자신이 받는 대신 감정적으로 필요한 것은 무엇인가요?',
      '지쳤을 때 어떻게 충전하나요? 실제로 하나요, 아니면 해야 한다고 자신에게 말하지만 다른 사람을 우선시하나요?',
    ],
    growthRecommendations: [
      'Week 1: Practice emotional detachment - when someone shares a problem, listen without immediately absorbing their emotion.',
      'Week 2-3: Let someone solve their own problem without offering help. Resist the urge to rescue. Trust their capability.',
      'Month 1: Take 30 minutes of alone time daily for recharge - non-negotiable. Notice when you feel guilty and challenge it.',
      'Integration: You can care deeply without carrying everything. Empathy doesn\'t require emotional fusion.',
    ],
    growthRecommendationsKo: [
      '1주차: 감정적 거리두기를 연습하세요 - 누군가 문제를 공유할 때 즉시 그들의 감정을 흡수하지 않고 경청하세요.',
      '2-3주차: 누군가 자신의 문제를 도움 없이 해결하게 두세요. 구조하려는 충동을 저항하세요. 그들의 능력을 신뢰하세요.',
      '1개월차: 충전을 위해 매일 30분의 혼자만의 시간을 가지세요 - 협상 불가능. 죄책감을 느낄 때 인식하고 도전하세요.',
      '통합: 모든 것을 짊어지지 않고도 깊이 돌볼 수 있습니다. 공감은 감정적 융합을 요구하지 않습니다.',
    ],
  },
  NO: {
    code: 'NO',
    emoji: '🌻',
    name: 'Nurturant-Extroverted',
    korean: '양육적-외향형',
    traits: ['Guiding', 'Protective', 'Encouraging', 'Generous'],
    traitsKo: ['지도하는', '보호적', '격려하는', '관대한'],
    shadow: 'Can be interfering, overprotective, and controlling under the guise of care. May give unsolicited advice and struggle when guidance is rejected. Under stress, becomes more intrusive and may infantilize others, preventing their autonomy. The need to be needed can create dependency rather than empowerment, and may feel threatened when others don\'t require help.',
    shadowKo: '간섭하고 과보호하며 돌봄의 가면 아래 통제적일 수 있습니다. 요청하지 않은 조언을 주고 지도가 거부될 때 어려움을 겪을 수 있습니다. 스트레스를 받으면 더욱 침입적이 되고 다른 사람을 유아화하여 자율성을 방해할 수 있습니다. 필요로 받고자 하는 욕구가 임파워먼트가 아니라 의존을 만들 수 있으며, 다른 사람이 도움을 필요로 하지 않을 때 위협을 느낄 수 있습니다.',
    dominance: 0.7,
    affiliation: 0.7,
    description: 'You combine genuine warmth with natural leadership, creating a nurturing presence that guides and uplifts others. You excel in mentor roles where you can share wisdom while providing emotional support. Your generous spirit and protective nature make people feel both challenged and cared for simultaneously. You have a gift for seeing potential in others and encouraging them to reach it, and your enthusiasm is genuinely contagious. While you may sometimes give more advice than requested or struggle to let others make their own mistakes, your guidance comes from a place of authentic care. You thrive in roles where you can both lead and nurture, bringing out the best in those around you.',
    descriptionKo: '당신은 진정한 따뜻함과 자연스러운 리더십을 결합하여 다른 사람을 지도하고 고양시키는 양육적 존재를 만듭니다. 감정적 지원을 제공하면서 지혜를 공유할 수 있는 멘토 역할에서 뛰어납니다. 관대한 정신과 보호적 성격이 사람들이 동시에 도전받고 돌봄받는다고 느끼게 합니다. 다른 사람의 잠재력을 보고 그것에 도달하도록 격려하는 재능이 있으며, 열정이 진정으로 전염됩니다. 때로는 요청된 것보다 더 많은 조언을 주거나 다른 사람이 자신의 실수를 하게 두는 데 어려움을 겪을 수 있지만, 지도는 진정한 돌봄의 자리에서 나옵니다. 주변 사람들에게서 최고를 끌어내며 이끌고 양육할 수 있는 역할에서 번창합니다.',
    therapeuticQuestions: [
      'Can you let someone fail and learn from their own experience, even when you could prevent it? What makes that difficult?',
      'What happens inside you when your advice isn\'t taken or someone rejects your help? What does that trigger?',
      'Who nurtures YOU? Do you allow yourself to receive care, or do you always need to be the strong one?',
    ],
    therapeuticQuestionsKo: [
      '당신이 막을 수 있을 때도 누군가 실패하고 자신의 경험에서 배우게 둘 수 있나요? 무엇이 그것을 어렵게 만드나요?',
      '조언이 받아들여지지 않거나 누군가 도움을 거부할 때 당신 내면에서 무슨 일이 일어나나요? 무엇이 촉발되나요?',
      '누가 당신을 돌봐주나요? 돌봄을 받는 것을 허용하나요, 아니면 항상 강한 사람이어야 하나요?',
    ],
    growthRecommendations: [
      'Week 1: Before giving advice, ask "Would you like my input on this?" and respect the answer, especially if it\'s no.',
      'Week 2-3: When you see someone struggling, wait. Let them ask for help rather than jumping in. Notice your discomfort.',
      'Month 1: Identify one area where you need support and actively ask someone for help. Practice receiving without deflecting.',
      'Integration: True nurturing empowers independence, not dependence. Let others find their own path, even through mistakes.',
    ],
    growthRecommendationsKo: [
      '1주차: 조언하기 전에 "이것에 대해 제 의견을 듣고 싶으세요?"라고 물어보고 답을 존중하세요, 특히 아니오일 때.',
      '2-3주차: 누군가 어려움을 겪는 것을 볼 때 기다리세요. 뛰어들기보다 그들이 도움을 요청하게 두세요. 불편함을 관찰하세요.',
      '1개월차: 지원이 필요한 한 영역을 파악하고 적극적으로 누군가에게 도움을 요청하세요. 회피하지 않고 받는 연습을 하세요.',
      '통합: 진정한 양육은 의존이 아니라 독립을 임파워합니다. 실수를 통해서라도 다른 사람이 자신의 길을 찾게 두세요.',
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
    if (!answer) continue;

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
  if (domDiff > 1.0) score += 20;
  else if (domDiff > 0.5) score += 10;

  // Both being warm/friendly is good
  if (affSum > 1.0) score += 20;
  else if (affSum > 0) score += 10;
  else if (affSum < -1.0) score -= 10; // Both cold is harder

  // Same style: moderate (understand each other but may clash)
  if (style1 === style2) score = 65;

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
  persona1Code: string,
  persona2Code: string,
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
