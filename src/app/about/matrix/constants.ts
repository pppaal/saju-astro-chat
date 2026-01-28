export interface LayerCard {
  layer: number;
  icon: string;
  title: string;
  titleEn: string;
  eastIcon: string;
  westIcon: string;
  eastLabel: string;
  westLabel: string;
  cells: number;
  color: string;
  description: string;
}

export interface PersonalInsight {
  layer: number;
  matchedCells: number;
  score: number;
  level: 'extreme' | 'amplify' | 'balance' | 'clash' | 'conflict';
  highlights: string[];
}

export interface MatrixResult {
  success: boolean;
  summary: {
    totalScore: number;
    layersProcessed: number;
    cellsMatched: number;
    strengthCount: number;
    cautionCount: number;
  };
  highlights: {
    strengths: Array<{ layer: number; keyword: string; score: number }>;
    cautions: Array<{ layer: number; keyword: string; score: number }>;
  };
  synergies?: Array<{ layers: number[]; description: string }>;
}

export const LAYERS: LayerCard[] = [
  {
    layer: 1,
    icon: '🔥',
    title: '기운핵심격자',
    titleEn: 'Element Core Grid',
    eastIcon: '☯️',
    westIcon: '🜂',
    eastLabel: '오행 (목화토금수)',
    westLabel: '4원소 (불흙공기물)',
    cells: 20,
    color: '#ef4444',
    description: '동양의 다섯 가지 기운과 서양의 네 원소가 만나 기본 에너지 조화를 형성합니다.',
  },
  {
    layer: 2,
    icon: '⚡',
    title: '십신-행성 매트릭스',
    titleEn: 'Sibsin-Planet Matrix',
    eastIcon: '👤',
    westIcon: '🪐',
    eastLabel: '십신 (비견~정관)',
    westLabel: '10행성',
    cells: 100,
    color: '#f59e0b',
    description: '사주의 십신이 점성술의 행성과 만나 성격과 재능의 시너지를 발견합니다.',
  },
  {
    layer: 3,
    icon: '🏠',
    title: '십신-하우스 매트릭스',
    titleEn: 'Sibsin-House Matrix',
    eastIcon: '👤',
    westIcon: '🏛️',
    eastLabel: '십신',
    westLabel: '12하우스',
    cells: 120,
    color: '#84cc16',
    description: '십신의 에너지가 삶의 12영역(하우스)에서 어떻게 발현되는지 매핑합니다.',
  },
  {
    layer: 4,
    icon: '⏰',
    title: '타이밍 오버레이',
    titleEn: 'Timing Overlay',
    eastIcon: '📅',
    westIcon: '🔄',
    eastLabel: '대운/세운/월운',
    westLabel: '트랜짓/역행',
    cells: 108,
    color: '#06b6d4',
    description: '동서양의 시간 주기가 교차하며 최적의 타이밍과 주의 시점을 알려줍니다.',
  },
  {
    layer: 5,
    icon: '🔗',
    title: '형충회합-애스펙트',
    titleEn: 'Relation-Aspect Matrix',
    eastIcon: '⚔️',
    westIcon: '📐',
    eastLabel: '삼합/육합/충/형',
    westLabel: '합/삼분/사분',
    cells: 72,
    color: '#8b5cf6',
    description: '지지 간의 관계와 행성 각도가 만나 숨겨진 패턴을 드러냅니다.',
  },
  {
    layer: 6,
    icon: '🌊',
    title: '십이운성-하우스',
    titleEn: 'TwelveStage-House Matrix',
    eastIcon: '🔄',
    westIcon: '🏛️',
    eastLabel: '장생~절',
    westLabel: '12하우스',
    cells: 144,
    color: '#ec4899',
    description: '생명 에너지의 12단계가 삶의 영역과 만나 활력의 흐름을 보여줍니다.',
  },
  {
    layer: 7,
    icon: '🎯',
    title: '고급분석 매트릭스',
    titleEn: 'Advanced Analysis',
    eastIcon: '👑',
    westIcon: '🌟',
    eastLabel: '격국/용신',
    westLabel: '프로그레션/리턴',
    cells: 144,
    color: '#6366f1',
    description: '사주의 핵심 구조(격국)와 점성술의 진행법이 깊은 통찰을 제공합니다.',
  },
  {
    layer: 8,
    icon: '✨',
    title: '신살-행성 매트릭스',
    titleEn: 'Shinsal-Planet Matrix',
    eastIcon: '🌠',
    westIcon: '🪐',
    eastLabel: '34개 신살',
    westLabel: '10행성',
    cells: 340,
    color: '#14b8a6',
    description: '천을귀인, 역마 등 특수한 기운이 행성과 공명하여 특별한 재능을 발견합니다.',
  },
  {
    layer: 9,
    icon: '☄️',
    title: '소행성-하우스',
    titleEn: 'Asteroid-House Matrix',
    eastIcon: '⚛️',
    westIcon: '🏛️',
    eastLabel: '4대 소행성',
    westLabel: '하우스/오행',
    cells: 68,
    color: '#f97316',
    description: '세레스, 팔라스, 주노, 베스타가 동양 체계와 만나 섬세한 뉘앙스를 더합니다.',
  },
  {
    layer: 10,
    icon: '🌙',
    title: '엑스트라포인트',
    titleEn: 'ExtraPoint Matrix',
    eastIcon: '🔮',
    westIcon: '🌑',
    eastLabel: '오행/십신',
    westLabel: 'Chiron/Lilith/Node',
    cells: 90,
    color: '#a855f7',
    description: '카이론, 릴리스, 노드 등 특수 포인트가 운명의 숨겨진 차원을 열어줍니다.',
  },
];

export const LEVEL_INFO = {
  extreme: { label: '극강 시너지', icon: '💥', color: '#9333ea' },
  amplify: { label: '증폭/강화', icon: '🚀', color: '#22c55e' },
  balance: { label: '균형/안정', icon: '⚖️', color: '#3b82f6' },
  clash: { label: '충돌/주의', icon: '⚡', color: '#eab308' },
  conflict: { label: '갈등/위험', icon: '❌', color: '#ef4444' },
};

export const DAY_MASTERS = ['목', '화', '토', '금', '수'] as const;

export const GEOKGUKS = [
  { value: 'jeonggwan', label: '정관격' },
  { value: 'pyungwan', label: '편관격' },
  { value: 'jeongin', label: '정인격' },
  { value: 'pyungin', label: '편인격' },
  { value: 'siksin', label: '식신격' },
  { value: 'sangwan', label: '상관격' },
  { value: 'jungje', label: '정재격' },
  { value: 'pyungje', label: '편재격' },
  { value: 'geonyuk', label: '건록격' },
  { value: 'yangin', label: '양인격' },
] as const;
