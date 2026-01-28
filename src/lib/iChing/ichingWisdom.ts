/**
 * I Ching Wisdom Generator - 1000% Level
 * 주역 지혜 생성기: 괘사/효사 심층 해석, AI 프롬프트 생성, 상황별 조언
 */

import { DICTS } from '@/i18n/I18nProvider';

type Locale = 'en' | 'ko';

/** Helper to get an iching.wisdom translation key (with cache) */
const _twCache: Record<string, string> = {};

function tw(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const cacheKey = `${locale}:${key}`;
  let val = _twCache[cacheKey];
  if (val === undefined) {
    const dict = DICTS[locale] as Record<string, any>;
    val = dict?.iching?.wisdom?.[key] ?? key;
    _twCache[cacheKey] = val;
  }
  if (vars) {
    let result = val;
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
    return result;
  }
  return val;
}

const _twArrayCache: Record<string, string[]> = {};

function twArray(locale: Locale, key: string): string[] {
  const cacheKey = `${locale}:${key}`;
  let val = _twArrayCache[cacheKey];
  if (val === undefined) {
    const dict = DICTS[locale] as Record<string, any>;
    val = dict?.iching?.wisdom?.[key] ?? [];
    _twArrayCache[cacheKey] = val;
  }
  return val;
}

// 64괘 기본 지혜 데이터
export const HEXAGRAM_WISDOM: Record<number, HexagramWisdomData> = {
  1: {
    name: '건',
    chinese: '乾',
    keyword: '창조',
    element: '천',
    nature: '순양',
    gwaeSa: '元亨利貞 (원형이정)',
    meaning: '크게 형통하고 바르게 함이 이롭다',
    coreWisdom: '하늘의 도는 쉬지 않고 움직인다. 군자는 이를 본받아 스스로 강건히 노력한다.',
    situationAdvice: {
      career: '큰 뜻을 품고 과감히 나아가라. 리더십을 발휘할 때다.',
      relationship: '당당하게 자신을 표현하되, 상대를 배려하라.',
      health: '양기가 충만하니 활동적으로 움직여라.',
      wealth: '큰 투자나 사업에 길하다. 과감하게 결단하라.',
      spiritual: '하늘의 뜻에 순응하며 자기수양에 힘쓰라.'
    },
    yaoWisdom: [
      { position: 1, text: '잠룡물용 (潛龍勿用)', meaning: '잠겨있는 용이니 쓰지 마라. 때를 기다려라.' },
      { position: 2, text: '견룡재전 (見龍在田)', meaning: '용이 밭에 나타났으니 대인을 만남이 이롭다.' },
      { position: 3, text: '군자종일건건 (君子終日乾乾)', meaning: '군자가 종일 힘쓰고 저녁에도 조심하라.' },
      { position: 4, text: '혹약재연 (或躍在淵)', meaning: '뛰어오르거나 연못에 있으니 허물이 없다.' },
      { position: 5, text: '비룡재천 (飛龍在天)', meaning: '나는 용이 하늘에 있으니 대인을 만남이 이롭다.' },
      { position: 6, text: '항룡유회 (亢龍有悔)', meaning: '높이 오른 용은 후회가 있으리라.' }
    ],
    warnings: ['교만하지 마라', '지나친 강함은 부러진다', '때를 알아야 한다'],
    opportunities: ['창업', '리더십 발휘', '새로운 시작', '큰 결단']
  },
  2: {
    name: '곤',
    chinese: '坤',
    keyword: '수용',
    element: '지',
    nature: '순음',
    gwaeSa: '元亨利牝馬之貞 (원형이빈마지정)',
    meaning: '암말의 바름이 이롭다. 순응하며 따르라.',
    coreWisdom: '땅의 덕은 모든 것을 품어 기른다. 겸손하게 받아들이고 키워라.',
    situationAdvice: {
      career: '보조적 역할이 길하다. 때를 기다리며 준비하라.',
      relationship: '상대를 존중하고 맞추어라. 포용이 핵심이다.',
      health: '휴식과 회복에 집중하라. 무리하지 마라.',
      wealth: '안정적인 투자가 좋다. 모험은 피하라.',
      spiritual: '겸손과 수용의 자세를 배워라.'
    },
    yaoWisdom: [
      { position: 1, text: '이상견빙 (履霜堅冰)', meaning: '서리를 밟으니 단단한 얼음이 올 것이다.' },
      { position: 2, text: '직방대 (直方大)', meaning: '곧고 바르고 크니 배우지 않아도 이롭지 않음이 없다.' },
      { position: 3, text: '함장가정 (含章可貞)', meaning: '아름다움을 품으니 바르게 할 수 있다.' },
      { position: 4, text: '괄낭 (括囊)', meaning: '자루를 묶으니 허물도 없고 칭찬도 없다.' },
      { position: 5, text: '황상원길 (黃裳元吉)', meaning: '누런 치마이니 크게 길하다.' },
      { position: 6, text: '용전우야 (龍戰于野)', meaning: '용이 들에서 싸우니 그 피가 검푸르다.' }
    ],
    warnings: ['지나친 순종은 약함이 된다', '자기 주장도 필요하다'],
    opportunities: ['협력', '보조', '양육', '수용', '기다림']
  },
  3: {
    name: '둔',
    chinese: '屯',
    keyword: '시작의 어려움',
    element: '수뢰',
    nature: '험난',
    gwaeSa: '元亨利貞 勿用有攸往 利建侯',
    meaning: '바르게 하면 형통하나 나아가지 말고, 제후를 세움이 이롭다.',
    coreWisdom: '만물이 처음 생겨날 때는 어려움이 따른다. 인내하며 기반을 다져라.',
    situationAdvice: {
      career: '새 시작은 어렵다. 조력자를 구하고 천천히 나아가라.',
      relationship: '첫 만남은 어색하다. 시간을 두고 천천히 발전시켜라.',
      health: '초기 증상을 방치하지 마라. 조기 치료가 중요하다.',
      wealth: '투자 초기에는 손실이 있을 수 있다. 장기적 관점을 가져라.',
      spiritual: '수행의 초기 어려움을 견뎌라. 기초가 중요하다.'
    },
    yaoWisdom: [
      { position: 1, text: '반환 (磐桓)', meaning: '머뭇거리니 바르게 거하는 것이 이롭다.' },
      { position: 2, text: '둔여전여 (屯如邅如)', meaning: '어려워 망설이고 있으니 혼인하면 좋다.' },
      { position: 3, text: '즉록무우 (即鹿無虞)', meaning: '사냥감만 보고 따라가면 숲에서 헤맨다.' },
      { position: 4, text: '승마반여 (乘馬班如)', meaning: '말을 타고 망설이니 혼인을 구하면 이롭다.' },
      { position: 5, text: '둔기고 (屯其膏)', meaning: '은택을 베풀기 어려우니 작은 일에는 길하다.' },
      { position: 6, text: '승마반여 읍혈연여 (乘馬班如 泣血漣如)', meaning: '말 타고 망설이며 피눈물을 흘린다.' }
    ],
    warnings: ['조급하면 실패한다', '혼자 하려 하지 마라'],
    opportunities: ['협력자 구하기', '기반 다지기', '장기 계획']
  },
  // 추가 괘들은 패턴에 따라 확장...
  4: { name: '몽', chinese: '蒙', keyword: '계몽', element: '산수', nature: '어리석음', gwaeSa: '亨 匪我求童蒙 童蒙求我', meaning: '내가 어린이를 찾는 게 아니라 어린이가 나를 찾는다', coreWisdom: '배움의 자세가 중요하다. 스승을 찾되 겸손하라.', situationAdvice: { career: '배움이 필요한 때다. 멘토를 찾아라.', relationship: '순수한 마음으로 다가가라.', health: '무지가 병을 키운다. 정확한 진단을 받아라.', wealth: '배움에 투자하라. 지식이 재산이다.', spiritual: '겸손히 가르침을 구하라.' }, yaoWisdom: [], warnings: ['아는 척하지 마라'], opportunities: ['학습', '교육', '멘토링'] },
  5: { name: '수', chinese: '需', keyword: '기다림', element: '수천', nature: '대기', gwaeSa: '有孚 光亨 貞吉 利涉大川', meaning: '믿음이 있으면 크게 형통하고 큰 강을 건너도 이롭다', coreWisdom: '때를 기다려야 한다. 조급함은 금물이다.', situationAdvice: { career: '때를 기다려라. 준비하며 기회를 노려라.', relationship: '서두르지 마라. 자연스럽게 발전시켜라.', health: '충분한 휴식이 필요하다.', wealth: '장기 투자가 이롭다. 단기 수익을 쫓지 마라.', spiritual: '인내와 믿음을 키워라.' }, yaoWisdom: [], warnings: ['조급함은 화를 부른다'], opportunities: ['준비', '계획', '기다림'] },
  6: { name: '송', chinese: '訟', keyword: '다툼', element: '천수', nature: '쟁송', gwaeSa: '有孚窒 惕中吉 終凶', meaning: '믿음이 막히니 두려워하면 중간에는 길하나 끝까지 가면 흉하다', coreWisdom: '다툼은 피하라. 이기더라도 손해다.', situationAdvice: { career: '분쟁을 피하라. 중재자를 찾아라.', relationship: '말다툼을 삼가라. 화해가 우선이다.', health: '스트레스가 병을 키운다.', wealth: '소송이나 분쟁은 돈을 잃는다.', spiritual: '내면의 갈등을 해소하라.' }, yaoWisdom: [], warnings: ['끝까지 가면 패한다'], opportunities: ['화해', '중재', '양보'] },
  7: { name: '사', chinese: '師', keyword: '군대', element: '지수', nature: '통솔', gwaeSa: '貞丈人吉 無咎', meaning: '어른이 바르게 하면 길하고 허물이 없다', coreWisdom: '질서와 규율이 필요하다. 정당한 지도자가 이끌어야 한다.', situationAdvice: { career: '조직을 이끌어야 할 때다. 규율을 세워라.', relationship: '명확한 역할 분담이 필요하다.', health: '규칙적인 생활이 건강의 기본이다.', wealth: '체계적인 재테크가 필요하다.', spiritual: '내면의 질서를 세워라.' }, yaoWisdom: [], warnings: ['독선적 리더십은 반발을 산다'], opportunities: ['리더십', '조직화', '규율'] },
  8: { name: '비', chinese: '比', keyword: '친밀', element: '수지', nature: '화합', gwaeSa: '吉 原筮元永貞 無咎', meaning: '길하다. 처음 점쳐 영원히 바르면 허물이 없다', coreWisdom: '가까이 함으로써 서로 돕는다. 친밀한 관계를 맺어라.', situationAdvice: { career: '협력이 성공의 열쇠다. 파트너십을 맺어라.', relationship: '가까워질 때다. 마음을 열어라.', health: '함께 운동하면 효과가 배가된다.', wealth: '공동 투자가 유리하다.', spiritual: '도반(道伴)을 찾아라.' }, yaoWisdom: [], warnings: ['잘못된 사람과 가까이하면 해롭다'], opportunities: ['협력', '친교', '동맹'] },
  // 9-64까지 확장 가능 (간략화)
  9: { name: '소축', chinese: '小畜', keyword: '작은 축적', element: '풍천', nature: '축적', gwaeSa: '亨 密雲不雨 自我西郊', meaning: '형통하나 빽빽한 구름이 비가 되지 못한다', coreWisdom: '작은 것부터 모아라. 아직 큰 일을 할 때가 아니다.', situationAdvice: { career: '작은 성과를 축적하라.', relationship: '작은 관심과 배려가 쌓인다.', health: '건강을 조금씩 챙겨라.', wealth: '소액 저축부터 시작하라.', spiritual: '작은 수행이 쌓여 큰 깨달음이 된다.' }, yaoWisdom: [], warnings: ['너무 큰 것을 바라지 마라'], opportunities: ['저축', '작은 시작'] },
  10: { name: '리', chinese: '履', keyword: '밟음/예절', element: '천택', nature: '신중', gwaeSa: '履虎尾 不咥人 亨', meaning: '호랑이 꼬리를 밟아도 물리지 않으니 형통하다', coreWisdom: '예의와 신중함이 위험을 피하게 한다.', situationAdvice: { career: '조심스럽게 처신하라. 예의를 갖춰라.', relationship: '상대를 존중하고 예의 바르게 행동하라.', health: '위험한 행동을 삼가라.', wealth: '리스크를 신중히 관리하라.', spiritual: '겸손과 예절이 덕의 기본이다.' }, yaoWisdom: [], warnings: ['방심하면 다친다'], opportunities: ['신중한 행동', '예의'] },
  11: { name: '태', chinese: '泰', keyword: '평안/형통', element: '지천', nature: '태평', gwaeSa: '小往大來 吉亨', meaning: '작은 것이 가고 큰 것이 오니 길하고 형통하다', coreWisdom: '하늘과 땅이 교감하니 만물이 화합한다. 형통의 시기다.', situationAdvice: { career: '모든 일이 순조롭다. 적극적으로 나아가라.', relationship: '화합의 시기다. 관계가 발전한다.', health: '건강이 회복되고 좋아진다.', wealth: '투자와 사업이 번창한다.', spiritual: '내면과 외면이 조화를 이룬다.' }, yaoWisdom: [], warnings: ['형통할 때 교만하지 마라'], opportunities: ['확장', '발전', '화합'] },
  12: { name: '비', chinese: '否', keyword: '막힘', element: '천지', nature: '폐색', gwaeSa: '否之匪人 不利君子貞 大往小來', meaning: '막힌 것이 사람의 도가 아니니 군자가 바르게 함이 이롭지 않다', coreWisdom: '하늘과 땅이 소통하지 못하니 만물이 막힌다. 때를 기다려라.', situationAdvice: { career: '일이 막힌다. 물러나 때를 기다려라.', relationship: '소통이 안 된다. 거리를 두어라.', health: '기의 순환이 막혔다. 휴식하라.', wealth: '투자를 삼가라. 손실이 예상된다.', spiritual: '내면으로 침잠하라.' }, yaoWisdom: [], warnings: ['무리하게 밀어붙이면 더 막힌다'], opportunities: ['휴식', '내성', '때 기다림'] },
  // 13-64 간략 데이터
  13: { name: '동인', chinese: '同人', keyword: '화합', element: '천화', nature: '동지', gwaeSa: '同人于野 亨', meaning: '들에서 사람들과 화합하니 형통하다', coreWisdom: '뜻을 같이하는 사람들과 힘을 모아라.', situationAdvice: { career: '팀워크가 중요하다.', relationship: '동지를 찾아라.', health: '함께하면 더 건강해진다.', wealth: '공동 투자가 유리하다.', spiritual: '도반과 함께 수행하라.' }, yaoWisdom: [], warnings: ['파벌을 만들지 마라'], opportunities: ['협력', '동맹'] },
  14: { name: '대유', chinese: '大有', keyword: '크게 소유함', element: '화천', nature: '풍요', gwaeSa: '元亨', meaning: '크게 형통하다', coreWisdom: '하늘 위에 해가 있으니 만물을 비춘다. 풍요의 시기다.', situationAdvice: { career: '성공과 번영의 때다.', relationship: '풍요로운 관계를 누려라.', health: '에너지가 충만하다.', wealth: '재물이 풍족해진다.', spiritual: '베풀어라.' }, yaoWisdom: [], warnings: ['교만하면 잃는다'], opportunities: ['성공', '풍요', '베풂'] },
  15: { name: '겸', chinese: '謙', keyword: '겸손', element: '지산', nature: '겸허', gwaeSa: '亨 君子有終', meaning: '형통하니 군자에게 좋은 마침이 있다', coreWisdom: '겸손한 산이 땅 아래로 낮추니 덕이 높아진다.', situationAdvice: { career: '겸손하면 사람들이 따른다.', relationship: '낮추면 높아진다.', health: '과욕하지 마라.', wealth: '겸손이 지킨다.', spiritual: '진정한 겸손을 배워라.' }, yaoWisdom: [], warnings: ['겸손인 척하지 마라'], opportunities: ['겸손', '낮춤'] },
  63: { name: '기제', chinese: '既濟', keyword: '이미 건넘', element: '수화', nature: '완성', gwaeSa: '亨小 利貞 初吉終亂', meaning: '작은 것이 형통하고 바르게 함이 이롭다. 처음은 길하나 끝은 어지럽다', coreWisdom: '일이 이루어졌으나 끝이 있으니 조심하라.', situationAdvice: { career: '목표를 달성했으나 유지가 어렵다.', relationship: '관계가 완성됐으나 권태에 주의하라.', health: '건강 유지에 힘써라.', wealth: '지키는 것이 중요하다.', spiritual: '깨달음을 유지하라.' }, yaoWisdom: [], warnings: ['완성 후 해이해지면 무너진다'], opportunities: ['유지', '관리'] },
  64: { name: '미제', chinese: '未濟', keyword: '아직 건너지 못함', element: '화수', nature: '미완', gwaeSa: '亨 小狐汔濟 濡其尾 無攸利', meaning: '형통하나 작은 여우가 거의 건널 때 꼬리를 적시니 이로울 것이 없다', coreWisdom: '아직 완성되지 않았으니 마지막까지 방심하지 마라.', situationAdvice: { career: '마무리가 중요하다. 방심하지 마라.', relationship: '아직 갈 길이 남았다.', health: '완치까지 관리하라.', wealth: '마지막 투자에 신중하라.', spiritual: '수행은 끝이 없다.' }, yaoWisdom: [], warnings: ['끝까지 방심하면 실패한다'], opportunities: ['신중한 마무리'] }
};

// 타입 정의
export interface YaoWisdomEntry {
  position: number;
  text: string;
  meaning: string;
}

export interface SituationAdvice {
  career: string;
  relationship: string;
  health: string;
  wealth: string;
  spiritual: string;
}

export interface HexagramWisdomData {
  name: string;
  chinese: string;
  keyword: string;
  element: string;
  nature: string;
  gwaeSa: string;
  meaning: string;
  coreWisdom: string;
  situationAdvice: SituationAdvice;
  yaoWisdom: YaoWisdomEntry[];
  warnings: string[];
  opportunities: string[];
}

// 변효 위치별 의미
export const YAO_POSITION_MEANINGS: Record<number, { general: string; timing: string }> = {
  1: { general: '초기, 시작, 기초, 아래', timing: '첫 단계, 준비기' },
  2: { general: '내부, 중심, 안정, 중', timing: '발전기, 성장기' },
  3: { general: '전환점, 위기, 경계', timing: '전환기, 고비' },
  4: { general: '외부 진출, 확장, 위', timing: '확장기, 도약기' },
  5: { general: '최고점, 군주, 성취', timing: '전성기, 완성기' },
  6: { general: '끝, 과도함, 물러남', timing: '쇠퇴기, 마무리' }
};

// 괘 지혜 생성 함수
export function getHexagramWisdom(hexagramNumber: number, locale: Locale = 'ko'): HexagramWisdomData | null {
  if (hexagramNumber < 1 || hexagramNumber > 64) {return null;}
  return HEXAGRAM_WISDOM[hexagramNumber] || createDefaultWisdom(hexagramNumber, locale);
}

function createDefaultWisdom(hexagramNumber: number, locale: Locale = 'ko'): HexagramWisdomData {
  return {
    name: `괘${hexagramNumber}`,
    chinese: '',
    keyword: tw(locale, 'defaultKeyword'),
    element: '',
    nature: '',
    gwaeSa: '',
    meaning: tw(locale, 'defaultMeaning'),
    coreWisdom: tw(locale, 'defaultCoreWisdom'),
    situationAdvice: {
      career: tw(locale, 'defaultCareer'),
      relationship: tw(locale, 'defaultRelationship'),
      health: tw(locale, 'defaultHealth'),
      wealth: tw(locale, 'defaultWealth'),
      spiritual: tw(locale, 'defaultSpiritual')
    },
    yaoWisdom: [],
    warnings: [tw(locale, 'defaultWarning')],
    opportunities: [tw(locale, 'defaultOpportunity')]
  };
}

// 상황별 조언 생성
export function generateSituationalAdvice(
  hexagramNumber: number,
  situation: keyof SituationAdvice,
  changingLines?: number[],
  locale: Locale = 'ko'
): string {
  const wisdom = getHexagramWisdom(hexagramNumber, locale);
  if (!wisdom) {return tw(locale, 'checkHexagram');}

  let advice = wisdom.situationAdvice[situation];

  // 변효가 있는 경우 추가 조언
  if (changingLines && changingLines.length > 0) {
    const changingAdvice = changingLines.map(line => {
      const positionMeaning = YAO_POSITION_MEANINGS[line];
      return `${line}효(${positionMeaning.general})의 변화: ${positionMeaning.timing}`;
    }).join('. ');
    advice += tw(locale, 'changingLineNote') + changingAdvice;
  }

  return advice;
}

// AI 프롬프트 생성 함수
export interface WisdomPromptContext {
  hexagramNumber: number;
  changingLines?: number[];
  targetHexagram?: number;
  userQuestion?: string;
  consultationType?: 'general' | 'career' | 'relationship' | 'health' | 'wealth' | 'spiritual';
  additionalContext?: string;
}

export function generateWisdomPrompt(context: WisdomPromptContext): string {
  const wisdom = getHexagramWisdom(context.hexagramNumber);
  if (!wisdom) {return '';}

  let prompt = `## 주역 괘 해석 프롬프트

### 본괘 정보
- **괘명**: ${wisdom.name} (${wisdom.chinese}) - 제${context.hexagramNumber}괘
- **키워드**: ${wisdom.keyword}
- **괘사**: ${wisdom.gwaeSa}
- **의미**: ${wisdom.meaning}
- **핵심 지혜**: ${wisdom.coreWisdom}

### 상담 유형: ${context.consultationType || 'general'}
`;

  if (context.userQuestion) {
    prompt += `\n### 질문: ${context.userQuestion}\n`;
  }

  if (context.changingLines && context.changingLines.length > 0) {
    prompt += `\n### 변효: ${context.changingLines.join(', ')}효
`;
    context.changingLines.forEach(line => {
      const yaoInfo = wisdom.yaoWisdom.find(y => y.position === line);
      if (yaoInfo) {
        prompt += `- ${line}효: ${yaoInfo.text} - ${yaoInfo.meaning}\n`;
      }
      const posInfo = YAO_POSITION_MEANINGS[line];
      if (posInfo) {
        prompt += `  (위치 의미: ${posInfo.general}, 시기: ${posInfo.timing})\n`;
      }
    });
  }

  if (context.targetHexagram) {
    const targetWisdom = getHexagramWisdom(context.targetHexagram);
    if (targetWisdom) {
      prompt += `\n### 지괘 (변화 후 괘)
- **괘명**: ${targetWisdom.name} (${targetWisdom.chinese}) - 제${context.targetHexagram}괘
- **키워드**: ${targetWisdom.keyword}
- **핵심 지혜**: ${targetWisdom.coreWisdom}
`;
    }
  }

  // 상담 유형별 조언 추가
  const type = context.consultationType || 'general';
  if (type !== 'general') {
    const adviceKey = type as keyof SituationAdvice;
    prompt += `\n### ${type} 관련 조언
${wisdom.situationAdvice[adviceKey]}
`;
  }

  prompt += `\n### 주의사항
${wisdom.warnings.map(w => `- ${w}`).join('\n')}

### 기회
${wisdom.opportunities.map(o => `- ${o}`).join('\n')}
`;

  if (context.additionalContext) {
    prompt += `\n### 추가 맥락
${context.additionalContext}
`;
  }

  prompt += `\n---
위 정보를 바탕으로 질문자에게 깊이 있고 실용적인 조언을 제공해주세요.
전통적인 주역의 지혜를 현대적 맥락에서 해석하되, 점술적 예언이 아닌 통찰과 안내에 초점을 맞추세요.
`;

  return prompt;
}

// 변효 조합 해석 생성 (전통 주역 규칙 준수)
export function interpretChangingLines(
  originalHex: number,
  targetHex: number,
  changingLines: number[],
  locale: Locale = 'ko'
): string {
  const original = getHexagramWisdom(originalHex, locale);
  const target = getHexagramWisdom(targetHex, locale);

  if (!original || !target) {return tw(locale, 'noHexagramInfo');}

  const lineCount = changingLines.length;
  let interpretation = '';
  let primaryFocus = ''; // 해석의 주 초점

  // 전통 주역 변효 해석 규칙
  if (lineCount === 0) {
    // 불변괘: 본괘의 괘사(卦辭)만 본다
    primaryFocus = '본괘 괘사';
    interpretation = `【불변괘】 변효가 없으니 ${original.name}괘(${original.chinese})의 괘사에 집중하세요.\n\n`;
    interpretation += `괘사: ${original.gwaeSa}\n`;
    interpretation += `의미: ${original.meaning}\n\n`;
    interpretation += `핵심 지혜: ${original.coreWisdom}`;
  } else if (lineCount === 1) {
    // 1개 변효: 해당 변효의 효사(爻辭)를 본다
    const line = changingLines[0];
    const yaoInfo = original.yaoWisdom.find(y => y.position === line);
    primaryFocus = `본괘 ${line}효 효사`;
    interpretation = `【단변(單變)】 ${line}효 하나만 변하니, 본괘 ${original.name}괘의 ${line}효 효사가 핵심입니다.\n\n`;
    if (yaoInfo) {
      interpretation += `${line}효사: "${yaoInfo.text}"\n`;
      interpretation += `해석: ${yaoInfo.meaning}\n\n`;
    }
    interpretation += `${original.name}괘(${original.keyword}) → ${target.name}괘(${target.keyword})로 변화합니다.`;
  } else if (lineCount === 2) {
    // 2개 변효: 두 변효 중 위에 있는 효(숫자가 큰 효)의 효사를 중심으로 본다
    const sortedLines = [...changingLines].sort((a, b) => a - b);
    const upperLine = sortedLines[sortedLines.length - 1]; // 위 효 (숫자가 큰 것)
    const lowerLine = sortedLines[0]; // 아래 효
    const upperYaoInfo = original.yaoWisdom.find(y => y.position === upperLine);
    const lowerYaoInfo = original.yaoWisdom.find(y => y.position === lowerLine);
    primaryFocus = `본괘 ${upperLine}효 효사 (위 효 중심)`;

    interpretation = `【이변(二變)】 ${sortedLines.join(', ')}효가 변합니다. 위 효인 ${upperLine}효의 효사를 중심으로 보세요.\n\n`;
    if (upperYaoInfo) {
      interpretation += `▶ ${upperLine}효사 (주): "${upperYaoInfo.text}" - ${upperYaoInfo.meaning}\n`;
    }
    if (lowerYaoInfo) {
      interpretation += `▷ ${lowerLine}효사 (참고): "${lowerYaoInfo.text}" - ${lowerYaoInfo.meaning}\n`;
    }
  } else if (lineCount === 3) {
    // 3개 변효: 본괘와 지괘의 괘사를 모두 보되, 본괘 괘사를 중심으로 해석
    primaryFocus = '본괘 괘사 중심, 지괘 괘사 참고';
    interpretation = `【삼변(三變)】 ${changingLines.sort((a,b) => a-b).join(', ')}효가 변합니다. 본괘와 지괘의 괘사를 함께 보되, 본괘 괘사가 중심입니다.\n\n`;
    interpretation += `▶ 본괘 ${original.name}괘(${original.chinese}) 괘사 (주):\n`;
    interpretation += `   "${original.gwaeSa}" - ${original.meaning}\n\n`;
    interpretation += `▷ 지괘 ${target.name}괘(${target.chinese}) 괘사 (참고):\n`;
    interpretation += `   "${target.gwaeSa}" - ${target.meaning}`;
  } else if (lineCount === 4) {
    // 4개 변효: 변하지 않는 두 효 중 아래 효(숫자가 작은 효)의 지괘 효사를 본다
    const unchangedLines = [1, 2, 3, 4, 5, 6].filter(n => !changingLines.includes(n));
    const sortedUnchanged = unchangedLines.sort((a, b) => a - b);
    const lowerUnchangedLine = sortedUnchanged[0]; // 아래 효
    const targetYaoInfo = target.yaoWisdom.find(y => y.position === lowerUnchangedLine);
    primaryFocus = `지괘 ${lowerUnchangedLine}효 효사 (불변 하효)`;

    interpretation = `【사변(四變)】 ${changingLines.sort((a,b) => a-b).join(', ')}효가 변합니다. 변하지 않는 ${sortedUnchanged.join(', ')}효 중 아래 효인 ${lowerUnchangedLine}효의 지괘 효사를 보세요.\n\n`;
    interpretation += `불변효: ${sortedUnchanged.join(', ')}효\n`;
    if (targetYaoInfo) {
      interpretation += `▶ 지괘 ${target.name}괘 ${lowerUnchangedLine}효사: "${targetYaoInfo.text}" - ${targetYaoInfo.meaning}`;
    } else {
      interpretation += `▶ 지괘 ${target.name}괘의 ${lowerUnchangedLine}효가 핵심입니다.`;
    }
  } else if (lineCount === 5) {
    // 5개 변효: 변하지 않는 한 효의 지괘 효사를 본다
    const unchangedLine = [1, 2, 3, 4, 5, 6].find(n => !changingLines.includes(n))!;
    const targetYaoInfo = target.yaoWisdom.find(y => y.position === unchangedLine);
    primaryFocus = `지괘 ${unchangedLine}효 효사 (유일 불변효)`;

    interpretation = `【오변(五變)】 ${unchangedLine}효만 변하지 않습니다. 이 불변효의 지괘 효사가 핵심입니다.\n\n`;
    interpretation += `유일 불변효: ${unchangedLine}효\n`;
    if (targetYaoInfo) {
      interpretation += `▶ 지괘 ${target.name}괘 ${unchangedLine}효사: "${targetYaoInfo.text}" - ${targetYaoInfo.meaning}`;
    } else {
      interpretation += `▶ 지괘 ${target.name}괘의 ${unchangedLine}효가 유일한 해석 기준입니다.`;
    }
  } else if (lineCount === 6) {
    // 6개 변효 (전효변): 지괘의 괘사를 본다
    // 특수 케이스: 건→곤은 용구(用九), 곤→건은 용육(用六)
    primaryFocus = '지괘 괘사';

    if (originalHex === 1 && targetHex === 2) {
      // 건괘 → 곤괘: 용구(用九)
      interpretation = `【전효변 - 용구(用九)】 건괘의 6효가 모두 변하여 곤괘가 됩니다.\n\n`;
      interpretation += `용구(用九): "見群龍無首 吉" (견군룡무수 길)\n`;
      interpretation += `해석: 여러 용이 나타나되 우두머리가 없으니 길하다.\n\n`;
      interpretation += `의미: 강건함이 극에 달하여 유순함으로 변합니다. 리더십을 내려놓고 겸손히 물러나면 길합니다. 모든 것이 각자의 역할을 하며 조화를 이룹니다.`;
    } else if (originalHex === 2 && targetHex === 1) {
      // 곤괘 → 건괘: 용육(用六)
      interpretation = `【전효변 - 용육(用六)】 곤괘의 6효가 모두 변하여 건괘가 됩니다.\n\n`;
      interpretation += `용육(用六): "利永貞" (이영정)\n`;
      interpretation += `해석: 영원히 바르게 함이 이롭다.\n\n`;
      interpretation += `의미: 유순함이 극에 달하여 강건함으로 변합니다. 끝까지 바른 도를 지키면 길합니다. 수용과 인내가 결국 큰 힘이 됩니다.`;
    } else {
      // 일반 전효변: 지괘의 괘사를 본다
      interpretation = `【전효변(全爻變)】 6효가 모두 변하여 ${original.name}괘가 완전히 ${target.name}괘로 바뀝니다.\n\n`;
      interpretation += `지괘 ${target.name}괘(${target.chinese})의 괘사를 보세요:\n`;
      interpretation += `괘사: "${target.gwaeSa}"\n`;
      interpretation += `의미: ${target.meaning}\n\n`;
      interpretation += `핵심: ${target.coreWisdom}`;
    }
  }

  // 변효가 있는 경우 위치별 의미 추가 (0, 6효 전변 제외)
  if (lineCount > 0 && lineCount < 6) {
    const positionInsights = changingLines.sort((a, b) => a - b).map(line => {
      const pos = YAO_POSITION_MEANINGS[line];
      return `${line}효(${pos.general})`;
    }).join(' → ');

    interpretation += `\n\n【변화의 흐름】 ${positionInsights}`;
    interpretation += `\n【해석 초점】 ${primaryFocus}`;
  }

  return interpretation;
}

// 일일 지혜 메시지 생성
export function generateDailyWisdom(hexagramNumber: number, date: Date, locale: Locale = 'ko'): string {
  const wisdom = getHexagramWisdom(hexagramNumber, locale);
  if (!wisdom) {return '';}

  const dayOfWeek = date.getDay();
  const dayNames = twArray(locale, 'dayNames');

  // 요일별 테마
  const dayThemes: Record<number, keyof SituationAdvice> = {
    0: 'spiritual',
    1: 'career',
    2: 'career',
    3: 'health',
    4: 'wealth',
    5: 'relationship',
    6: 'spiritual'
  };

  const theme = dayThemes[dayOfWeek];
  const advice = wisdom.situationAdvice[theme];
  const dayName = dayNames[dayOfWeek] || '';

  return `📿 ${tw(locale, 'dailyWisdomTitle', { day: dayName })}

【${wisdom.name}괘 ${wisdom.chinese}】
${wisdom.keyword}

✨ ${tw(locale, 'dailyCore')}: ${wisdom.coreWisdom}

📌 ${tw(locale, 'dailyAdvice', { theme })}:
${advice}

⚠️ ${tw(locale, 'dailyWarning')}: ${wisdom.warnings[0] || ''}
🌟 ${tw(locale, 'dailyOpportunity')}: ${wisdom.opportunities[0] || ''}
`;
}

// 괘 간 관계 지혜 분석
export function analyzeHexagramRelationshipWisdom(
  hex1: number,
  hex2: number,
  locale: Locale = 'ko'
): { compatibility: string; advice: string; synergy: string[] } {
  const wisdom1 = getHexagramWisdom(hex1, locale);
  const wisdom2 = getHexagramWisdom(hex2, locale);

  if (!wisdom1 || !wisdom2) {
    return { compatibility: tw(locale, 'cannotAnalyze'), advice: '', synergy: [] };
  }

  let compatibility = '';
  let advice = '';
  const synergy: string[] = [];

  // 간단한 상성 분석
  if (wisdom1.element === wisdom2.element) {
    compatibility = tw(locale, 'compatibilitySame');
    advice = tw(locale, 'adviceSameElement');
  } else if (
    (wisdom1.element.includes('천') && wisdom2.element.includes('지')) ||
    (wisdom1.element.includes('지') && wisdom2.element.includes('천'))
  ) {
    compatibility = tw(locale, 'compatibilityComplementary');
    advice = tw(locale, 'adviceComplementary');
    synergy.push(tw(locale, 'synergyCreative'), tw(locale, 'synergyBalanced'));
  } else {
    compatibility = tw(locale, 'compatibilityDiverse');
    advice = tw(locale, 'adviceDiverse');
  }

  // 키워드 시너지
  synergy.push(
    tw(locale, 'synergyKeywordCombination', { kw1: wisdom1.keyword, kw2: wisdom2.keyword }),
    ...wisdom1.opportunities.filter(o => wisdom2.opportunities.includes(o))
  );

  return { compatibility, advice, synergy };
}

// 연간/월간 운세 지혜
export function generatePeriodicWisdom(
  hexagramNumber: number,
  period: 'yearly' | 'monthly' | 'weekly',
  periodNumber: number,
  locale: Locale = 'ko'
): string {
  const wisdom = getHexagramWisdom(hexagramNumber, locale);
  if (!wisdom) {return '';}

  const periodKeyMap = {
    yearly: 'periodYear',
    monthly: 'periodMonth',
    weekly: 'periodWeek'
  } as const;
  const periodLabel = tw(locale, periodKeyMap[period], { num: periodNumber });

  let focusArea: keyof SituationAdvice;

  if (period === 'yearly') {
    focusArea = 'career';
  } else if (period === 'monthly') {
    const monthThemes: (keyof SituationAdvice)[] = [
      'spiritual', 'career', 'health', 'relationship', 'wealth',
      'spiritual', 'career', 'health', 'relationship', 'wealth',
      'spiritual', 'career'
    ];
    focusArea = monthThemes[periodNumber % 12];
  } else {
    focusArea = ['career', 'relationship', 'health', 'spiritual'][periodNumber % 4] as keyof SituationAdvice;
  }

  const title = tw(locale, 'fortuneTitle', { period: periodLabel, name: wisdom.name, chinese: wisdom.chinese });

  return `## ${title}

### ${tw(locale, 'periodCoreMessage')}
${wisdom.coreWisdom}

### ${tw(locale, 'periodFortune', { area: focusArea })}
${wisdom.situationAdvice[focusArea]}

### ${tw(locale, 'periodOpportunities')}
${wisdom.opportunities.map(o => `• ${o}`).join('\n')}

### ${tw(locale, 'periodCautions')}
${wisdom.warnings.map(w => `• ${w}`).join('\n')}

### ${tw(locale, 'periodActionAdvice')}
${tw(locale, 'periodActionTemplate', { keyword: wisdom.keyword, area: focusArea })}
`;
}

// 심층 괘 분석 지혜
export function deepWisdomAnalysis(
  hexagramNumber: number,
  userProfile?: { birthYear?: number; gender?: 'M' | 'F' },
  locale: Locale = 'ko'
): {
  personalizedAdvice: string;
  lifeLessson: string;
  actionPlan: string[];
} {
  const wisdom = getHexagramWisdom(hexagramNumber, locale);
  if (!wisdom) {
    return {
      personalizedAdvice: tw(locale, 'noHexagramInfo'),
      lifeLessson: '',
      actionPlan: []
    };
  }

  let personalizedAdvice = wisdom.coreWisdom;

  // 성별에 따른 조언 조정 (전통적 맥락에서)
  if (userProfile?.gender === 'M') {
    personalizedAdvice += tw(locale, 'genderMale');
  } else if (userProfile?.gender === 'F') {
    personalizedAdvice += tw(locale, 'genderFemale');
  }

  // 생년에 따른 조언 (12지지 기준 간략화)
  if (userProfile?.birthYear) {
    const yearBranch = (userProfile.birthYear - 4) % 12;
    personalizedAdvice += ` ${tw(locale, `branchAdvice${yearBranch}`)}`;
  }

  const lifeLessson = tw(locale, 'lifeLessonTemplate', {
    name: wisdom.name,
    keyword: wisdom.keyword,
    warning: wisdom.warnings[0] || '',
    opportunity: wisdom.opportunities[0] || ''
  });

  const actionPlan = [
    tw(locale, 'actionStep1', { text: wisdom.coreWisdom.split('.')[0] }),
    tw(locale, 'actionStep2', { text: wisdom.situationAdvice.career }),
    tw(locale, 'actionStep3', { text: wisdom.situationAdvice.spiritual }),
    tw(locale, 'actionFinal', { keyword: wisdom.keyword })
  ];

  return { personalizedAdvice, lifeLessson, actionPlan };
}
