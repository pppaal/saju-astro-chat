/**
 * 통합 명식 리포트 뷰모델 타입 + chart.zip 샘플 데이터(TS 포팅).
 * 실제 데이터는 adapter.ts 가 우리 saju/astro 객체에서 이 shape 로 변환한다.
 */

export interface ReportPillar {
  stem: string
  branch: string
  sibsinStem: string
  sibsinBranch: string
  jijanggan: Array<{ g: string; layer: 'main' | 'mid' | 'sub' }>
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
    /** 출생시각 미상 — true면 ASC/MC/하우스 의존 해석이 근사치(배너 경고). */
    birthTimeUnknown?: boolean
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
  opposition: { glyph: '☍', ko: '맞섬', cls: 'hard' },
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
  Sag: { glyph: '♐', ko: '사수', el: 'fire' },
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
    ko: '본궁 +5 — 행성이 본래 다스리는 별자리',
    en: 'Domicile +5 — the sign the planet naturally rules',
  },
  exaltation: {
    ko: '고양 +4 — 가장 잘 발휘되는 위치',
    en: 'Exaltation +4 — where the planet expresses at its best',
  },
  triplicity: {
    ko: '삼분궁 +3 — 같은 원소 그룹',
    en: 'Triplicity +3 — same elemental family',
  },
  term: {
    ko: '바운드 +2 — 별자리 내 작은 영역 지배',
    en: 'Term +2 — rulership of a small zone within the sign',
  },
  face: {
    ko: '안면 +1 — 별자리 내 10도 영역 지배',
    en: 'Face +1 — rulership of a 10° decan within the sign',
  },
  detriment: {
    ko: '손상 −5 — 본궁 반대편, 본성 발휘 어려움',
    en: 'Detriment −5 — opposite the domicile, expression is strained',
  },
  fall: {
    ko: '추락 −4 — 고양 반대편, 약화',
    en: 'Fall −4 — opposite the exaltation, weakened',
  },
  peregrine: {
    ko: '중립 — 위계 없음',
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
      ko: '합 0° — 두 행성이 붙어서 함께 작동',
      en: 'Conjunction 0° — two planets fused and acting as one',
    },
  },
  sextile: {
    label: { ko: '잘 도와줘요', en: 'Lends a hand' },
    tooltip: {
      ko: '육각 60° — 부드럽게 협력',
      en: 'Sextile 60° — gentle cooperation',
    },
  },
  square: {
    label: { ko: '부딪혀요', en: 'Clashes' },
    tooltip: {
      ko: '사각 90° — 긴장·갈등',
      en: 'Square 90° — tension and friction',
    },
  },
  trine: {
    label: { ko: '잘 흘러요', en: 'Flows easily' },
    tooltip: {
      ko: '삼각 120° — 자연스럽게 어울림',
      en: 'Trine 120° — natural harmony',
    },
  },
  opposition: {
    label: { ko: '맞서요', en: 'Faces off' },
    tooltip: {
      ko: '대충(對沖) 180° — 정면 대립',
      en: 'Opposition 180° — head-on polarity',
    },
  },
}
