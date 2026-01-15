// src/lib/Saju/textGenerator.ts
// 운세 해석 문장 생성기 (200% 급 모듈)

import { FiveElement, SajuPillars, SibsinKind } from './types';
import { FIVE_ELEMENT_RELATIONS } from './constants';
import { getStemElement, getBranchElement, getStemYinYang } from './stemBranchUtils';

// ============================================================
// 타입 정의
// ============================================================

/** 문장 스타일 */
export type TextStyle = 'formal' | 'casual' | 'poetic' | 'brief';

/** 문장 컨텍스트 */
export interface TextContext {
  style: TextStyle;
  targetAge?: number;      // 대상 연령대
  gender?: 'male' | 'female' | 'neutral';
  emphasis?: string[];     // 강조할 키워드
  locale?: 'ko' | 'en';    // 언어
}

/** 생성된 문장 */
export interface GeneratedText {
  main: string;            // 메인 문장
  details: string[];       // 상세 설명
  keywords: string[];      // 핵심 키워드
  advice?: string;         // 조언
}

/** 운세 해석 입력 */
export interface FortuneInput {
  type: 'daily' | 'monthly' | 'yearly' | 'daeun';
  stem: string;
  branch: string;
  dayMaster: string;
  sibsin?: SibsinKind;
  twelveStage?: string;
  interactions?: string[];
}

// ============================================================
// 문장 템플릿
// ============================================================

const ELEMENT_KEYWORDS: Record<FiveElement, {
  positive: string[];
  negative: string[];
  action: string[];
  domain: string[];
}> = {
  '목': {
    positive: ['성장', '발전', '시작', '창조', '활력', '인자함'],
    negative: ['조급함', '산만함', '과욕', '충동'],
    action: ['계획을 세우다', '새로 시작하다', '도전하다', '배우다'],
    domain: ['교육', '출판', '창업', '연구개발'],
  },
  '화': {
    positive: ['열정', '명예', '표현', '소통', '화려함', '지혜'],
    negative: ['급함', '과열', '분쟁', '소진'],
    action: ['표현하다', '홍보하다', '빛나다', '이끌다'],
    domain: ['예술', '방송', '마케팅', '리더십'],
  },
  '토': {
    positive: ['안정', '신뢰', '중재', '포용', '실속', '성실'],
    negative: ['고집', '정체', '우유부단', '보수적'],
    action: ['중재하다', '기반을 다지다', '축적하다', '조율하다'],
    domain: ['부동산', '중개', '농업', '공무'],
  },
  '금': {
    positive: ['결단', '명확', '정의', '품격', '절제', '집중'],
    negative: ['냉정', '고독', '비판적', '완고'],
    action: ['결단하다', '정리하다', '실행하다', '마무리하다'],
    domain: ['금융', '법률', '기술', '제조'],
  },
  '수': {
    positive: ['지혜', '유연', '적응', '통찰', '잠재력', '창의'],
    negative: ['불안', '변덕', '우울', '도피'],
    action: ['탐구하다', '흐름을 읽다', '네트워크하다', '연구하다'],
    domain: ['연구', '무역', '물류', 'IT'],
  },
};

const SIBSIN_INTERPRETATIONS: Record<SibsinKind, {
  theme: string;
  fortune: string;
  caution: string;
  advice: string;
}> = {
  '비견': {
    theme: '경쟁과 동반자',
    fortune: '동료와의 협력이 중요한 시기입니다. 같은 목표를 가진 사람들과 함께할 때 시너지가 발휘됩니다.',
    caution: '지나친 경쟁심은 관계를 해칠 수 있습니다.',
    advice: '겸손함을 유지하면서 자신만의 강점을 발휘하세요.',
  },
  '겁재': {
    theme: '도전과 변화',
    fortune: '새로운 기회가 찾아오는 시기입니다. 과감한 도전이 성공을 불러올 수 있습니다.',
    caution: '욕심이 과하면 손실을 볼 수 있으니 신중함이 필요합니다.',
    advice: '리스크 관리를 철저히 하면서 기회를 잡으세요.',
  },
  '식신': {
    theme: '창의와 표현',
    fortune: '창의적인 아이디어가 떠오르는 시기입니다. 자신의 재능을 발휘하기 좋습니다.',
    caution: '실행력이 부족하면 기회를 놓칠 수 있습니다.',
    advice: '아이디어를 행동으로 옮기세요. 시작이 반입니다.',
  },
  '상관': {
    theme: '변화와 혁신',
    fortune: '기존 틀을 깨는 새로운 시도가 필요한 시기입니다. 변화가 발전의 계기가 됩니다.',
    caution: '너무 급격한 변화는 불안정을 가져올 수 있습니다.',
    advice: '점진적으로 변화를 추구하되, 핵심 가치는 지키세요.',
  },
  '편재': {
    theme: '재물과 활동',
    fortune: '활발한 활동으로 재물 운이 상승합니다. 투자나 사업에 좋은 기회가 있습니다.',
    caution: '무리한 투자는 삼가고 안정적인 수익을 추구하세요.',
    advice: '기회를 잡되 리스크 분산을 잊지 마세요.',
  },
  '정재': {
    theme: '안정적 수입',
    fortune: '꾸준한 노력이 결실을 맺는 시기입니다. 정직한 노력이 보상받습니다.',
    caution: '지나친 절약은 기회비용을 높일 수 있습니다.',
    advice: '균형 잡힌 소비와 저축으로 자산을 관리하세요.',
  },
  '편관': {
    theme: '책임과 도전',
    fortune: '중요한 책임이 주어지는 시기입니다. 어려움을 극복하면 크게 성장합니다.',
    caution: '스트레스 관리가 중요합니다. 건강에 유의하세요.',
    advice: '주어진 책임을 성실히 수행하면 인정받게 됩니다.',
  },
  '정관': {
    theme: '질서와 명예',
    fortune: '사회적 인정과 승진의 기회가 있습니다. 원칙을 지키면 신뢰를 얻습니다.',
    caution: '융통성 부족이 관계에 어려움을 줄 수 있습니다.',
    advice: '원칙은 지키되 상황에 따른 유연성도 발휘하세요.',
  },
  '편인': {
    theme: '학습과 통찰',
    fortune: '새로운 지식이나 기술을 배우기 좋은 시기입니다. 자기계발에 투자하세요.',
    caution: '현실과 동떨어진 이상에 빠지지 않도록 주의하세요.',
    advice: '배움을 실천으로 연결하세요. 이론과 실무의 균형이 중요합니다.',
  },
  '정인': {
    theme: '지원과 성장',
    fortune: '주변의 도움과 지원을 받는 시기입니다. 인연을 소중히 하세요.',
    caution: '의존심이 강해지면 자립심이 약해질 수 있습니다.',
    advice: '감사하는 마음을 가지되 스스로의 역량도 키우세요.',
  },
};

const TWELVE_STAGE_TEXTS: Record<string, {
  energy: string;
  meaning: string;
  advice: string;
}> = {
  '장생': {
    energy: '탄생의 기운',
    meaning: '새로운 시작과 가능성이 열리는 시기입니다.',
    advice: '씨앗을 뿌리듯 새로운 일을 시작하기 좋습니다.',
  },
  '목욕': {
    energy: '정화의 기운',
    meaning: '변화와 성장통을 겪는 시기입니다.',
    advice: '어려움을 성장의 과정으로 받아들이세요.',
  },
  '관대': {
    energy: '성장의 기운',
    meaning: '자신감이 높아지고 능력이 발휘되는 시기입니다.',
    advice: '적극적으로 자신을 표현하세요.',
  },
  '임관': {
    energy: '성취의 기운',
    meaning: '사회적 인정과 성취가 있는 시기입니다.',
    advice: '책임감을 갖고 주어진 역할을 충실히 하세요.',
  },
  '왕지': {
    energy: '전성의 기운',
    meaning: '모든 것이 정점에 이르는 황금기입니다.',
    advice: '겸손함을 잃지 않으면서 최선을 다하세요.',
  },
  '쇠': {
    energy: '안정의 기운',
    meaning: '에너지가 안정되어 내실을 다지는 시기입니다.',
    advice: '무리하지 말고 기존 것을 다지세요.',
  },
  '병': {
    energy: '휴식의 기운',
    meaning: '재충전이 필요한 시기입니다.',
    advice: '건강에 유의하고 충분히 쉬세요.',
  },
  '사': {
    energy: '전환의 기운',
    meaning: '한 시기가 마무리되고 새 시작을 준비합니다.',
    advice: '정리하고 다음을 준비하세요.',
  },
  '묘': {
    energy: '잠복의 기운',
    meaning: '내면의 힘을 기르는 시기입니다.',
    advice: '때를 기다리며 역량을 축적하세요.',
  },
  '절': {
    energy: '씨앗의 기운',
    meaning: '새로운 가능성이 잉태되는 시기입니다.',
    advice: '작은 것에서부터 시작하세요.',
  },
  '태': {
    energy: '형성의 기운',
    meaning: '계획과 구상이 구체화되는 시기입니다.',
    advice: '계획을 세우고 기반을 다지세요.',
  },
  '양': {
    energy: '성숙의 기운',
    meaning: '준비가 마무리되어 행동할 때입니다.',
    advice: '축적된 역량을 발휘할 준비를 하세요.',
  },
};

// ============================================================
// 문장 생성 함수
// ============================================================

/**
 * 오행 기반 문장 생성
 */
export function generateElementText(
  element: FiveElement,
  context: TextContext = { style: 'formal' }
): GeneratedText {
  const info = ELEMENT_KEYWORDS[element];
  const style = context.style;

  let main: string;
  let details: string[];

  if (style === 'formal') {
    main = `${element}(${getElementHanja(element)})의 기운이 작용하는 시기입니다. ${info.positive[0]}과 ${info.positive[1]}의 에너지가 강하게 나타납니다.`;
    details = [
      `주요 특성: ${info.positive.slice(0, 3).join(', ')}`,
      `주의사항: ${info.negative.slice(0, 2).join(', ')}에 유의하세요.`,
      `추천 행동: ${info.action[0]}, ${info.action[1]}`,
      `유리한 분야: ${info.domain.slice(0, 2).join(', ')}`,
    ];
  } else if (style === 'casual') {
    main = `${element}의 기운이 강해요! ${info.positive[0]}하고 ${info.positive[1]}하기 딱 좋은 때예요.`;
    details = [
      `이런 것들이 잘 돼요: ${info.positive.slice(0, 2).join(', ')}`,
      `조심할 건: ${info.negative[0]}`,
      `이렇게 해보세요: ${info.action[0]}`,
    ];
  } else if (style === 'poetic') {
    main = `${getElementPoetic(element)}`;
    details = [
      `${info.positive[0]}의 씨앗이 ${info.positive[1]}의 꽃을 피웁니다.`,
      `${info.action[0]} 때, 운명의 문이 열립니다.`,
    ];
  } else {
    main = `${element} 기운 상승. ${info.positive[0]} 시기.`;
    details = [`핵심: ${info.action[0]}`];
  }

  return {
    main,
    details,
    keywords: info.positive.slice(0, 3),
    advice: `${info.domain[0]} 분야에서 ${info.action[0]}는 것이 좋습니다.`,
  };
}

function getElementHanja(element: FiveElement): string {
  const map: Record<FiveElement, string> = {
    '목': '木', '화': '火', '토': '土', '금': '金', '수': '水'
  };
  return map[element];
}

function getElementPoetic(element: FiveElement): string {
  const poems: Record<FiveElement, string> = {
    '목': '봄바람에 새싹이 돋듯, 새로운 시작의 기운이 솟아오릅니다.',
    '화': '한여름 태양처럼, 열정과 빛이 당신을 비춥니다.',
    '토': '대지가 만물을 품듯, 안정과 풍요가 깃듭니다.',
    '금': '가을 낙엽이 떨어지듯, 정리와 결실의 시간입니다.',
    '수': '깊은 우물처럼, 지혜와 통찰이 솟아납니다.',
  };
  return poems[element];
}

/**
 * 십성 기반 운세 문장 생성
 */
export function generateSibsinText(
  sibsin: SibsinKind,
  context: TextContext = { style: 'formal' }
): GeneratedText {
  const info = SIBSIN_INTERPRETATIONS[sibsin];

  let main: string;
  if (context.style === 'formal') {
    main = `${sibsin}(${info.theme})의 운이 강하게 작용합니다. ${info.fortune}`;
  } else if (context.style === 'casual') {
    main = `${sibsin} 운세예요! ${info.fortune.replace('입니다', '이에요')}`;
  } else if (context.style === 'poetic') {
    main = `${info.theme}의 바람이 불어옵니다. ${info.fortune}`;
  } else {
    main = `${sibsin}: ${info.theme}. ${info.fortune.split('.')[0]}.`;
  }

  return {
    main,
    details: [info.fortune, info.caution],
    keywords: [sibsin, info.theme],
    advice: info.advice,
  };
}

/**
 * 12운성 기반 문장 생성
 */
export function generateTwelveStageText(
  stage: string,
  context: TextContext = { style: 'formal' }
): GeneratedText {
  const info = TWELVE_STAGE_TEXTS[stage] || {
    energy: '변화의 기운',
    meaning: '새로운 흐름이 시작됩니다.',
    advice: '변화에 유연하게 대응하세요.',
  };

  let main: string;
  if (context.style === 'formal') {
    main = `12운성 ${stage}의 ${info.energy}이 작용합니다. ${info.meaning}`;
  } else if (context.style === 'casual') {
    main = `${stage} 시기예요! ${info.meaning.replace('입니다', '이에요')}`;
  } else {
    main = `${stage}: ${info.meaning}`;
  }

  return {
    main,
    details: [info.meaning],
    keywords: [stage, info.energy],
    advice: info.advice,
  };
}

/**
 * 종합 운세 문장 생성
 */
export function generateFortuneText(
  input: FortuneInput,
  context: TextContext = { style: 'formal' }
): GeneratedText {
  const unseElement = getStemElement(input.stem);
  const dayElement = getStemElement(input.dayMaster);

  // 기본 오행 해석
  const elementText = generateElementText(unseElement, context);

  // 일간과의 관계
  const relation = getElementRelation(dayElement, unseElement);
  const relationText = generateRelationText(relation, context);

  // 십성 해석 (있는 경우)
  let sibsinText: GeneratedText | null = null;
  if (input.sibsin) {
    sibsinText = generateSibsinText(input.sibsin, context);
  }

  // 12운성 해석 (있는 경우)
  let stageText: GeneratedText | null = null;
  if (input.twelveStage) {
    stageText = generateTwelveStageText(input.twelveStage, context);
  }

  // 종합 문장 조합
  const periodName = getPeriodName(input.type);
  let main: string;

  if (context.style === 'formal') {
    main = `${periodName}의 ${input.stem}${input.branch} 기운 아래, ${relationText}. ${elementText.main}`;
  } else if (context.style === 'casual') {
    main = `${periodName}엔 ${unseElement} 기운이 강해요! ${relationText} ${sibsinText?.main || ''}`;
  } else if (context.style === 'poetic') {
    main = `${periodName}의 하늘이 ${unseElement}으로 물듭니다. ${elementText.main}`;
  } else {
    main = `${periodName}: ${unseElement} 기운. ${relation}.`;
  }

  // 상세 정보 조합
  const details = [
    ...elementText.details,
    relationText,
    ...(sibsinText?.details || []),
    ...(stageText?.details || []),
  ];

  // 키워드 조합
  const keywords = [
    unseElement,
    ...elementText.keywords,
    ...(sibsinText?.keywords || []),
    ...(stageText?.keywords || []),
  ];

  // 조언 조합
  const advice = [
    elementText.advice,
    sibsinText?.advice,
    stageText?.advice,
  ].filter(Boolean).join(' ');

  return { main, details, keywords: Array.from(new Set(keywords)), advice };
}

function getPeriodName(type: FortuneInput['type']): string {
  const names: Record<FortuneInput['type'], string> = {
    daily: '오늘',
    monthly: '이번 달',
    yearly: '올해',
    daeun: '이번 대운',
  };
  return names[type];
}

function getElementRelation(dayElement: FiveElement, unseElement: FiveElement): string {
  if (dayElement === unseElement) return '비화';
  if (FIVE_ELEMENT_RELATIONS['생받는관계'][dayElement] === unseElement) return '생조';
  if (FIVE_ELEMENT_RELATIONS['생하는관계'][dayElement] === unseElement) return '설기';
  if (FIVE_ELEMENT_RELATIONS['극하는관계'][dayElement] === unseElement) return '극출';
  if (FIVE_ELEMENT_RELATIONS['극받는관계'][dayElement] === unseElement) return '극입';
  return '중립';
}

function generateRelationText(relation: string, context: TextContext): string {
  const relationTexts: Record<string, { formal: string; casual: string }> = {
    '비화': {
      formal: '같은 오행의 기운이 힘을 보탭니다',
      casual: '같은 에너지라 힘이 나요',
    },
    '생조': {
      formal: '일간을 도와주는 생조의 기운이 작용합니다',
      casual: '도움받는 좋은 기운이에요',
    },
    '설기': {
      formal: '에너지가 외부로 발산되는 시기입니다',
      casual: '표현하고 나누는 시기예요',
    },
    '극출': {
      formal: '적극적으로 움직여야 하는 시기입니다',
      casual: '활발하게 움직일 때예요',
    },
    '극입': {
      formal: '신중하게 행동해야 하는 시기입니다',
      casual: '조심해서 움직여야 해요',
    },
    '중립': {
      formal: '평온한 흐름이 이어집니다',
      casual: '무난한 시기예요',
    },
  };

  const texts = relationTexts[relation] || relationTexts['중립'];
  return context.style === 'casual' ? texts.casual : texts.formal;
}

/**
 * 충 관계 문장 생성
 */
export function generateChungText(
  branch1: string,
  branch2: string,
  context: TextContext = { style: 'formal' }
): GeneratedText {
  const main = context.style === 'formal'
    ? `${branch1}과 ${branch2}의 충(衝)이 발생합니다. 변동과 충돌의 에너지가 강하게 작용하니, 중요한 결정은 신중하게 내리시기 바랍니다.`
    : `${branch1}${branch2} 충이에요! 변화가 많을 수 있어요. 중요한 건 천천히 결정하세요.`;

  return {
    main,
    details: [
      '급격한 변화나 이동수가 있을 수 있습니다',
      '갈등이나 충돌에 주의하세요',
      '건강 관리에 신경 쓰세요',
    ],
    keywords: ['충', '변화', '주의'],
    advice: '무리하지 말고 유연하게 대처하세요.',
  };
}

/**
 * 합 관계 문장 생성
 */
export function generateHapText(
  branch1: string,
  branch2: string,
  hapType: '육합' | '삼합' | '방합',
  context: TextContext = { style: 'formal' }
): GeneratedText {
  const main = context.style === 'formal'
    ? `${branch1}과 ${branch2}의 ${hapType}이 이루어집니다. 조화와 결합의 에너지가 긍정적으로 작용합니다.`
    : `${branch1}${branch2} ${hapType}이에요! 좋은 에너지가 모여요.`;

  return {
    main,
    details: [
      '협력과 화합이 잘 이루어집니다',
      '인연이 깊어지는 시기입니다',
      '새로운 기회가 열립니다',
    ],
    keywords: ['합', '화합', '기회'],
    advice: '적극적으로 인연을 맺고 협력하세요.',
  };
}

/**
 * 일간 강약에 따른 조언 생성
 */
export function generateStrengthAdvice(
  strengthLevel: '극강' | '강' | '중강' | '중약' | '약' | '극약',
  yongsin: FiveElement,
  context: TextContext = { style: 'formal' }
): GeneratedText {
  const yongsinInfo = ELEMENT_KEYWORDS[yongsin];

  const adviceMap: Record<string, { main: string; advice: string }> = {
    '극강': {
      main: '일간이 매우 강하여 에너지가 넘칩니다. 이 힘을 적절히 발산하는 것이 중요합니다.',
      advice: `${yongsin} 오행을 활용하여 과잉 에너지를 조절하세요.`,
    },
    '강': {
      main: '일간이 강하여 자신감과 추진력이 있습니다.',
      advice: `${yongsin} 방면으로 활동하면 좋은 결과를 얻을 수 있습니다.`,
    },
    '중강': {
      main: '일간이 적당히 강하여 균형 잡힌 상태입니다.',
      advice: '현재의 방향을 유지하면서 발전을 도모하세요.',
    },
    '중약': {
      main: '일간이 다소 약하여 외부의 지원이 도움됩니다.',
      advice: `${yongsin} 오행의 도움을 받으면 힘을 얻을 수 있습니다.`,
    },
    '약': {
      main: '일간이 약하여 신중한 접근이 필요합니다.',
      advice: `${yongsin} 관련 활동과 휴식의 균형을 맞추세요.`,
    },
    '극약': {
      main: '일간이 매우 약하여 자기 보호가 우선입니다.',
      advice: `${yongsin} 오행을 적극 보강하고 건강을 챙기세요.`,
    },
  };

  const info = adviceMap[strengthLevel] || adviceMap['중강'];

  return {
    main: context.style === 'casual' ? info.main.replace('입니다', '이에요') : info.main,
    details: [
      `용신: ${yongsin}`,
      `유리한 분야: ${yongsinInfo.domain.slice(0, 2).join(', ')}`,
      `추천 행동: ${yongsinInfo.action[0]}`,
    ],
    keywords: [strengthLevel, yongsin],
    advice: info.advice,
  };
}

/**
 * 종합 해석 문장 생성
 */
export function generateComprehensiveText(
  pillars: SajuPillars,
  options: {
    strengthLevel: string;
    geokguk: string;
    yongsin: FiveElement;
    unseInfo?: FortuneInput;
  },
  context: TextContext = { style: 'formal' }
): GeneratedText {
  const dayMaster = pillars.day.heavenlyStem.name;
  const dayElement = getStemElement(dayMaster);
  const dayYinYang = getStemYinYang(dayMaster);

  const dayMasterName = `${dayYinYang} ${dayElement}`;

  // 기본 성격 해석
  const personalityText = generatePersonalityText(dayElement, dayYinYang, context);

  // 운세 해석 (있는 경우)
  let fortuneText: GeneratedText | null = null;
  if (options.unseInfo) {
    fortuneText = generateFortuneText(options.unseInfo, context);
  }

  const main = context.style === 'formal'
    ? `${dayMaster} 일간(${dayMasterName})을 기준으로, ${options.geokguk} 격국에 ${options.strengthLevel} 상태입니다. ${personalityText.main}`
    : `${dayMaster}(${dayMasterName}) 일간이에요! ${options.geokguk}에 ${options.strengthLevel}. ${personalityText.main}`;

  const details = [
    ...personalityText.details,
    `격국: ${options.geokguk}`,
    `신강/신약: ${options.strengthLevel}`,
    `용신: ${options.yongsin}`,
    ...(fortuneText?.details || []),
  ];

  const keywords = [
    dayMaster,
    dayElement,
    options.geokguk,
    options.yongsin,
    ...personalityText.keywords,
  ];

  const advice = [
    personalityText.advice,
    fortuneText?.advice,
  ].filter(Boolean).join(' ');

  return { main, details, keywords: Array.from(new Set(keywords)), advice };
}

function generatePersonalityText(
  element: FiveElement,
  yinYang: '양' | '음',
  context: TextContext
): GeneratedText {
  const elementInfo = ELEMENT_KEYWORDS[element];
  const yinYangTrait = yinYang === '양' ? '적극적이고 외향적인' : '신중하고 내향적인';

  const main = context.style === 'formal'
    ? `${yinYangTrait} 성격에 ${elementInfo.positive[0]}과 ${elementInfo.positive[1]}의 특성을 지니고 있습니다.`
    : `${yinYangTrait} 성격이에요. ${elementInfo.positive[0]}하고 ${elementInfo.positive[1]}해요!`;

  return {
    main,
    details: [
      `강점: ${elementInfo.positive.slice(0, 3).join(', ')}`,
      `주의점: ${elementInfo.negative.slice(0, 2).join(', ')}`,
    ],
    keywords: [element, yinYang, ...elementInfo.positive.slice(0, 2)],
    advice: `${elementInfo.action[0]}는 것이 본성에 맞습니다.`,
  };
}
