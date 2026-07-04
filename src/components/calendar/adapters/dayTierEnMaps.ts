/**
 * dayTierEnMaps — DayTier '자세히 보기' 전문가 섹션의 KO→EN 치환 맵.
 *
 * EN 로케일에서 격국 성패 단어·신살 이름·12운성 단계가 한국어로 새던 것을
 * 영문화한다(엔진/공유데이터 무수정 — 컴포넌트 렌더 직전 best-effort 치환).
 * 영문값은 src/lib/saju/data/interpretations.json 의 name_en 들과 일치시켰다.
 * 미상 키는 호출부에서 KO 로 폴백 → KO 로케일·미상 라벨엔 영향 없음.
 */

/** 격국 성패 단어 — 성격/파격/반성반파. */
export const GEOKGUK_STATUS_EN: Record<string, string> = {
  성격: 'Formed',
  파격: 'Broken',
  반성반파: 'Mixed',
}

/**
 * 격국 이름 KO→EN (GeokgukType 전체 29종). toUser.GEOKGUK_EN_NAME(정격 8종)의
 * 상위집합 — 종격·비격·화기격·특수격까지 포함해 EN 로케일에서 격국명이 한국어로
 * 새지 않게 한다. 고전 격국 어휘라 사실상 불변. (정격 8종 표기는 toUser 와 동일 유지.)
 */
export const GEOKGUK_NAME_EN: Record<string, string> = {
  // 정격 8
  식신격: 'Siksin (Eating-god)',
  상관격: 'Sanggwan (Hurting-officer)',
  편재격: 'Pyeonjae (Indirect-wealth)',
  정재격: 'Jeongjae (Direct-wealth)',
  편관격: 'Pyeongwan (Indirect-officer)',
  정관격: 'Jeonggwan (Direct-officer)',
  편인격: 'Pyeonin (Indirect-resource)',
  정인격: 'Jeongin (Direct-resource)',
  // 종격 5
  종왕격: 'Jongwang (Dominant self)',
  종강격: 'Jonggang (Dominant resource)',
  종아격: 'Jongah (Dominant output)',
  종재격: 'Jongjae (Dominant wealth)',
  종살격: 'Jongsal (Dominant officer)',
  // 비격 4
  건록격: 'Geonrok (Officer stipend)',
  양인격: 'Yangin (Blade edge)',
  월겁격: 'Wolgeop (Monthly rob)',
  잡기격: 'Japgi (Mixed storage)',
  // 화기격국 5
  갑기화토격: 'Gap-Gi Earth transformation',
  을경화금격: 'Eul-Gyeong Metal transformation',
  병신화수격: 'Byeong-Sin Water transformation',
  정임화목격: 'Jeong-Im Wood transformation',
  무계화화격: 'Mu-Gye Fire transformation',
  // 특수격국 5
  곡직격: 'Gokjik (Curved-straight Wood)',
  염상격: 'Yeomsang (Blazing Fire)',
  가색격: 'Gasaek (Sowing-reaping Earth)',
  종혁격: 'Jonghyeok (Reforming Metal)',
  윤하격: 'Yunha (Flowing Water)',
  // 미정
  미정: 'Undetermined',
}

/**
 * 격국 상태 한 줄 EN — '정인격 · 반성반파 (+투출 / -합거)' 같은 한국어 전용 줄을
 * '이름 · 상태'로 영문화한다. 성패 요인(투출/합거 등)은 수십 개 자유서술 구라
 * EN 맵을 두지 않고 EN 에선 생략(핵심 정보 = 격국명 + 성패는 보존, 한국어 누수 제거).
 * 미상 이름/상태는 각 맵에서 KO 폴백.
 */
export function geokgukStatusLineEn(name: string, status?: string): string {
  const n = GEOKGUK_NAME_EN[name] ?? name
  const s = status ? (GEOKGUK_STATUS_EN[status] ?? status) : ''
  return s ? `${n} · ${s}` : n
}

/**
 * 신살 KO→EN. interpretations.json shinsal 의 name_en 을 기준으로 흔한 것들을
 * 담았다(별칭 ~살 포함). 미상은 호출부에서 KO 폴백.
 */
export const SHINSAL_EN: Record<string, string> = {
  겁살: 'Robbery Star',
  도화: 'Peach Blossom',
  역마: 'Traveling Horse',
  화개: 'Floral Canopy',
  천을귀인: 'Heavenly Benefactor',
  양인: 'Blade Edge',
  백호: 'White Tiger',
  백호살: 'White Tiger',
  괴강: 'Strong-Willed Star',
  괴강살: 'Strong-Willed Star',
  문창: 'Literary Star',
  문창귀인: 'Literary Star',
  문곡: 'Literary Arts Star',
  천덕: 'Heavenly Virtue',
  천덕귀인: 'Heavenly Virtue',
  월덕: 'Monthly Virtue',
  월덕귀인: 'Monthly Virtue',
  학당귀인: "Scholar's Hall",
  장성: 'General Star',
  금여: 'Golden Carriage',
  금여성: 'Golden Carriage Star',
  공망: 'Voidness',
  망신: 'Disgrace Star',
  망신살: 'Disgrace Star',
  원진: 'Resentment Star',
  원진살: 'Resentment Star',
  천라지망: 'Heaven-Earth Net',
  태극귀인: 'Grand Polarity Star',
  복성귀인: 'Fortune Star',
  천의성: 'Healer Star',
  암록: 'Hidden Stipend',
  홍염살: 'Red Charm Star',
  귀문관: 'Spirit Gate',
  현침: 'Hanging Needle Star',
  고신: 'Solitary Star',
  재살: 'Disaster Star',
  천살: 'Heavenly Disaster Star',
  월살: 'Withering Star',
  년살: 'Year Star',
  지살: 'Earth Star',
  육해: 'Six Harms Star',
  반안: 'Saddle Star',
  삼재: 'Three Calamities Period',
  // 12운성 강왕 단계가 신살 목록에 함께 잡히는 경우(interpretations.json name_en 일치).
  제왕: 'Sovereign',
  건록: 'Office Entry',
}

/** 신살 EN 치환 — strip 트레일링 '살' 후 재시도, 미상은 KO 그대로. */
export function shinsalEn(name: string): string {
  return SHINSAL_EN[name] ?? SHINSAL_EN[name.replace(/살$/, '')] ?? name
}

/** 격국 성패 단어 EN 치환 — 미상은 KO 그대로. */
export function geokgukStatusEn(status: string): string {
  return GEOKGUK_STATUS_EN[status] ?? status
}

// ============================================================================
// '본명 상세' 접힘 섹션 — 지장간·12운성·응용격국 EN 치환.
// 누락 5신호 노출용. 모두 결정론적 고정 맵(엔진 무수정).
// ============================================================================

/** 오행 KO→EN. */
const ELEMENT_EN: Record<string, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}
export function elementEn(el: string): string {
  return ELEMENT_EN[el] ?? el
}

/** 지장간 층(정기/중기/여기) KO→EN. */
const JIJANGGAN_LAYER_EN: Record<string, string> = {
  정기: 'Primary',
  중기: 'Mid',
  여기: 'Residual',
}
export function jijangganLayerEn(layer: string): string {
  return JIJANGGAN_LAYER_EN[layer] ?? layer
}

/** 12운성 단계 KO→EN (별칭 건록=임관, 제왕=왕지 포함). */
const TWELVE_STAGE_EN: Record<string, string> = {
  장생: 'Birth',
  목욕: 'Bath',
  관대: 'Coming of Age',
  건록: 'Prime',
  임관: 'Prime',
  제왕: 'Peak',
  왕지: 'Peak',
  쇠: 'Decline',
  병: 'Illness',
  사: 'Death',
  묘: 'Tomb',
  절: 'Void',
  태: 'Conception',
  양: 'Nurture',
}
export function twelveStageEn(stage: string): string {
  return TWELVE_STAGE_EN[stage] ?? stage
}

/**
 * 응용격국 8종 — EN 이름 + 한 줄 뜻. KO 는 데이터의 korean/rule 을 그대로 쓰고,
 * EN 은 rule 이 한글뿐이라 여기 고정 글로스를 쓴다(EN 누출 방지).
 */
export const APPLIED_PATTERN_EN: Record<string, { name: string; gloss: string }> = {
  'sanggwan-gyeon-gwan': {
    name: 'Hurting Officer meets Officer',
    gloss: 'talent rubs against rules — friction with authority',
  },
  'siksin-jesal': {
    name: 'Eating God controls the Killing',
    gloss: 'creative output tames pressure — stress turned productive',
  },
  'gwanin-sangsaeng': {
    name: 'Officer feeds Resource',
    gloss: 'authority and learning reinforce — status through study',
  },
  'jaesaeng-gwan': {
    name: 'Wealth generates Officer',
    gloss: 'resources build standing — money supports position',
  },
  'insaeng-bigeop': {
    name: 'Resource feeds Peers',
    gloss: 'support strengthens the self and allies',
  },
  'bigeop-talJae': {
    name: 'Peers rob Wealth',
    gloss: 'rivals and expenses drain resources — guard money',
  },
  'gwansal-honjap': {
    name: 'Officer and Killing mixed',
    gloss: 'conflicting demands from authority — keep boundaries clear',
  },
  'hyosik-tal': {
    name: 'Indirect Resource steals the Eating God',
    gloss: 'over-thinking smothers output — just ship it',
  },
}
export function appliedPatternEn(id: string): { name: string; gloss: string } | undefined {
  return APPLIED_PATTERN_EN[id]
}
