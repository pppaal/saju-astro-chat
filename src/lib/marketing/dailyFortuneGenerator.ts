// src/lib/marketing/dailyFortuneGenerator.ts
// Daily 운세 자동 생성 엔진 - 바이럴 마케팅용

/**
 * 12별자리 타입
 */
export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

/**
 * 12띠 타입
 */
export type ChineseZodiac =
  | 'rat' | 'ox' | 'tiger' | 'rabbit'
  | 'dragon' | 'snake' | 'horse' | 'goat'
  | 'monkey' | 'rooster' | 'dog' | 'pig';

/**
 * 운세 카테고리별 점수
 */
export interface FortuneScores {
  love: number;
  career: number;
  wealth: number;
  health: number;
  overall: number;
}

/**
 * Daily 운세 결과
 */
export interface DailyFortune {
  date: string;
  sign: string;
  signKo: string;
  emoji: string;
  scores: FortuneScores;
  luckyColor: string;
  luckyNumber: number;
  luckyItem: string;
  message: string;
  advice: string;
  hashtags: string[];
}

/**
 * 별자리 정보 맵
 */
const ZODIAC_INFO: Record<ZodiacSign, { ko: string; emoji: string; element: string; dateRange: string }> = {
  aries: { ko: '양자리', emoji: '♈', element: '불', dateRange: '3/21~4/19' },
  taurus: { ko: '황소자리', emoji: '♉', element: '흙', dateRange: '4/20~5/20' },
  gemini: { ko: '쌍둥이자리', emoji: '♊', element: '공기', dateRange: '5/21~6/21' },
  cancer: { ko: '게자리', emoji: '♋', element: '물', dateRange: '6/22~7/22' },
  leo: { ko: '사자자리', emoji: '♌', element: '불', dateRange: '7/23~8/22' },
  virgo: { ko: '처녀자리', emoji: '♍', element: '흙', dateRange: '8/23~9/22' },
  libra: { ko: '천칭자리', emoji: '♎', element: '공기', dateRange: '9/23~10/23' },
  scorpio: { ko: '전갈자리', emoji: '♏', element: '물', dateRange: '10/24~11/22' },
  sagittarius: { ko: '궁수자리', emoji: '♐', element: '불', dateRange: '11/23~12/21' },
  capricorn: { ko: '염소자리', emoji: '♑', element: '흙', dateRange: '12/22~1/19' },
  aquarius: { ko: '물병자리', emoji: '♒', element: '공기', dateRange: '1/20~2/18' },
  pisces: { ko: '물고기자리', emoji: '♓', element: '물', dateRange: '2/19~3/20' },
};

/**
 * 행운의 색상 풀
 */
const LUCKY_COLORS = [
  '빨강', '주황', '노랑', '연두', '초록', '청록',
  '파랑', '남색', '보라', '자주', '분홍', '흰색',
  '검정', '은색', '금색', '베이지', '민트', '라벤더',
];

/**
 * 행운의 아이템 풀
 */
const LUCKY_ITEMS = [
  '반지', '목걸이', '팔찌', '시계', '가방', '스카프',
  '모자', '향수', '립스틱', '선글라스', '핸드폰', '이어폰',
  '노트', '펜', '책', '열쇠고리', '우산', '텀블러',
];

/**
 * 운세 메시지 템플릿
 */
const FORTUNE_MESSAGES = {
  excellent: [
    '오늘은 당신의 별이 가장 밝게 빛나는 날입니다! ✨',
    '행운이 당신 편입니다. 과감하게 도전하세요! 🌟',
    '우주의 에너지가 당신을 응원합니다! 🌈',
    '오늘은 기적 같은 일이 일어날 수 있어요! 💫',
  ],
  good: [
    '긍정적인 에너지가 흐르는 하루입니다! 😊',
    '차근차근 나아가면 좋은 결과가 있을 거예요! 🌸',
    '작은 행운들이 당신을 기다리고 있어요! 🍀',
    '오늘의 노력이 내일의 성공을 만듭니다! 💪',
  ],
  normal: [
    '평온한 하루가 될 것입니다. 여유를 가지세요 ☕',
    '오늘은 쉬어가는 것도 좋은 전략입니다! 🌙',
    '주변 사람들과의 소통이 중요한 날이에요! 💬',
    '안정적인 하루, 감사한 마음으로 보내세요! 🙏',
  ],
  caution: [
    '신중한 선택이 필요한 날입니다. 천천히! 🐢',
    '급하게 서두르지 말고 차분하게 대처하세요! ⏳',
    '오늘은 계획을 다시 점검하는 시간을 가지세요! 📋',
    '작은 실수를 조심하세요. 꼼꼼함이 필요해요! 🔍',
  ],
};

/**
 * 조언 템플릿
 */
const ADVICE_TEMPLATES = {
  love: [
    '사랑하는 사람에게 진심을 전하세요 ❤️',
    '감정 표현을 더 자유롭게 해보세요 💝',
    '듣는 것이 말하는 것보다 중요할 수 있어요 👂',
    '작은 선물이 큰 기쁨을 줄 수 있어요 🎁',
  ],
  career: [
    '오늘의 작은 노력이 큰 성과로 이어질 거예요 📈',
    '새로운 아이디어를 적극적으로 제안해보세요 💡',
    '동료와의 협력이 성공의 열쇠입니다 🤝',
    '완벽보다는 실행이 중요한 날입니다 🚀',
  ],
  wealth: [
    '계획적인 소비가 중요한 날입니다 💰',
    '작은 절약이 큰 재산을 만듭니다 🐷',
    '투자 기회를 신중하게 검토하세요 📊',
    '재무 계획을 다시 점검해보세요 📝',
  ],
  health: [
    '충분한 휴식이 최고의 보약입니다 😴',
    '가벼운 운동으로 활력을 되찾으세요 🏃',
    '수분 섭취를 충분히 하세요 💧',
    '스트레칭으로 몸의 긴장을 풀어주세요 🧘',
  ],
};

/**
 * 해시태그 생성
 */
function generateHashtags(sign: ZodiacSign, scores: FortuneScores): string[] {
  const signKo = ZODIAC_INFO[sign].ko;
  const hashtags = [
    '#운세',
    '#오늘의운세',
    `#${signKo}`,
    `#${signKo}운세`,
    '#별자리운세',
    '#데일리운세',
  ];

  // 점수에 따라 해시태그 추가
  if (scores.overall >= 80) {
    hashtags.push('#대길', '#럭키데이', '#행운');
  } else if (scores.overall >= 60) {
    hashtags.push('#좋은날', '#긍정에너지');
  }

  if (scores.love >= 80) {
    hashtags.push('#연애운', '#사랑운');
  }
  if (scores.career >= 80) {
    hashtags.push('#업무운', '#성공운');
  }
  if (scores.wealth >= 80) {
    hashtags.push('#재물운', '#금전운');
  }

  return hashtags.slice(0, 10);
}

/**
 * 날짜 기반 시드값 생성 (매일 다른 운세)
 */
function getDateSeed(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * 시드 기반 랜덤 생성기
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * 별자리별 Daily 운세 생성
 */
export async function generateDailyFortuneForSign(
  sign: ZodiacSign,
  date: Date = new Date()
): Promise<DailyFortune> {
  const info = ZODIAC_INFO[sign];
  const dateSeed = getDateSeed(date);
  const signIndex = Object.keys(ZODIAC_INFO).indexOf(sign);
  const seed = dateSeed + signIndex * 7; // 별자리마다 다른 시드

  // 점수 생성 (40~95 범위, 날짜별로 고정)
  const baseScore = 40 + seededRandom(seed) * 55;
  const scores: FortuneScores = {
    love: Math.round(40 + seededRandom(seed + 1) * 55),
    career: Math.round(40 + seededRandom(seed + 2) * 55),
    wealth: Math.round(40 + seededRandom(seed + 3) * 55),
    health: Math.round(40 + seededRandom(seed + 4) * 55),
    overall: Math.round(baseScore),
  };

  // 행운 요소
  const luckyColorIndex = Math.floor(seededRandom(seed + 5) * LUCKY_COLORS.length);
  const luckyNumber = Math.floor(seededRandom(seed + 6) * 99) + 1;
  const luckyItemIndex = Math.floor(seededRandom(seed + 7) * LUCKY_ITEMS.length);

  // 메시지 선택
  let messageCategory: keyof typeof FORTUNE_MESSAGES;
  if (scores.overall >= 80) messageCategory = 'excellent';
  else if (scores.overall >= 65) messageCategory = 'good';
  else if (scores.overall >= 50) messageCategory = 'normal';
  else messageCategory = 'caution';

  const messageIndex = Math.floor(seededRandom(seed + 8) * FORTUNE_MESSAGES[messageCategory].length);
  const message = FORTUNE_MESSAGES[messageCategory][messageIndex];

  // 조언 선택 (가장 높은 카테고리 기준)
  type CategoryKey = 'career' | 'love' | 'wealth' | 'health';
  const categories: CategoryKey[] = ['career', 'love', 'wealth', 'health'];
  const maxCategory = categories.reduce((max, key) =>
    scores[key] > scores[max] ? key : max
  , 'love' as CategoryKey);

  const adviceIndex = Math.floor(seededRandom(seed + 9) * ADVICE_TEMPLATES[maxCategory].length);
  const advice = ADVICE_TEMPLATES[maxCategory][adviceIndex];

  // 해시태그 생성
  const hashtags = generateHashtags(sign, scores);

  return {
    date: date.toISOString().split('T')[0],
    sign,
    signKo: info.ko,
    emoji: info.emoji,
    scores,
    luckyColor: LUCKY_COLORS[luckyColorIndex],
    luckyNumber,
    luckyItem: LUCKY_ITEMS[luckyItemIndex],
    message,
    advice,
    hashtags,
  };
}

/**
 * 모든 별자리 운세 생성
 */
export async function generateAllDailyFortunes(
  date: Date = new Date()
): Promise<DailyFortune[]> {
  const signs: ZodiacSign[] = [
    'aries', 'taurus', 'gemini', 'cancer',
    'leo', 'virgo', 'libra', 'scorpio',
    'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];

  const fortunes = await Promise.all(
    signs.map(sign => generateDailyFortuneForSign(sign, date))
  );

  return fortunes;
}

/**
 * 공유용 텍스트 생성
 */
export function generateShareText(fortune: DailyFortune): string {
  return `${fortune.emoji} ${fortune.signKo} 오늘의 운세 (${fortune.date})

⭐ 종합: ${fortune.scores.overall}점
❤️ 연애: ${fortune.scores.love}점
💼 업무: ${fortune.scores.career}점
💰 재물: ${fortune.scores.wealth}점
💪 건강: ${fortune.scores.health}점

🍀 행운의 색: ${fortune.luckyColor}
🎲 행운의 숫자: ${fortune.luckyNumber}
🎁 행운의 아이템: ${fortune.luckyItem}

${fortune.message}

${fortune.hashtags.join(' ')}

📱 DestinyPal에서 더 자세한 운세를 확인하세요!
https://destinypal.com`;
}
