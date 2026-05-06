/**
 * Signal Language
 *
 * Translates raw engine signal artifacts into plain Korean prose so the
 * report doesn't leak engine output ("Jupiter in H10", "지지삼합 (亥·卯·未
 * 삼합(목))") into the reader's face.
 *
 * Three normalizers:
 *   - humanizeKeyword(raw)    — short hero phrase per signal
 *   - humanizeSajuBasis(raw)  — Saju basis line in plain Korean
 *   - humanizeAstroBasis(raw) — Astro basis line in plain Korean
 *
 * Each normalizer is idempotent: if the input is already humanized,
 * the function leaves it alone (no double-prefixing).
 */

// ============================================
// Keyword normalization
// ============================================

/**
 * Curated map of common engine keywords to short Korean hero phrases.
 * Keywords NOT in this map are returned as-is (they're already terse
 * Korean from the engine — only the ambiguous ones need help).
 */
const KEYWORD_HUMAN: Record<string, string> = {
  // Synergy / harmony
  최상조화: '최상의 조화 (강력한 시너지)',
  극강시너지: '강한 시너지',
  영적예술: '영성·예술 조화',
  귀인조력: '귀인의 조력',
  대길귀인: '대길귀인 (외부 멘토 운)',

  // Risk / conflict
  극심충돌: '심한 충돌 신호',
  파괴위험: '파괴 위험 신호',
  극단: '극단으로 치우치는 경향',
  충돌: '충돌 신호',
  손실: '손실 가능성',
  날카: '날카로운 결정 패턴',
  좌절: '좌절·정체 신호',

  // Ten-gods activations (십신 발현)
  횡재: '예상 밖 보상 (편재 발현)',
  양육: '돌봄·학습 욕구 (정인 발현)',
  학위: '권위·인정 추구 (정관 발현)',
  결혼: '안정 결합 욕구 (정재 발현)',
  혁신: '새 길 모색 (식상 발현)',

  // Voids / gaps
  자아공백: '자아 정체성 공백',
  희망공백: '비전·희망 공백',
  관계공백: '인간관계 공백',
  커리어공백: '커리어 방향성 공백',
  가정공백: '가정·뿌리 공백',
  학업공백: '학습·성장 공백',
  행동속박: '행동력 묶임',

  // Balance
  균형: '균형 상태',
}

const ELEMENT_DOM_HUMAN: Record<string, string> = {
  fire: '불 원소 우세 (열정·추진)',
  earth: '흙 원소 우세 (실용·안정)',
  air: '공기 원소 우세 (소통·사고)',
  water: '물 원소 우세 (감정·직관)',
}

export function humanizeKeyword(raw: string | undefined): string {
  const v = (raw || '').trim()
  if (!v) return ''
  if (KEYWORD_HUMAN[v]) return KEYWORD_HUMAN[v]

  // "Dominant element air" → "공기 원소 우세 (소통·사고)"
  const dom = v.match(/^Dominant\s+element\s+(fire|earth|air|water)$/i)
  if (dom) {
    return ELEMENT_DOM_HUMAN[dom[1].toLowerCase()] || v
  }

  // "Jupiter-Saturn square" → "목성–토성 긴장각"
  const aspect = v.match(
    /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)-([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(conjunction|sextile|square|trine|opposition)$/
  )
  if (aspect) {
    const labels: Record<string, string> = {
      conjunction: '합 (강력 결합)',
      sextile: '협력각 (60°)',
      square: '긴장각 (90°)',
      trine: '조화각 (120°)',
      opposition: '대립각 (180°)',
    }
    const p1 = PLANET_KO[aspect[1]] || aspect[1]
    const p2 = PLANET_KO[aspect[2]] || aspect[2]
    return `${p1}–${p2} ${labels[aspect[3]] || aspect[3]}`
  }

  // "Venus in H11" → "금성이 친구·미래 비전·집단 영역"
  const housePos = v.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+in\s+H(\d{1,2})$/)
  if (housePos) {
    const planet = PLANET_KO[housePos[1]] || housePos[1]
    const house = HOUSE_KO[housePos[2]] || `${housePos[2]}하우스`
    return `${planet}이 ${house}에 자리`
  }

  return v
}

// ============================================
// Saju basis normalization
// ============================================

const SHINSAL_HUMAN: Record<string, string> = {
  천을귀인: '천을귀인 (결정적 순간 외부 멘토 등장 운)',
  화개: '화개 (영성·예술·고독 기운)',
  도화: '도화 (매력·표현·인기 기운)',
  역마: '역마 (이동·여행·환경 변화)',
  현침: '현침 (날카로운 분별·결정력)',
  공망: '공망 (해당 자리 비어 있음)',
  양인: '양인 (강한 의지·자기 주장)',
  천라지망: '천라지망 (속박·제한 신호)',
  문창: '문창 (학문·표현 기운)',
}

const SIBSIN_HUMAN: Record<string, string> = {
  정관: '정관 (권위·책임·명분)',
  편관: '편관 (압박·도전·강제)',
  정인: '정인 (학습·돌봄·기준선)',
  편인: '편인 (직관·사색·고독)',
  식신: '식신 (표현·여유·자족)',
  상관: '상관 (재능·반항·창조)',
  정재: '정재 (안정·실리·결합)',
  편재: '편재 (외부 보상·기회·횡재)',
  비견: '비견 (자아·동료·경쟁)',
  겁재: '겁재 (강한 자아·재물 갈등)',
}

const TWELVE_STAGE_HUMAN: Record<string, string> = {
  장생: '12운성 장생 (시작·생명력)',
  목욕: '12운성 목욕 (정화·재정비)',
  관대: '12운성 관대 (성장·확립)',
  건록: '12운성 건록 (안정·번영)',
  제왕: '12운성 제왕 (정점·강함)',
  쇠: '12운성 쇠 (안정에서 약화)',
  병: '12운성 병 (조정 필요)',
  사: '12운성 사 (정체·휴식)',
  묘: '12운성 묘 (수렴·정리)',
  절: '12운성 절 (단절·전환)',
  태: '12운성 태 (잉태·준비)',
  양: '12운성 양 (양육·성숙)',
}

const ELEMENT_HUMAN: Record<string, string> = {
  목: '목 기운 (성장·확장)',
  화: '화 기운 (열정·확산)',
  토: '토 기운 (안정·중심)',
  금: '금 기운 (분별·결단)',
  수: '수 기운 (지혜·흐름)',
}

const GEOKGUK_HUMAN: Record<string, string> = {
  정관격: '정관격 (안정·명예 추구)',
  편관격: '편관격 (도전·책임 추구)',
  정인격: '정인격 (학습·전문성 추구)',
  편인격: '편인격 (직관·사색 추구)',
  식신격: '식신격 (자기 표현·여유 추구)',
  상관격: '상관격 (재능·창조성 추구)',
  정재격: '정재격 (안정·실리 추구)',
  편재격: '편재격 (외부 기회·확장 추구)',
  건록격: '건록격 (자기 주도·안정 균형)',
  양인격: '양인격 (강한 자아·돌파)',
  종아격: '종아격 (표현·자족)',
  종재격: '종재격 (재물 흐름 따라감)',
  종살격: '종살격 (외부 권위에 순응)',
  종강격: '종강격 (내면 강함 따라감)',
  종왕격: '종왕격 (자기 강함 따라감)',
}

export function humanizeSajuBasis(raw: string | undefined): string {
  const v = (raw || '').trim()
  if (!v) return ''

  // 지지삼합 (亥·卯·未 삼합(목))
  const samhap = v.match(/지지삼합\s*\(\s*([^·)]+)·([^·)]+)·([^·)]+)\s*삼합\(([^)]+)\)\)/)
  if (samhap) {
    const elemHuman = ELEMENT_HUMAN[samhap[4].trim()] || samhap[4]
    return `지지삼합 ${samhap[1].trim()}${samhap[2].trim()}${samhap[3].trim()} (${elemHuman} 결집)`
  }

  // 천간충 (乙-辛 충)
  const cheongan = v.match(/천간충\s*\(\s*([^-]+)-([^\s)]+)\s*충\)/)
  if (cheongan) {
    return `천간충 ${cheongan[1]}-${cheongan[2]} (원칙·결정 충돌)`
  }

  // 지지충 (子-午 충)
  const jiji = v.match(/지지충\s*\(\s*([^-]+)-([^\s)]+)\s*충\)/)
  if (jiji) {
    return `지지충 ${jiji[1]}-${jiji[2]} (현실·실행 충돌)`
  }

  // 신살 X
  const shinsal = v.match(/^신살\s+(.+)$/)
  if (shinsal) {
    const name = shinsal[1].trim()
    return SHINSAL_HUMAN[name] || `신살 ${name}`
  }

  // 십신 X
  const sibsin = v.match(/^십신\s+(.+)$/)
  if (sibsin) {
    const name = sibsin[1].trim()
    return SIBSIN_HUMAN[name] || `십신 ${name}`
  }

  // 십이운성 X
  const stage = v.match(/^십이운성\s+(.+)$/)
  if (stage) {
    const name = stage[1].trim()
    return TWELVE_STAGE_HUMAN[name] || `12운성 ${name}`
  }

  // 사주 X (오행 우세)
  const elemBalance = v.match(/^사주\s+([목화토금수])$/)
  if (elemBalance) {
    return `사주 오행 ${ELEMENT_HUMAN[elemBalance[1]] || elemBalance[1]} 우세`
  }

  // geokguk=X
  const geo = v.match(/^geokguk=(.+)$/)
  if (geo) {
    const name = geo[1].trim()
    return GEOKGUK_HUMAN[name] || `격국 ${name}`
  }

  // yongsin=X
  const yong = v.match(/^yongsin=([목화토금수])$/)
  if (yong) {
    return `용신 ${ELEMENT_HUMAN[yong[1]] || yong[1]} (균형 핵심)`
  }

  // daeun=X
  const daeun = v.match(/^daeun=([목화토금수])$/)
  if (daeun) {
    return `현재 대운 ${ELEMENT_HUMAN[daeun[1]] || daeun[1]} 색`
  }

  // dayMaster=금 × dominantWesternElement=air
  const cross = v.match(/^dayMaster=([목화토금수])\s*[×x]\s*dominantWesternElement=(fire|earth|air|water)$/i)
  if (cross) {
    const dayElem = ELEMENT_HUMAN[cross[1]] || cross[1]
    const westMap: Record<string, string> = {
      fire: '불(열정·추진)',
      earth: '흙(실용·안정)',
      air: '공기(소통·사고)',
      water: '물(감정·직관)',
    }
    return `사주 일간 ${dayElem} × 점성 ${westMap[cross[2].toLowerCase()] || cross[2]} 우세`
  }

  return v
}

// ============================================
// Astro basis normalization
// ============================================

const PLANET_KO: Record<string, string> = {
  Sun: '태양',
  Moon: '달',
  Mercury: '수성',
  Venus: '금성',
  Mars: '화성',
  Jupiter: '목성',
  Saturn: '토성',
  Uranus: '천왕성',
  Neptune: '해왕성',
  Pluto: '명왕성',
  TrueNode: '사명 자리',
  'True Node': '사명 자리',
  Node: '사명 자리',
  NorthNode: '북교점',
  SouthNode: '남교점',
}

const ASPECT_KO: Record<string, string> = {
  conjunction: '합 (0°, 동일 자리에서 강력 결합)',
  sextile: '60° (부드러운 협력각)',
  square: '90° (긴장·압박각)',
  trine: '120° (조화·흐름각)',
  opposition: '180° (대립·균형 시험각)',
}

const HOUSE_KO: Record<string, string> = {
  '1': '자아·외모 영역',
  '2': '돈·자원·가치관 영역',
  '3': '소통·학습·근거리 영역',
  '4': '집·가족·뿌리 영역',
  '5': '연애·창작·즐거움 영역',
  '6': '업무·건강·일상 영역',
  '7': '파트너십·결혼·계약 영역',
  '8': '깊은 결합·변형·공동 자원 영역',
  '9': '신념·여행·고등학습 영역',
  '10': '직업·명예·사회적 위치 영역',
  '11': '친구·미래 비전·집단 영역',
  '12': '영성·잠재의식·은둔 영역',
}

function lookupPlanet(name: string): string {
  const trimmed = name.trim()
  return PLANET_KO[trimmed] || trimmed
}

export function humanizeAstroBasis(raw: string | undefined): string {
  const v = (raw || '').trim()
  if (!v) return ''

  // X-Y aspect angle=N°deg orb=O.OOdeg allowed=A°deg
  const aspectMatch = v.match(
    /^([A-Za-z][A-Za-z\s]*?)-([A-Za-z][A-Za-z\s]*?)\s+(conjunction|sextile|square|trine|opposition)\s+angle=(\d+)deg\s+orb=([\d.]+)deg/
  )
  if (aspectMatch) {
    const p1 = lookupPlanet(aspectMatch[1])
    const p2 = lookupPlanet(aspectMatch[2])
    const aspect = ASPECT_KO[aspectMatch[3]] || aspectMatch[3]
    const orb = aspectMatch[5]
    return `${p1}–${p2} ${aspect}, 오브 ${orb}° (정확할수록 강한 작동)`
  }

  // Planet in H<n>
  const houseMatch = v.match(/^([A-Za-z][A-Za-z\s]*?)\s+in\s+H(\d{1,2})$/)
  if (houseMatch) {
    const planet = lookupPlanet(houseMatch[1])
    const house = HOUSE_KO[houseMatch[2]] || `${houseMatch[2]}하우스`
    return `${planet}이 ${house}에 자리`
  }

  // 점성 X (element)
  const elemMatch = v.match(/^점성\s+(fire|earth|air|water)$/i)
  if (elemMatch) {
    const map: Record<string, string> = {
      fire: '불 원소 (열정·추진)',
      earth: '흙 원소 (실용·안정)',
      air: '공기 원소 (소통·사고)',
      water: '물 원소 (감정·직관)',
    }
    return `점성 ${map[elemMatch[1].toLowerCase()] || elemMatch[1]} 우세`
  }

  // Plain "Dominant element <e>"
  const dom = v.match(/^Dominant\s+element\s+(fire|earth|air|water)$/i)
  if (dom) {
    return humanizeAstroBasis(`점성 ${dom[1]}`)
  }

  return v
}
