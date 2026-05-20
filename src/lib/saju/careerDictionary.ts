/**
 * Career Narrative Dictionary
 *
 * 직업 카테고리 18종 × 사주/점성 신호별 자연어 narrative.
 *
 * 목적
 * - LifeReport / Career 도메인이 사용자에게 깊고 구체적인
 *   직업 narrative 를 제공하도록 정적 사전을 보유.
 * - 사주 신호 (정관, 식상, 재성, 인성 등) + 점성 신호 (MC, Saturn,
 *   Mercury, Uranus 배치 등) 으로 카테고리를 매칭.
 *
 * 톤
 * - LifeReport 11차 자연화 톤. 전문용어 제거, 한국어 어미는
 *   "~편이에요 / ~사람이에요 / ~한 일이에요" 계열.
 * - 영어는 자연스러운 일상 영어.
 *
 * 결정론
 * - 정적 데이터. 외부 의존 없음.
 */

export type CareerCategory =
  // A. 전통적 권위 (정관/편관 강)
  | '공무원'
  | '법조계'
  | '군경소방'
  | '의료'
  // B. 창의적 표현 (식상 강)
  | '작가'
  | '디자이너'
  | '예술가'
  | '미디어'
  // C. 사업·재물 (재성 강)
  | '사업'
  | '금융'
  | '부동산'
  | '세일즈마케팅'
  // D. 지식·교육 (인성 강)
  | '교육'
  | '연구학자'
  | '상담심리'
  // E. 기술·혁신 (외행성 강)
  | 'IT엔지니어'
  | '과학자'
  | 'NGO'

export interface CareerEntry {
  category: CareerCategory
  name: string
  name_en: string
  emoji: string

  // 적합 신호
  sajuSignals: string[]
  astroSignals: string[]

  // narrative
  ko: string
  en: string

  // 일상 가이드
  strengths_ko: [string, string, string]
  strengths_en: [string, string, string]
  challenges_ko: [string, string, string]
  challenges_en: [string, string, string]

  // 추천 일상 패턴
  advice_ko: string
  advice_en: string
}

export const CAREER_DICTIONARY: CareerEntry[] = [
  // ──────────────────────────────────────────────
  // A. 전통적 권위 (정관/편관 강)
  // ──────────────────────────────────────────────
  {
    category: '공무원',
    name: '공무원·관료',
    name_en: 'Civil Servant',
    emoji: '🏛',
    sajuSignals: ['정관 강', '정인 받침', '편관격', '관성 대운'],
    astroSignals: ['MC in Capricorn', 'Saturn in 10th', 'Sun in 10th'],
    ko: '안정된 자리에서 책임감 있게 일하시는 편이에요. 정통적인 경로와 정해진 룰이 잘 맞고, 신뢰가 핵심 자산이에요.',
    en: 'You work best in established positions with clear rules. The traditional path suits you, and trust is your core asset.',
    strengths_ko: ['신뢰감', '꾸준함', '책임감'],
    strengths_en: ['trustworthiness', 'consistency', 'responsibility'],
    challenges_ko: ['혁신 부족', '느린 변화', '관료주의 피로'],
    challenges_en: ['lack of innovation', 'slow change', 'bureaucratic fatigue'],
    advice_ko: '정통 경로 안에서 자기만의 색을 천천히 키워가세요.',
    advice_en: 'Cultivate your own color slowly within the traditional path.',
  },
  {
    category: '법조계',
    name: '법조계·변호사',
    name_en: 'Legal Professional',
    emoji: '⚖️',
    sajuSignals: ['정관 강', '편관 강', '인성 받침', '금기 강'],
    astroSignals: ['Mercury–Saturn aspect', 'Libra emphasis', 'MC in Sagittarius'],
    ko: '논리와 원칙으로 사람과 사람 사이를 정리해 주시는 편이에요. 옳고 그름을 또렷이 가리는 일에서 힘이 나오고, 말과 글이 무기가 돼요.',
    en: 'You sort out conflicts between people through logic and principle. You draw strength from telling right from wrong, and words become your weapon.',
    strengths_ko: ['논리력', '말솜씨', '원칙'],
    strengths_en: ['logic', 'eloquence', 'principle'],
    challenges_ko: ['감정 소모', '긴 시간', '대립 피로'],
    challenges_en: ['emotional drain', 'long hours', 'conflict fatigue'],
    advice_ko: '하루 끝에는 논리 모드를 끄고 마음을 풀어주는 시간을 꼭 가지세요.',
    advice_en: 'At the end of each day, switch off logic mode and let your heart rest.',
  },
  {
    category: '군경소방',
    name: '군경·소방',
    name_en: 'Military / Police / Fire Service',
    emoji: '🚓',
    sajuSignals: ['편관 강', '양인', '식상 받침', '금/화 강'],
    astroSignals: ['Mars–MC aspect', 'Aries emphasis', 'Scorpio Sun'],
    ko: '위기 앞에서 도리어 또렷해지는 분이에요. 강한 추진력과 책임감으로 사람을 지키는 일이 잘 맞고, 행동이 곧 언어예요.',
    en: 'Crisis sharpens you instead of breaking you. Strong drive and responsibility for protecting others suit you, and action is your language.',
    strengths_ko: ['용기', '결단력', '체력'],
    strengths_en: ['courage', 'decisiveness', 'stamina'],
    challenges_ko: ['스트레스', '위험 노출', '소진'],
    challenges_en: ['stress', 'exposure to danger', 'burnout'],
    advice_ko: '몸과 마음을 회복시키는 일상 루틴을 직업처럼 챙기세요.',
    advice_en: 'Treat your body and mind recovery routine as seriously as your job.',
  },
  {
    category: '의료',
    name: '의사·치과의사',
    name_en: 'Doctor / Dentist',
    emoji: '🩺',
    sajuSignals: ['편인 강', '정인 강', '식신 받침', '관성 안정'],
    astroSignals: ['Virgo emphasis', 'Chiron–Sun aspect', 'Saturn in 6th'],
    ko: '정밀하고 책임감 있게 사람을 돌보시는 편이에요. 깊은 공부와 손끝의 정확함이 한 사람의 인생을 바꾸는 일이에요.',
    en: 'You care for people with precision and responsibility. Deep study and the accuracy of your hands can change a person’s life.',
    strengths_ko: ['정밀함', '인내', '책임감'],
    strengths_en: ['precision', 'patience', 'responsibility'],
    challenges_ko: ['긴 수련', '감정 소진', '책임 무게'],
    challenges_en: ['long training', 'emotional burnout', 'weight of responsibility'],
    advice_ko: '환자를 돌보듯 자신의 몸과 마음도 정기 점검하세요.',
    advice_en: 'Run regular check-ups on your own body and mind, just as you would for a patient.',
  },

  // ──────────────────────────────────────────────
  // B. 창의적 표현 (식상 강)
  // ──────────────────────────────────────────────
  {
    category: '작가',
    name: '작가·시인',
    name_en: 'Writer / Poet',
    emoji: '✍️',
    sajuSignals: ['상관 강', '식신 강', '인성 받침', '수기 강'],
    astroSignals: ['Mercury in 3rd/9th', 'Neptune–Mercury aspect', 'Pisces emphasis'],
    ko: '안에 쌓인 이야기를 글로 풀어내시는 편이에요. 조용한 시간이 곧 일이 되고, 한 줄의 문장이 사람의 마음을 움직여요.',
    en: 'You pour your inner stories into writing. Quiet time itself becomes your work, and a single line can move someone’s heart.',
    strengths_ko: ['표현력', '감수성', '관찰력'],
    strengths_en: ['expression', 'sensitivity', 'observation'],
    challenges_ko: ['수입 변동', '고립감', '자기 의심'],
    challenges_en: ['unstable income', 'isolation', 'self-doubt'],
    advice_ko: '쓰는 시간과 보여주는 시간을 의식적으로 나눠 가지세요.',
    advice_en: 'Consciously separate writing time from sharing time.',
  },
  {
    category: '디자이너',
    name: '디자이너·아티스트',
    name_en: 'Designer / Visual Artist',
    emoji: '🎨',
    sajuSignals: ['상관 강', '식신 강', '재성 받침', '화기 강'],
    astroSignals: ['Venus in 5th', 'Libra/Taurus emphasis', 'Venus–MC aspect'],
    ko: '눈으로 보는 세계를 새롭게 만들어 주시는 분이에요. 색과 모양에 민감하고, 일상의 작은 결을 발견하는 일이 본업이에요.',
    en: 'You re-make the visual world. You’re sensitive to color and form, and noticing the small textures of daily life is your real job.',
    strengths_ko: ['미감', '창의력', '디테일'],
    strengths_en: ['aesthetic sense', 'creativity', 'attention to detail'],
    challenges_ko: ['클라이언트 피드백', '완벽주의', '수입 변동'],
    challenges_en: ['client feedback', 'perfectionism', 'unstable income'],
    advice_ko: '완성된 작품과 자신을 동일시하지 말고, 다음 작업을 위한 여유를 남기세요.',
    advice_en: 'Don’t merge yourself with a finished piece — leave room for the next one.',
  },
  {
    category: '예술가',
    name: '음악·예술가',
    name_en: 'Musician / Performer',
    emoji: '🎵',
    sajuSignals: ['상관격', '식신 강', '도화', '화기 강'],
    astroSignals: ['Venus–Neptune aspect', 'Leo emphasis', 'Sun–Moon trine'],
    ko: '감정을 소리와 몸짓으로 옮기시는 분이에요. 무대 위 빛이 잘 어울리고, 사람의 마음을 흔드는 일에서 자기 자신을 발견하세요.',
    en: 'You translate feeling into sound and movement. The stage light suits you, and you find yourself by moving others.',
    strengths_ko: ['표현력', '카리스마', '감정 깊이'],
    strengths_en: ['expression', 'charisma', 'emotional depth'],
    challenges_ko: ['감정 기복', '무대 압박', '경쟁'],
    challenges_en: ['mood swings', 'stage pressure', 'competition'],
    advice_ko: '무대 위 자아와 일상의 자아를 모두 소중히 돌보세요.',
    advice_en: 'Care for both your on-stage self and your everyday self.',
  },
  {
    category: '미디어',
    name: '영상·미디어 제작자',
    name_en: 'Film / Media Creator',
    emoji: '🎬',
    sajuSignals: ['상관 강', '식상 혼잡', '재성 받침', '편인'],
    astroSignals: ['Mercury–Neptune aspect', 'Gemini emphasis', 'Uranus in 3rd'],
    ko: '여러 사람을 모아 이야기 한 편을 빚어내시는 분이에요. 기획부터 결과까지 흐름을 보는 눈이 좋고, 트렌드를 빨리 읽으세요.',
    en: 'You gather people to shape a single story. You see the flow from concept to result, and you read trends quickly.',
    strengths_ko: ['기획력', '협업', '트렌드 감각'],
    strengths_en: ['planning', 'collaboration', 'trend sense'],
    challenges_ko: ['긴 제작 기간', '예산 압박', '평가 변동'],
    challenges_en: ['long production cycles', 'budget pressure', 'fickle reception'],
    advice_ko: '한 프로젝트의 결과가 나오기 전에 다음 씨앗을 미리 심어두세요.',
    advice_en: 'Plant the next seed before the current project’s results come in.',
  },

  // ──────────────────────────────────────────────
  // C. 사업·재물 (재성 강)
  // ──────────────────────────────────────────────
  {
    category: '사업',
    name: '사업가·경영자',
    name_en: 'Founder / Executive',
    emoji: '💼',
    sajuSignals: ['편재 강', '정재 강', '식상 받침', '재성 대운'],
    astroSignals: ['Jupiter–MC aspect', 'Capricorn MC', 'Sun in 10th'],
    ko: '사람과 자원을 모아 새로운 흐름을 만드시는 분이에요. 위기 앞에서 판단이 빨라지고, 키워가는 재미에서 에너지가 와요.',
    en: 'You gather people and resources to create new flows. Crisis sharpens your judgment, and you draw energy from growing things.',
    strengths_ko: ['추진력', '판단력', '비전'],
    strengths_en: ['drive', 'judgment', 'vision'],
    challenges_ko: ['고독', '책임 무게', '사이클 변동'],
    challenges_en: ['loneliness', 'weight of responsibility', 'cycle swings'],
    advice_ko: '믿을 만한 동료와 멘토를 의식적으로 곁에 두세요.',
    advice_en: 'Deliberately keep trusted partners and mentors close.',
  },
  {
    category: '금융',
    name: '금융·투자가',
    name_en: 'Finance / Investor',
    emoji: '📈',
    sajuSignals: ['정재 강', '편재 강', '인성 안정', '금/수 흐름'],
    astroSignals: ['Jupiter in 2nd/8th', 'Saturn–Venus aspect', 'Scorpio emphasis'],
    ko: '돈의 흐름을 차분히 읽으시는 편이에요. 숫자 뒤에 숨은 사람들의 심리를 보는 눈이 있고, 인내가 큰 무기예요.',
    en: 'You read the flow of money calmly. You see the psychology hidden behind the numbers, and patience is your biggest weapon.',
    strengths_ko: ['분석력', '인내', '리스크 감각'],
    strengths_en: ['analysis', 'patience', 'risk sense'],
    challenges_ko: ['시장 스트레스', '감정 통제', '윤리 갈등'],
    challenges_en: ['market stress', 'emotional control', 'ethical tension'],
    advice_ko: '숫자가 흔들릴 때일수록 자기 원칙을 적어둔 노트를 다시 펴 보세요.',
    advice_en: 'When the numbers shake, re-open the notebook where you wrote your own rules.',
  },
  {
    category: '부동산',
    name: '부동산·자산관리',
    name_en: 'Real Estate / Asset Management',
    emoji: '🏘',
    sajuSignals: ['정재 강', '토기 강', '인성 받침', '재성 대운'],
    astroSignals: ['Saturn in 2nd', 'Taurus emphasis', 'Jupiter–Saturn aspect'],
    ko: '꾸준히 쌓이는 자산을 운영하시는 편이에요. 큰 흐름을 길게 보는 시야가 강하고, 안정이 곧 수익이라는 감각이 있어요.',
    en: 'You manage assets that build up steadily. You see long horizons, and you sense that stability itself is profit.',
    strengths_ko: ['장기 시야', '신뢰감', '꼼꼼함'],
    strengths_en: ['long horizon', 'trustworthiness', 'thoroughness'],
    challenges_ko: ['느린 결과', '규제 변화', '큰 자본 부담'],
    challenges_en: ['slow results', 'regulatory shifts', 'capital burden'],
    advice_ko: '한 자산에 마음을 다 두지 말고 흐름의 일부로 바라보세요.',
    advice_en: 'Don’t pin your whole heart to one asset — see it as part of the flow.',
  },
  {
    category: '세일즈마케팅',
    name: '세일즈·마케팅',
    name_en: 'Sales / Marketing',
    emoji: '📣',
    sajuSignals: ['편재 강', '식상 강', '도화', '상관 받침'],
    astroSignals: ['Mercury–Jupiter aspect', 'Gemini emphasis', 'Venus in 3rd'],
    ko: '사람의 마음을 빠르게 읽고 다리를 놓아 주시는 분이에요. 변동 안에서도 기회를 잡는 감이 좋고, 말이 곧 자산이에요.',
    en: 'You read people quickly and build bridges between them. You catch opportunities even in volatility, and your words are an asset.',
    strengths_ko: ['친화력', '순발력', '설득력'],
    strengths_en: ['warmth', 'quick reflexes', 'persuasion'],
    challenges_ko: ['수치 압박', '감정 노동', '관계 소진'],
    challenges_en: ['number pressure', 'emotional labor', 'relationship burnout'],
    advice_ko: '실적이 흔들릴 때일수록 친한 사람과의 약속은 더 단단히 지키세요.',
    advice_en: 'When numbers shake, hold even more firmly to promises with the people close to you.',
  },

  // ──────────────────────────────────────────────
  // D. 지식·교육 (인성 강)
  // ──────────────────────────────────────────────
  {
    category: '교육',
    name: '교육·교사',
    name_en: 'Educator / Teacher',
    emoji: '📚',
    sajuSignals: ['정인 강', '편인 강', '식신 받침', '관성 안정'],
    astroSignals: ['Jupiter in 9th', 'Sagittarius emphasis', 'Mercury–Jupiter aspect'],
    ko: '아는 것을 다른 사람의 언어로 풀어 주시는 분이에요. 한 사람의 성장을 곁에서 지켜보는 일에서 보람이 크고, 인내가 큰 자산이에요.',
    en: 'You translate what you know into someone else’s language. You find deep meaning in watching a person grow, and patience is a great asset.',
    strengths_ko: ['설명력', '인내', '돌봄'],
    strengths_en: ['clarity', 'patience', 'care'],
    challenges_ko: ['감정 소진', '낮은 보상', '제도 피로'],
    challenges_en: ['emotional burnout', 'low compensation', 'institutional fatigue'],
    advice_ko: '자기 자신도 평생의 학생으로 두고 한 가지씩 새로 배우세요.',
    advice_en: 'Keep yourself a lifelong student and learn one new thing at a time.',
  },
  {
    category: '연구학자',
    name: '연구·학자',
    name_en: 'Researcher / Scholar',
    emoji: '🔬',
    sajuSignals: ['편인 강', '정인 강', '식상 받침', '수기 강'],
    astroSignals: ['Mercury–Saturn aspect', 'Virgo emphasis', 'Saturn in 9th'],
    ko: '한 주제 안에 오래 머무르며 깊이 들어가시는 편이에요. 빠른 결과보다 진짜 답에 가까워지는 과정을 더 사랑하세요.',
    en: 'You stay long inside one subject and go deep. You love the process of getting closer to the real answer more than fast results.',
    strengths_ko: ['집중력', '논리', '인내'],
    strengths_en: ['focus', 'logic', 'patience'],
    challenges_ko: ['고립감', '느린 인정', '재정 부담'],
    challenges_en: ['isolation', 'slow recognition', 'financial strain'],
    advice_ko: '연구의 진척 못지않게 동료와의 대화 시간을 자산으로 두세요.',
    advice_en: 'Treat conversations with peers as an asset as valuable as research progress.',
  },
  {
    category: '상담심리',
    name: '상담·심리',
    name_en: 'Counselor / Therapist',
    emoji: '💬',
    sajuSignals: ['정인 강', '식신 강', '편인 받침', '수기 흐름'],
    astroSignals: ['Moon–Chiron aspect', 'Cancer/Pisces emphasis', 'Neptune in 6th'],
    ko: '다른 사람의 어두운 시간을 함께 걸어 주시는 분이에요. 듣는 일이 곧 일이 되고, 한 사람의 마음에 길을 내주는 직업이에요.',
    en: 'You walk alongside others through their dark times. Listening itself becomes your work, and you open paths in someone’s heart.',
    strengths_ko: ['공감', '경청', '안정감'],
    strengths_en: ['empathy', 'listening', 'steadiness'],
    challenges_ko: ['감정 전이', '경계 어려움', '소진'],
    challenges_en: ['emotional transference', 'boundary difficulty', 'burnout'],
    advice_ko: '하루에 한 번은 의식적으로 자기 자신의 상담자가 되어 주세요.',
    advice_en: 'Once a day, deliberately become a counselor for yourself.',
  },

  // ──────────────────────────────────────────────
  // E. 기술·혁신 (외행성 강)
  // ──────────────────────────────────────────────
  {
    category: 'IT엔지니어',
    name: 'IT·엔지니어',
    name_en: 'IT Engineer',
    emoji: '💻',
    sajuSignals: ['편인 강', '식상 강', '편관격', '편재 운'],
    astroSignals: ['Mercury 3rd/11th', 'Uranus aspects Sun', 'Aquarius emphasis'],
    ko: '새로운 기술과 시스템을 만들어내시는 편이에요. 논리와 창의가 균형 잡힌 분야가 잘 맞고, 미래 지향적인 일에서 빛나요.',
    en: 'You build new technology and systems. Fields balancing logic and creativity suit you, and you shine in future-oriented work.',
    strengths_ko: ['논리적 사고', '창의력', '문제 해결'],
    strengths_en: ['logical thinking', 'creativity', 'problem solving'],
    challenges_ko: ['소통 어려움', '워라밸', '빠른 변화'],
    challenges_en: ['communication difficulty', 'work-life balance', 'rapid change'],
    advice_ko: '기술뿐 아니라 사람을 이해하는 능력도 함께 키우세요.',
    advice_en: 'Develop people skills alongside technical ones.',
  },
  {
    category: '과학자',
    name: '과학자·연구개발',
    name_en: 'Scientist / R&D',
    emoji: '🧪',
    sajuSignals: ['편인 강', '식신 강', '편관 받침', '수기 강'],
    astroSignals: ['Uranus–Mercury aspect', 'Aquarius emphasis', 'Saturn in 11th'],
    ko: '아직 답이 없는 질문에 끌리는 분이에요. 새로운 가설을 세우고 그것을 끝까지 밀어붙이는 일에서 진짜 자기 모습이 나오세요.',
    en: 'You’re drawn to questions that don’t yet have answers. You become most yourself when forming new hypotheses and pushing them to the end.',
    strengths_ko: ['호기심', '실험 정신', '논리'],
    strengths_en: ['curiosity', 'experimental spirit', 'logic'],
    challenges_ko: ['긴 검증 시간', '재정 압박', '주류와 거리'],
    challenges_en: ['long verification cycles', 'funding pressure', 'distance from mainstream'],
    advice_ko: '실험이 막힐 때는 일부러 전혀 다른 분야의 글을 한 편 읽어보세요.',
    advice_en: 'When an experiment stalls, deliberately read one piece from a completely unrelated field.',
  },
  {
    category: 'NGO',
    name: '사회 운동가·NGO',
    name_en: 'Activist / NGO Worker',
    emoji: '🌍',
    sajuSignals: ['편관 강', '식신 강', '인성 받침', '관성 흐름'],
    astroSignals: ['Jupiter in 11th', 'Aquarius emphasis', 'Pluto–MC aspect'],
    ko: '나 한 명보다 더 큰 공동체를 생각하시는 분이에요. 불합리한 흐름을 바꾸는 일에서 힘이 솟고, 헌신이 곧 정체성이에요.',
    en: 'You think beyond yourself toward a larger community. Changing unfair flows gives you energy, and devotion becomes your identity.',
    strengths_ko: ['공감', '추진력', '헌신'],
    strengths_en: ['empathy', 'drive', 'devotion'],
    challenges_ko: ['소진', '재정 불안', '시스템 피로'],
    challenges_en: ['burnout', 'financial instability', 'systemic fatigue'],
    advice_ko: '세상을 돌보는 만큼 자기 자신도 한 명의 시민으로 돌보세요.',
    advice_en: 'Care for yourself as a citizen, just as much as you care for the world.',
  },
]

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * 카테고리로 단일 엔트리를 찾습니다.
 */
export function findCareerByCategory(cat: CareerCategory): CareerEntry | null {
  return CAREER_DICTIONARY.find((entry) => entry.category === cat) ?? null
}

/**
 * 사주 신호 (예: "정관 강") 와 매칭되는 모든 커리어 엔트리.
 * 부분 일치 (substring) 로 처리해 "정관 강", "정관" 등 다양한 표기를 흡수.
 */
export function listCareersBySajuSignal(signal: string): CareerEntry[] {
  const needle = signal.trim()
  if (!needle) return []
  return CAREER_DICTIONARY.filter((entry) =>
    entry.sajuSignals.some(
      (s) => s.includes(needle) || needle.includes(s),
    ),
  )
}

/**
 * 점성 신호 (예: "MC in Capricorn") 와 매칭되는 모든 커리어 엔트리.
 * 대소문자 무시 + 부분 일치.
 */
export function listCareersByAstroSignal(signal: string): CareerEntry[] {
  const needle = signal.trim().toLowerCase()
  if (!needle) return []
  return CAREER_DICTIONARY.filter((entry) =>
    entry.astroSignals.some((s) => {
      const lower = s.toLowerCase()
      return lower.includes(needle) || needle.includes(lower)
    }),
  )
}

/**
 * 사주 + 점성 신호 모음을 입력받아 점수가 높은 상위 N개 커리어를 추천.
 *
 * 점수 = 사주 매칭 수 × 2 + 점성 매칭 수 × 1
 *  - 사주 신호가 사용자의 핵심 지표라는 가정 하에 가중치 2.
 *  - 동점일 때는 사전 정의된 CAREER_DICTIONARY 의 순서 (전통→창의→사업→
 *    교육→기술) 가 자연 정렬을 만들도록 stable filter.
 *
 * @param sajuSignals  예) ["정관 강", "식상 강"]
 * @param astroSignals 예) ["MC in Capricorn", "Sun in 10th"]
 * @param limit        반환할 최대 개수 (기본 3)
 */
export function matchTopCareers(
  sajuSignals: string[],
  astroSignals: string[],
  limit: number = 3,
): CareerEntry[] {
  if (limit <= 0) return []

  const normalizedSaju = sajuSignals
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const normalizedAstro = astroSignals
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)

  if (normalizedSaju.length === 0 && normalizedAstro.length === 0) return []

  const scored = CAREER_DICTIONARY.map((entry, idx) => {
    let sajuHits = 0
    for (const userSig of normalizedSaju) {
      for (const entrySig of entry.sajuSignals) {
        if (entrySig.includes(userSig) || userSig.includes(entrySig)) {
          sajuHits += 1
          break
        }
      }
    }

    let astroHits = 0
    for (const userSig of normalizedAstro) {
      for (const entrySig of entry.astroSignals) {
        const lower = entrySig.toLowerCase()
        if (lower.includes(userSig) || userSig.includes(lower)) {
          astroHits += 1
          break
        }
      }
    }

    const score = sajuHits * 2 + astroHits
    return { entry, score, idx }
  })

  return scored
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.idx - b.idx // 동점 시 사전 정의 순서
    })
    .slice(0, limit)
    .map((row) => row.entry)
}
