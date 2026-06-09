/**
 * 통합 명식 리포트 뷰모델 타입 + chart.zip 샘플 데이터(TS 포팅).
 * 실제 데이터는 adapter.ts 가 우리 saju/astro 객체에서 이 shape 로 변환한다.
 */

export interface ReportPillar {
  stem: string
  branch: string
  sibsinStem: string
  sibsinBranch: string
  jijanggan: Array<{ g: string; d: number }>
  twelveStage: string
  isDay?: boolean
}

export interface ReportData {
  input: {
    name: string
    gender: string
    calendar: string
    date: string
    time: string
    place: string
    lat: number
    lng: number
    timeZone: string
    isoUTC: string
  }
  saju: {
    dayMaster: string
    strength: string
    geokguk: string
    yongsin: { primary: string; secondary?: string; avoid: string[] }
    pillars: { hour: ReportPillar; day: ReportPillar; month: ReportPillar; year: ReportPillar }
    fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number }
    natalShinsal: Array<{
      name: string
      ko: string
      pillar: string
      sub?: string
      polarity: number
    }>
    natalRelations: Array<{
      type: string
      detail: string
      tone: 'pos' | 'neg' | 'neutral'
      // getRelationMeaning 룩업용 — category(kind) + 한자 전용 pair. 옛 SAMPLE 호환 위해 optional.
      category?: string
      pair?: string
    }>
    daeun: Array<{ age: number; stem: string; branch: string; sibsin: string; current: boolean }>
    // 회색 3 셀 해소 (RAW_DISTRIBUTION v5.4) — 정통 사주 보조 정보.
    // 옛 SAMPLE_REPORT 호환 위해 optional.
    rooted?: boolean // 일간 통근 여부
    gongmang?: string[] // 공망 지지 2개
    johuYongsin?: { primary: string; rating: number } | null // 조후용신 (계절 균형)
  }
  astro: {
    sect: string
    houseSystem: string
    ascendant: { lon: number; sign: string; deg: string }
    mc: { lon: number; sign: string; deg: string }
    planets: Array<{
      name: string
      ko: string
      glyph: string
      lon: number
      sign: string
      deg: string
      house: number
      retro: boolean
      speed: number
    }>
    extraPoints: Array<{
      name: string
      ko: string
      glyph: string
      lon: number
      sign: string
      deg: string
      house: number
    }>
    houses: Array<{ i: number; cusp: number; sign: string }>
    aspects: Array<{ a: string; b: string; type: string; orb: number; applying: boolean }>
    dignities: Array<{ planet: string; sign: string; tier: string; score: number }>
    // 정통 점성 깊이 (Phase B) — Level 3 (접고 펼침) 용. 옛 SAMPLE_REPORT 호환
    // 위해 optional. adapter 가 facts.hellenistic 에서 흘려줌.
    lots?: Array<{ name: string; sign: string; deg: string; house: number }>
    almuten?: { winner: string | null; winners: string[]; scores: Record<string, number> } | null
  }
}

// 오행 한↔한자 라벨
export const ELEMENTS: Record<string, { ko: string; han: string }> = {
  wood: { ko: '목', han: '木' },
  fire: { ko: '화', han: '火' },
  earth: { ko: '토', han: '土' },
  metal: { ko: '금', han: '金' },
  water: { ko: '수', han: '水' },
}

export const STEM_INFO: Record<string, { el: string; yy: string }> = {
  甲: { el: 'wood', yy: '陽' },
  乙: { el: 'wood', yy: '陰' },
  丙: { el: 'fire', yy: '陽' },
  丁: { el: 'fire', yy: '陰' },
  戊: { el: 'earth', yy: '陽' },
  己: { el: 'earth', yy: '陰' },
  庚: { el: 'metal', yy: '陽' },
  辛: { el: 'metal', yy: '陰' },
  壬: { el: 'water', yy: '陽' },
  癸: { el: 'water', yy: '陰' },
}
export const BRANCH_INFO: Record<string, { el: string; yy: string; ko: string }> = {
  子: { el: 'water', yy: '陽', ko: '쥐' },
  丑: { el: 'earth', yy: '陰', ko: '소' },
  寅: { el: 'wood', yy: '陽', ko: '범' },
  卯: { el: 'wood', yy: '陰', ko: '토끼' },
  辰: { el: 'earth', yy: '陽', ko: '용' },
  巳: { el: 'fire', yy: '陰', ko: '뱀' },
  午: { el: 'fire', yy: '陽', ko: '말' },
  未: { el: 'earth', yy: '陰', ko: '양' },
  申: { el: 'metal', yy: '陽', ko: '원숭이' },
  酉: { el: 'metal', yy: '陰', ko: '닭' },
  戌: { el: 'earth', yy: '陽', ko: '개' },
  亥: { el: 'water', yy: '陰', ko: '돼지' },
}
export const ASPECT_META: Record<
  string,
  { glyph: string; ko: string; cls: 'hard' | 'soft' | 'neutral' }
> = {
  conjunction: { glyph: '☌', ko: '합', cls: 'neutral' },
  sextile: { glyph: '⚹', ko: '육각', cls: 'soft' },
  square: { glyph: '□', ko: '사각', cls: 'hard' },
  trine: { glyph: '△', ko: '삼각', cls: 'soft' },
  opposition: { glyph: '☍', ko: '대충', cls: 'hard' },
}
// 별자리 약어 → glyph·한국어·원소
export const SIGN_META: Record<string, { glyph: string; ko: string; el: string }> = {
  Ari: { glyph: '♈', ko: '양', el: 'fire' },
  Tau: { glyph: '♉', ko: '황소', el: 'earth' },
  Gem: { glyph: '♊', ko: '쌍둥이', el: 'wood' },
  Can: { glyph: '♋', ko: '게', el: 'water' },
  Leo: { glyph: '♌', ko: '사자', el: 'fire' },
  Vir: { glyph: '♍', ko: '처녀', el: 'earth' },
  Lib: { glyph: '♎', ko: '천칭', el: 'wood' },
  Sco: { glyph: '♏', ko: '전갈', el: 'water' },
  Sag: { glyph: '♐', ko: '궁수', el: 'fire' },
  Cap: { glyph: '♑', ko: '염소', el: 'earth' },
  Aqu: { glyph: '♒', ko: '물병', el: 'wood' },
  Pis: { glyph: '♓', ko: '물고기', el: 'water' },
}
// 풀 이름 → 약어
export const SIGN_ABBR: Record<string, string> = {
  Aries: 'Ari',
  Taurus: 'Tau',
  Gemini: 'Gem',
  Cancer: 'Can',
  Leo: 'Leo',
  Virgo: 'Vir',
  Libra: 'Lib',
  Scorpio: 'Sco',
  Sagittarius: 'Sag',
  Capricorn: 'Cap',
  Aquarius: 'Aqu',
  Pisces: 'Pis',
}

// 이중언어 라벨 한 묶음 — UI 가 lang 으로 골라 씀.
export interface BiLabel {
  ko: string
  en: string
}

export const DIGNITY_TIER_LABEL: Record<string, BiLabel> = {
  domicile: { ko: '본궁 +5', en: 'Domicile +5' },
  exaltation: { ko: '고양 +4', en: 'Exaltation +4' },
  triplicity: { ko: '삼분궁 +3', en: 'Triplicity +3' },
  term: { ko: '바운드 +2', en: 'Term +2' },
  face: { ko: '안면 +1', en: 'Face +1' },
  detriment: { ko: '손상 −5', en: 'Detriment −5' },
  fall: { ko: '추락 −4', en: 'Fall −4' },
  peregrine: { ko: '중립', en: 'Peregrine' },
}

/**
 * Phase C — 정통 용어를 일상어로. UI Level 2 에서 dignity 카드의 1차 라벨.
 * 정통 용어 (본궁/삼분궁/바운드 등) 는 툴팁 (DIGNITY_TIER_TOOLTIP) 으로 후순위
 * 노출. 사용자가 한 번에 의미 잡고, 깊이 원하면 호버.
 */
export const DIGNITY_TIER_FRIENDLY: Record<string, BiLabel> = {
  domicile: { ko: '고향 같은 자리', en: 'Home turf' }, // 가장 자기다움 — 행성이 본래 다스리는 별자리
  exaltation: { ko: '환영받는 자리', en: 'Honored guest' }, // 본궁은 아니지만 강력하게 발휘
  triplicity: { ko: '기질이 맞는 자리', en: 'Kindred ground' }, // 같은 원소 가족 — 무리 없는 활동
  term: { ko: '실력 발휘 자리', en: 'Skilled corner' }, // 작은 영역에서 자기 영역 — 도구 잘 다룸
  face: { ko: '얼굴값 자리', en: 'Faint footing' }, // 가장 약한 dignity — 살짝 존재감
  detriment: { ko: '낯선 자리', en: 'Foreign turf' }, // 본궁의 반대편 — 어색함
  fall: { ko: '기죽는 자리', en: 'Low ground' }, // 고양의 반대편 — 위축
  peregrine: { ko: '중립', en: 'Neutral' }, // 어느 쪽도 아닌 평지
}

/**
 * 호버 시 정통 용어 + 점수 풀로 보여줌. 깊이를 원하는 사용자용.
 */
export const DIGNITY_TIER_TOOLTIP: Record<string, BiLabel> = {
  domicile: {
    ko: '본궁 (Domicile) +5 — 행성이 본래 다스리는 별자리',
    en: 'Domicile +5 — the sign the planet naturally rules',
  },
  exaltation: {
    ko: '고양 (Exaltation) +4 — 가장 잘 발휘되는 위치',
    en: 'Exaltation +4 — where the planet expresses at its best',
  },
  triplicity: {
    ko: '삼분궁 (Triplicity) +3 — 같은 원소 그룹',
    en: 'Triplicity +3 — same elemental family',
  },
  term: {
    ko: '바운드 (Term) +2 — 별자리 내 작은 영역 지배',
    en: 'Term +2 — rulership of a small zone within the sign',
  },
  face: {
    ko: '안면 (Face) +1 — 별자리 내 10도 영역 지배',
    en: 'Face +1 — rulership of a 10° decan within the sign',
  },
  detriment: {
    ko: '손상 (Detriment) −5 — 본궁 반대편, 본성 발휘 어려움',
    en: 'Detriment −5 — opposite the domicile, expression is strained',
  },
  fall: {
    ko: '추락 (Fall) −4 — 고양 반대편, 약화',
    en: 'Fall −4 — opposite the exaltation, weakened',
  },
  peregrine: {
    ko: '중립 (Peregrine) — 위계 없음',
    en: 'Peregrine — no essential dignity',
  },
}

/**
 * Aspect 종류도 같은 패턴 — 정통 용어 (삼각·육각·사각·대충·합) 가 친화적이지
 * 않아 일상어 라벨. 툴팁으로 정통 용어 + 각도 노출.
 */
export const ASPECT_FRIENDLY: Record<string, { label: BiLabel; tooltip: BiLabel }> = {
  conjunction: {
    label: { ko: '같이 있어요', en: 'Working together' },
    tooltip: {
      ko: '합 (Conjunction) 0° — 두 행성이 붙어서 함께 작동',
      en: 'Conjunction 0° — two planets fused and acting as one',
    },
  },
  sextile: {
    label: { ko: '잘 도와줘요', en: 'Lends a hand' },
    tooltip: {
      ko: '육각 (Sextile) 60° — 부드럽게 협력',
      en: 'Sextile 60° — gentle cooperation',
    },
  },
  square: {
    label: { ko: '부딪혀요', en: 'Clashes' },
    tooltip: {
      ko: '사각 (Square) 90° — 긴장·갈등',
      en: 'Square 90° — tension and friction',
    },
  },
  trine: {
    label: { ko: '잘 흘러요', en: 'Flows easily' },
    tooltip: {
      ko: '삼각 (Trine) 120° — 자연스럽게 어울림',
      en: 'Trine 120° — natural harmony',
    },
  },
  opposition: {
    label: { ko: '맞서요', en: 'Faces off' },
    tooltip: {
      ko: '대충 (Opposition) 180° — 정면 대립',
      en: 'Opposition 180° — head-on polarity',
    },
  },
}

/** chart.zip 샘플 — 컴포넌트 즉시 렌더/미리보기용. 실제는 adapter 로 교체. */
export const SAMPLE_REPORT: ReportData = {
  input: {
    name: '내담자',
    gender: 'male',
    calendar: '양력',
    date: '1990-05-15',
    time: '14:30',
    place: '대한민국 서울',
    lat: 37.5665,
    lng: 126.978,
    timeZone: 'Asia/Seoul (UTC+9)',
    isoUTC: '1990-05-15T05:30:00Z',
  },
  saju: {
    dayMaster: '丙',
    strength: 'strong',
    geokguk: '建祿格',
    yongsin: { primary: 'water', secondary: 'metal', avoid: ['wood', 'fire'] },
    pillars: {
      hour: {
        stem: '乙',
        branch: '未',
        sibsinStem: '정인',
        sibsinBranch: '상관',
        jijanggan: [
          { g: '丁', d: 9 },
          { g: '乙', d: 3 },
          { g: '己', d: 18 },
        ],
        twelveStage: '쇠',
      },
      day: {
        stem: '丙',
        branch: '寅',
        sibsinStem: '日干',
        sibsinBranch: '편인',
        jijanggan: [
          { g: '戊', d: 7 },
          { g: '丙', d: 7 },
          { g: '甲', d: 16 },
        ],
        twelveStage: '장생',
        isDay: true,
      },
      month: {
        stem: '辛',
        branch: '巳',
        sibsinStem: '정재',
        sibsinBranch: '비견',
        jijanggan: [
          { g: '戊', d: 7 },
          { g: '庚', d: 7 },
          { g: '丙', d: 16 },
        ],
        twelveStage: '건록',
      },
      year: {
        stem: '庚',
        branch: '午',
        sibsinStem: '편재',
        sibsinBranch: '겁재',
        jijanggan: [
          { g: '丙', d: 10 },
          { g: '己', d: 9 },
          { g: '丁', d: 11 },
        ],
        twelveStage: '제왕',
      },
    },
    fiveElements: { wood: 2, fire: 3, earth: 1, metal: 2, water: 0 },
    natalShinsal: [
      { name: '羊刃殺', ko: '양인살', pillar: '年', polarity: -1 },
      { name: '文昌貴人', ko: '문창귀인', pillar: '日', polarity: 2 },
      { name: '紅艶殺', ko: '홍염살', pillar: '時', polarity: 0 },
      { name: '空亡', ko: '공망', pillar: '年', sub: '戌亥', polarity: -1 },
      { name: '天乙貴人', ko: '천을귀인', pillar: '時', polarity: 3 },
      { name: '驛馬殺', ko: '역마살', pillar: '月', polarity: 1 },
    ],
    natalRelations: [
      { type: '합', detail: '寅·午 반합 (火)', tone: 'pos' },
      { type: '형', detail: '寅·巳 형', tone: 'neg' },
      { type: '충', detail: '없음', tone: 'neutral' },
    ],
    daeun: [
      { age: 4, stem: '壬', branch: '午', sibsin: '편관', current: false },
      { age: 14, stem: '癸', branch: '未', sibsin: '정관', current: false },
      { age: 24, stem: '甲', branch: '申', sibsin: '편인', current: false },
      { age: 34, stem: '乙', branch: '酉', sibsin: '정인', current: true },
      { age: 44, stem: '丙', branch: '戌', sibsin: '비견', current: false },
      { age: 54, stem: '丁', branch: '亥', sibsin: '겁재', current: false },
      { age: 64, stem: '戊', branch: '子', sibsin: '식신', current: false },
      { age: 74, stem: '己', branch: '丑', sibsin: '상관', current: false },
    ],
  },
  astro: {
    sect: 'day',
    houseSystem: 'Placidus',
    ascendant: { lon: 168.75, sign: 'Virgo', deg: '18°45′' },
    mc: { lon: 76.33, sign: 'Gemini', deg: '16°20′' },
    planets: [
      {
        name: 'Sun',
        ko: '태양',
        glyph: '☉',
        lon: 54.57,
        sign: 'Tau',
        deg: '24°34′',
        house: 9,
        retro: false,
        speed: 0.97,
      },
      {
        name: 'Moon',
        ko: '달',
        glyph: '☾',
        lon: 248.2,
        sign: 'Sag',
        deg: '08°12′',
        house: 3,
        retro: false,
        speed: 13.1,
      },
      {
        name: 'Mercury',
        ko: '수성',
        glyph: '☿',
        lon: 49.03,
        sign: 'Tau',
        deg: '19°02′',
        house: 9,
        retro: false,
        speed: 1.42,
      },
      {
        name: 'Venus',
        ko: '금성',
        glyph: '♀',
        lon: 6.33,
        sign: 'Ari',
        deg: '06°20′',
        house: 8,
        retro: false,
        speed: 1.13,
      },
      {
        name: 'Mars',
        ko: '화성',
        glyph: '♂',
        lon: 353.85,
        sign: 'Pis',
        deg: '23°51′',
        house: 7,
        retro: false,
        speed: 0.71,
      },
      {
        name: 'Jupiter',
        ko: '목성',
        glyph: '♃',
        lon: 98.25,
        sign: 'Can',
        deg: '08°15′',
        house: 10,
        retro: false,
        speed: 0.21,
      },
      {
        name: 'Saturn',
        ko: '토성',
        glyph: '♄',
        lon: 294.67,
        sign: 'Cap',
        deg: '24°40′',
        house: 5,
        retro: true,
        speed: -0.04,
      },
      {
        name: 'Uranus',
        ko: '천왕성',
        glyph: '♅',
        lon: 279.2,
        sign: 'Cap',
        deg: '09°12′',
        house: 4,
        retro: true,
        speed: -0.02,
      },
      {
        name: 'Neptune',
        ko: '해왕성',
        glyph: '♆',
        lon: 284.37,
        sign: 'Cap',
        deg: '14°22′',
        house: 4,
        retro: true,
        speed: -0.01,
      },
      {
        name: 'Pluto',
        ko: '명왕성',
        glyph: '♇',
        lon: 226.13,
        sign: 'Sco',
        deg: '16°08′',
        house: 3,
        retro: true,
        speed: -0.01,
      },
      {
        name: 'Node',
        ko: '북교점',
        glyph: '☊',
        lon: 312.5,
        sign: 'Aqu',
        deg: '12°30′',
        house: 5,
        retro: true,
        speed: -0.05,
      },
    ],
    extraPoints: [
      { name: 'Chiron', ko: '카이런', glyph: '⚷', lon: 104, sign: 'Can', deg: '14°00′', house: 10 },
      { name: 'Lilith', ko: '릴리스', glyph: '⚸', lon: 357, sign: 'Pis', deg: '27°00′', house: 7 },
    ],
    houses: [
      { i: 1, cusp: 168.75, sign: 'Vir' },
      { i: 2, cusp: 195, sign: 'Lib' },
      { i: 3, cusp: 224, sign: 'Sco' },
      { i: 4, cusp: 256.33, sign: 'Sag' },
      { i: 5, cusp: 288, sign: 'Cap' },
      { i: 6, cusp: 317, sign: 'Aqu' },
      { i: 7, cusp: 348.75, sign: 'Pis' },
      { i: 8, cusp: 15, sign: 'Ari' },
      { i: 9, cusp: 44, sign: 'Tau' },
      { i: 10, cusp: 76.33, sign: 'Gem' },
      { i: 11, cusp: 108, sign: 'Can' },
      { i: 12, cusp: 137, sign: 'Leo' },
    ],
    aspects: [
      { a: 'Sun', b: 'Mercury', type: 'conjunction', orb: 5.54, applying: true },
      { a: 'Sun', b: 'Mars', type: 'sextile', orb: 0.72, applying: true },
      { a: 'Sun', b: 'Saturn', type: 'trine', orb: 0.1, applying: false },
      { a: 'Mercury', b: 'Pluto', type: 'opposition', orb: 2.9, applying: false },
      { a: 'Mercury', b: 'Saturn', type: 'trine', orb: 5.64, applying: true },
      { a: 'Moon', b: 'Venus', type: 'trine', orb: 1.87, applying: true },
      { a: 'Venus', b: 'Jupiter', type: 'square', orb: 1.92, applying: false },
      { a: 'Jupiter', b: 'Uranus', type: 'opposition', orb: 0.95, applying: true },
      { a: 'Jupiter', b: 'Neptune', type: 'opposition', orb: 6.12, applying: false },
      { a: 'Uranus', b: 'Neptune', type: 'conjunction', orb: 5.17, applying: false },
    ],
    dignities: [
      { planet: 'Jupiter', sign: 'Can', tier: 'exaltation', score: 4 },
      { planet: 'Saturn', sign: 'Cap', tier: 'domicile', score: 5 },
      { planet: 'Venus', sign: 'Ari', tier: 'detriment', score: -5 },
      { planet: 'Mars', sign: 'Pis', tier: 'peregrine', score: 0 },
      { planet: 'Sun', sign: 'Tau', tier: 'peregrine', score: 0 },
    ],
  },
}
