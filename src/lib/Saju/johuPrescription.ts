// src/lib/Saju/johuPrescription.ts
//
// 궁통보감 정통 처방 KB — 일간×월령에 대한 *천간 단위* 우선순위 처방.
// `johuYongsin.ts`의 오행 단위 lookup 위에 한 단계 더 깊은 처방 layer.
//
// 1995-02-09(寅月 辛金) 같은 case에 정통 처방
// "己土→庚金→壬水 우선순위" 출력 가능.

import type { FiveElement } from './types'

const ELEMENT_OF_STEM: Record<string, FiveElement> = {
  甲: '목', 乙: '목',
  丙: '화', 丁: '화',
  戊: '토', 己: '토',
  庚: '금', 辛: '금',
  壬: '수', 癸: '수',
}

const STEM_LUCKY_COLORS: Record<string, string[]> = {
  甲: ['초록(딥)', '청록'],
  乙: ['연두', '민트'],
  丙: ['빨강(밝은)', '주황'],
  丁: ['진홍', '와인'],
  戊: ['황토', '갈색'],
  己: ['베이지', '아이보리'],
  庚: ['은색', '회색(차가운)'],
  辛: ['화이트', '실버 핑크'],
  壬: ['짙은 남색', '검정'],
  癸: ['회색(부드러운)', '슬레이트'],
}

const STEM_LUCKY_DIRECTION: Record<string, string> = {
  甲: '동(東)', 乙: '동남(東南)',
  丙: '남(南)', 丁: '남(南)',
  戊: '중앙·남서(中央·南西)', 己: '중앙·동북(中央·東北)',
  庚: '서(西)', 辛: '서북(西北)',
  壬: '북(北)', 癸: '북동(北東)',
}

const STEM_LUCKY_HOUR: Record<string, string> = {
  甲: '인시(03-05)·묘시(05-07)',
  乙: '묘시(05-07)·진시(07-09)',
  丙: '사시(09-11)·오시(11-13)',
  丁: '오시(11-13)·미시(13-15)',
  戊: '진시(07-09)·술시(19-21)',
  己: '축시(01-03)·미시(13-15)',
  庚: '신시(15-17)·유시(17-19)',
  辛: '유시(17-19)·술시(19-21)',
  壬: '해시(21-23)·자시(23-01)',
  癸: '자시(23-01)·축시(01-03)',
}

export interface JohuPrescription {
  /** 일간×월령에 대한 정통 처방 천간 우선순위 */
  prescriptionStems: string[]
  /** 각 처방 천간의 역할 (한 줄씩) */
  stemRoles: Record<string, string>
  /** 사용자 친화 처방 한 줄 */
  prescriptionLine: string
  /** 격국·강약별 색·방향·시간 추천 */
  recommendation: {
    colors: string[]
    direction: string
    bestHour: string
    /** 격국이 정통 + 신약일 때 추가 권고 */
    geokgukNote?: string
    /** 비가역 행동 가드 */
    irreversibleAction: string
  }
}

/**
 * 정통 궁통보감 천간 우선순위 처방 KB.
 * Key: `${dayStem}_${monthBranch}` (예: '辛_寅').
 * 핵심 케이스 위주 (10일간 × 12월령 중 정통적으로 명시된 곳).
 */
const PRESCRIPTION_KB: Record<string, { stems: string[]; roles: Record<string, string> }> = {
  // 甲木
  甲_寅: { stems: ['丙', '癸'], roles: { 丙: '한기 해소·발양', 癸: '뿌리 자양' } },
  甲_卯: { stems: ['庚', '丙'], roles: { 庚: '제련 (가장 중요)', 丙: '발산' } },
  甲_辰: { stems: ['庚', '丁'], roles: { 庚: '제련', 丁: '단련 보조' } },
  甲_巳: { stems: ['癸', '庚'], roles: { 癸: '윤택', 庚: '수원 생성' } },
  甲_午: { stems: ['癸', '丁', '庚'], roles: { 癸: '급히 필요', 丁: '제어', 庚: '수원' } },
  甲_未: { stems: ['癸', '丁', '庚'], roles: { 癸: '윤택', 丁: '제어', 庚: '제련' } },
  甲_申: { stems: ['丁', '庚'], roles: { 丁: '제련 (申金 재제련)', 庚: '있을 때 같이 씀' } },
  甲_酉: { stems: ['丁', '丙'], roles: { 丁: '제련', 丙: '한기 해소' } },
  甲_戌: { stems: ['丁', '癸'], roles: { 丁: '제련 (戌중 丁 인용)', 癸: '윤택' } },
  甲_亥: { stems: ['庚', '丙'], roles: { 庚: '제련', 丙: '온화' } },
  甲_子: { stems: ['丁', '丙'], roles: { 丁: '제련', 丙: '한해소' } },
  甲_丑: { stems: ['丁', '庚', '丙'], roles: { 丁: '제련', 庚: '재제련', 丙: '해동' } },

  // 乙木
  乙_寅: { stems: ['丙', '癸'], roles: { 丙: '발양', 癸: '윤택' } },
  乙_卯: { stems: ['丙', '癸'], roles: { 丙: '발산', 癸: '뿌리' } },
  乙_辰: { stems: ['癸', '丙'], roles: { 癸: '습토 윤택', 丙: '발산' } },
  乙_巳: { stems: ['癸', '丙'], roles: { 癸: '필수', 丙: '약하게' } },
  乙_午: { stems: ['癸', '丙'], roles: { 癸: '극열에서 필수', 丙: '보조' } },
  乙_未: { stems: ['癸', '丙'], roles: { 癸: '윤택', 丙: '발산' } },
  乙_申: { stems: ['丙', '癸', '己'], roles: { 丙: '한해소', 癸: '윤택', 己: '뿌리 자양' } },
  乙_酉: { stems: ['癸', '丙'], roles: { 癸: '윤택', 丙: '발양' } },
  乙_戌: { stems: ['癸', '辛'], roles: { 癸: '윤택', 辛: '제련 보조' } },
  乙_亥: { stems: ['丙', '戊'], roles: { 丙: '온화', 戊: '제수' } },
  乙_子: { stems: ['丙', '戊'], roles: { 丙: '온화', 戊: '제수' } },
  乙_丑: { stems: ['丙', '戊'], roles: { 丙: '해동', 戊: '제수' } },

  // 丙火
  丙_寅: { stems: ['壬', '庚'], roles: { 壬: '제어', 庚: '수원' } },
  丙_卯: { stems: ['壬', '己'], roles: { 壬: '제어', 己: '설기' } },
  丙_辰: { stems: ['壬', '甲'], roles: { 壬: '제어', 甲: '신약 시 인성' } },
  丙_巳: { stems: ['壬', '庚'], roles: { 壬: '제어', 庚: '수원' } },
  丙_午: { stems: ['壬', '庚'], roles: { 壬: '극열 제어', 庚: '수원' } },
  丙_未: { stems: ['壬', '庚'], roles: { 壬: '제어', 庚: '수원' } },
  丙_申: { stems: ['壬', '甲'], roles: { 壬: '제어', 甲: '근원' } },
  丙_酉: { stems: ['壬', '甲'], roles: { 壬: '제어', 甲: '인성' } },
  丙_戌: { stems: ['甲', '壬'], roles: { 甲: '인성', 壬: '약하게 제어' } },
  丙_亥: { stems: ['甲', '戊'], roles: { 甲: '한해소', 戊: '제수' } },
  丙_子: { stems: ['甲', '戊'], roles: { 甲: '한해소', 戊: '제수' } },
  丙_丑: { stems: ['甲', '壬'], roles: { 甲: '해동', 壬: '약하게' } },

  // 丁火
  丁_寅: { stems: ['庚', '甲'], roles: { 庚: '제련 재료', 甲: '땔감' } },
  丁_卯: { stems: ['庚', '甲'], roles: { 庚: '제련', 甲: '땔감' } },
  丁_辰: { stems: ['甲', '庚'], roles: { 甲: '땔감', 庚: '제련' } },
  丁_巳: { stems: ['甲', '庚'], roles: { 甲: '땔감', 庚: '제련' } },
  丁_午: { stems: ['壬', '甲'], roles: { 壬: '극열 제어', 甲: '인성' } },
  丁_未: { stems: ['甲', '壬'], roles: { 甲: '땔감', 壬: '제어' } },
  丁_申: { stems: ['甲', '庚'], roles: { 甲: '땔감', 庚: '제련' } },
  丁_酉: { stems: ['甲', '庚'], roles: { 甲: '땔감', 庚: '제련' } },
  丁_戌: { stems: ['甲', '庚'], roles: { 甲: '땔감', 庚: '제련' } },
  丁_亥: { stems: ['甲', '庚'], roles: { 甲: '땔감', 庚: '제련' } },
  丁_子: { stems: ['甲', '庚'], roles: { 甲: '한해소·땔감', 庚: '제련' } },
  丁_丑: { stems: ['甲', '庚'], roles: { 甲: '해동·땔감', 庚: '제련' } },

  // 戊土
  戊_寅: { stems: ['丙', '甲', '癸'], roles: { 丙: '한해소', 甲: '소토', 癸: '윤택' } },
  戊_卯: { stems: ['丙', '甲', '癸'], roles: { 丙: '발양', 甲: '소토', 癸: '윤택' } },
  戊_辰: { stems: ['甲', '丙', '癸'], roles: { 甲: '소토', 丙: '발산', 癸: '윤택' } },
  戊_巳: { stems: ['甲', '癸', '丙'], roles: { 甲: '소토', 癸: '윤택', 丙: '약하게' } },
  戊_午: { stems: ['壬', '甲', '癸'], roles: { 壬: '윤택', 甲: '소토', 癸: '약윤택' } },
  戊_未: { stems: ['甲', '癸', '丙'], roles: { 甲: '소토', 癸: '윤택', 丙: '발산' } },
  戊_申: { stems: ['丙', '甲', '癸'], roles: { 丙: '한해소', 甲: '소토', 癸: '윤택' } },
  戊_酉: { stems: ['丙', '癸'], roles: { 丙: '발양', 癸: '윤택' } },
  戊_戌: { stems: ['甲', '丙', '癸'], roles: { 甲: '소토', 丙: '발양', 癸: '윤택' } },
  戊_亥: { stems: ['甲', '丙'], roles: { 甲: '소토', 丙: '한해소' } },
  戊_子: { stems: ['丙', '甲'], roles: { 丙: '한해소', 甲: '소토' } },
  戊_丑: { stems: ['丙', '甲'], roles: { 丙: '해동', 甲: '소토' } },

  // 己土
  己_寅: { stems: ['丙', '庚', '甲'], roles: { 丙: '한해소', 庚: '소토', 甲: '제극' } },
  己_卯: { stems: ['丙', '癸'], roles: { 丙: '발양', 癸: '윤택' } },
  己_辰: { stems: ['丙', '癸', '甲'], roles: { 丙: '발양', 癸: '윤택', 甲: '소토' } },
  己_巳: { stems: ['癸', '丙'], roles: { 癸: '윤택', 丙: '발산' } },
  己_午: { stems: ['癸', '丙'], roles: { 癸: '극열 윤택', 丙: '약화' } },
  己_未: { stems: ['癸', '丙'], roles: { 癸: '윤택', 丙: '발산' } },
  己_申: { stems: ['丙', '癸'], roles: { 丙: '발양', 癸: '윤택' } },
  己_酉: { stems: ['丙', '癸'], roles: { 丙: '발양', 癸: '윤택' } },
  己_戌: { stems: ['甲', '丙', '癸'], roles: { 甲: '소토', 丙: '발산', 癸: '윤택' } },
  己_亥: { stems: ['丙', '甲'], roles: { 丙: '한해소', 甲: '뿌리' } },
  己_子: { stems: ['丙', '甲'], roles: { 丙: '한해소', 甲: '뿌리' } },
  己_丑: { stems: ['丙', '甲'], roles: { 丙: '해동', 甲: '소토' } },

  // 庚金
  庚_寅: { stems: ['丙', '甲', '壬'], roles: { 丙: '한해소', 甲: '제목', 壬: '제련 보조' } },
  庚_卯: { stems: ['丁', '甲'], roles: { 丁: '제련', 甲: '재료' } },
  庚_辰: { stems: ['甲', '丁', '壬'], roles: { 甲: '재목', 丁: '제련', 壬: '도세' } },
  庚_巳: { stems: ['壬', '丙'], roles: { 壬: '도세 (제련 후 식힘)', 丙: '있을 때만' } },
  庚_午: { stems: ['壬', '癸'], roles: { 壬: '극열 제어', 癸: '윤택' } },
  庚_未: { stems: ['丁', '甲'], roles: { 丁: '제련', 甲: '재목' } },
  庚_申: { stems: ['丁', '甲'], roles: { 丁: '제련', 甲: '재목' } },
  庚_酉: { stems: ['丁', '甲', '丙'], roles: { 丁: '제련', 甲: '재목', 丙: '발양' } },
  庚_戌: { stems: ['甲', '壬'], roles: { 甲: '재목', 壬: '도세' } },
  庚_亥: { stems: ['丁', '丙'], roles: { 丁: '제련', 丙: '한해소' } },
  庚_子: { stems: ['丁', '丙'], roles: { 丁: '제련', 丙: '한해소' } },
  庚_丑: { stems: ['丁', '丙'], roles: { 丁: '제련', 丙: '해동' } },

  // 辛金 — 1995-02-09 사용자 케이스 정통 처방
  辛_寅: { stems: ['己', '庚', '壬'], roles: { 己: '인성 자양', 庚: '비겁 보조', 壬: '식상 세련' } },
  辛_卯: { stems: ['壬', '甲'], roles: { 壬: '도세', 甲: '재' } },
  辛_辰: { stems: ['壬', '甲'], roles: { 壬: '습토 도세', 甲: '재' } },
  辛_巳: { stems: ['壬', '癸'], roles: { 壬: '제어', 癸: '윤택' } },
  辛_午: { stems: ['壬', '己'], roles: { 壬: '극열 제어', 己: '인성' } },
  辛_未: { stems: ['壬', '甲'], roles: { 壬: '도세', 甲: '재' } },
  辛_申: { stems: ['壬', '甲'], roles: { 壬: '도세', 甲: '재' } },
  辛_酉: { stems: ['壬', '甲'], roles: { 壬: '도세', 甲: '재' } },
  辛_戌: { stems: ['壬', '甲'], roles: { 壬: '도세', 甲: '재' } },
  辛_亥: { stems: ['壬', '丙'], roles: { 壬: '도세', 丙: '한해소' } },
  辛_子: { stems: ['丙', '壬'], roles: { 丙: '한해소', 壬: '도세' } },
  辛_丑: { stems: ['丙', '壬'], roles: { 丙: '해동', 壬: '도세' } },

  // 壬水
  壬_寅: { stems: ['丙', '戊', '庚'], roles: { 丙: '한해소', 戊: '제수', 庚: '근원' } },
  壬_卯: { stems: ['戊', '辛'], roles: { 戊: '제수', 辛: '근원' } },
  壬_辰: { stems: ['甲', '庚'], roles: { 甲: '소토', 庚: '근원' } },
  壬_巳: { stems: ['壬', '辛', '癸'], roles: { 壬: '비겁', 辛: '근원', 癸: '겁재' } },
  壬_午: { stems: ['庚', '辛', '壬'], roles: { 庚: '근원', 辛: '근원', 壬: '비겁' } },
  壬_未: { stems: ['辛', '甲'], roles: { 辛: '근원', 甲: '소토' } },
  壬_申: { stems: ['戊', '丁'], roles: { 戊: '제수', 丁: '제련' } },
  壬_酉: { stems: ['甲', '庚'], roles: { 甲: '식상', 庚: '근원' } },
  壬_戌: { stems: ['甲', '丙'], roles: { 甲: '재', 丙: '발양' } },
  壬_亥: { stems: ['戊', '丙'], roles: { 戊: '제수', 丙: '한해소' } },
  壬_子: { stems: ['戊', '丙'], roles: { 戊: '제수', 丙: '한해소' } },
  壬_丑: { stems: ['丙', '甲'], roles: { 丙: '해동', 甲: '소토' } },

  // 癸水
  癸_寅: { stems: ['丙', '辛'], roles: { 丙: '한해소', 辛: '근원' } },
  癸_卯: { stems: ['庚', '辛'], roles: { 庚: '근원', 辛: '근원' } },
  癸_辰: { stems: ['丙', '辛'], roles: { 丙: '발양', 辛: '근원' } },
  癸_巳: { stems: ['辛', '庚'], roles: { 辛: '근원', 庚: '근원' } },
  癸_午: { stems: ['庚', '壬', '癸'], roles: { 庚: '근원', 壬: '비겁', 癸: '비겁' } },
  癸_未: { stems: ['庚', '辛'], roles: { 庚: '근원', 辛: '근원' } },
  癸_申: { stems: ['丁', '甲'], roles: { 丁: '재', 甲: '식상' } },
  癸_酉: { stems: ['辛', '丙'], roles: { 辛: '근원', 丙: '발양' } },
  癸_戌: { stems: ['辛', '甲'], roles: { 辛: '근원', 甲: '식상' } },
  癸_亥: { stems: ['庚', '辛', '丙'], roles: { 庚: '근원', 辛: '근원', 丙: '한해소' } },
  癸_子: { stems: ['丙', '辛'], roles: { 丙: '한해소', 辛: '근원' } },
  癸_丑: { stems: ['丙', '丁'], roles: { 丙: '해동', 丁: '재' } },
}

interface PrescriptionInput {
  dayStem: string
  monthBranch: string
  geokguk?: string
  strength?: string
}

/**
 * 정통 궁통보감 천간 단위 처방 + 격국·강약별 차별화 색·방향·시간 +
 * 비가역 행동 가드.
 *
 * 1995-02-09 (辛_寅, 정인격, 신강) 케이스에선:
 *   stems: ['己', '庚', '壬']
 *   colors: 베이지·아이보리 + 은색·회색 + 짙은 남색 (각 처방 천간의 색)
 *   irreversibleAction: '신강 + 정인격 → 인성 활용으로 안정. 무리한 확장
 *     자제. 큰 계약·이주는 식상(壬水) 활성기에 한 번 더 점검.'
 */
export function getJohuPrescription(input: PrescriptionInput): JohuPrescription | null {
  const key = `${input.dayStem}_${input.monthBranch}`
  const entry = PRESCRIPTION_KB[key]
  if (!entry) return null

  const stems = entry.stems
  const stemRoles = entry.roles

  // 색·방향·시간은 1순위 처방 천간 기준.
  const primary = stems[0]
  const colors = STEM_LUCKY_COLORS[primary] || []
  const direction = STEM_LUCKY_DIRECTION[primary] || ''
  const bestHour = STEM_LUCKY_HOUR[primary] || ''

  // 격국·강약별 추가 권고.
  const geokgukNote = buildGeokgukNote(input.geokguk, input.strength)
  const irreversibleAction = buildIrreversibleGuard(stems, stemRoles, input.geokguk, input.strength)

  // 처방 한 줄.
  const prescriptionLine = stems
    .map((s) => `${s}(${stemRoles[s] || ''})`)
    .join(' → ')

  return {
    prescriptionStems: stems,
    stemRoles,
    prescriptionLine,
    recommendation: {
      colors,
      direction,
      bestHour,
      geokgukNote,
      irreversibleAction,
    },
  }
}

function buildGeokgukNote(geokguk?: string, strength?: string): string | undefined {
  if (!geokguk) return undefined
  const isStrong = /신강|중강|강함|jonggang|jonggwang|^strong$/i.test(strength || '')
  const isWeak = /신약|중약|약함|^weak$/i.test(strength || '')

  // 정통 자평진전 reverse weight 룰.
  if (geokguk.includes('정관')) {
    return isWeak
      ? '정관격 신약 → 인성·비겁 우선. 권력에 정면으로 부딪지 말고 도움받는 결.'
      : '정관격 → 재성·인성으로 보좌. 책임을 단단히 짓는 결.'
  }
  if (geokguk.includes('편관') || geokguk.includes('칠살')) {
    return isWeak
      ? '편관격 신약 → 인화·식제. 압력 정면 X, 우회·단계화.'
      : '편관격 → 식상으로 제살 + 인성으로 화살. 큰일 도맡는 결.'
  }
  if (geokguk.includes('정재') || geokguk.includes('편재')) {
    return isStrong
      ? '재격 신강 → 식상·재 활용 적극. 자기 결실 짓기 좋은 시기.'
      : '재격 신약 → 비겁·인성 보강 후 재 활용. 확장보다 토대 먼저.'
  }
  if (geokguk.includes('정인') || geokguk.includes('편인')) {
    return isStrong
      ? '인격 신강 → 식상으로 설기. 학습·표현·창작이 평생 결.'
      : '인격 신약 → 인성·비겁 보강. 도움받고 배움 우선.'
  }
  if (geokguk.includes('식신') || geokguk.includes('상관')) {
    return isStrong
      ? '식상격 신강 → 재 생성. 자기 표현 → 결실·자원 변환.'
      : '식상격 신약 → 인성으로 제어. 발산 절제, 내실 우선.'
  }
  if (/jonggang|jonggwang|종왕|종강/.test(geokguk)) {
    return '종격 → 흐름 거스르지 말고 그 결대로. 비겁·인성 운에 발복.'
  }
  if (/jongjae|jongsal|jonga|종재|종살|종아/.test(geokguk)) {
    return '종격(외향) → 흐름 따라가는 결. 정통 정격 운(인비) 오면 오히려 충돌.'
  }
  return undefined
}

function buildIrreversibleGuard(
  stems: string[],
  roles: Record<string, string>,
  geokguk?: string,
  strength?: string,
): string {
  const isWeak = /신약|중약|약함|^weak$/i.test(strength || '')
  const primary = stems[0]
  const primaryRole = roles[primary] || ''
  const baseGuard = `처방 1순위 ${primary}(${primaryRole})이 활성될 때까지는 큰 계약·결혼·이주·송금 같은 비가역 행동 한 박자 늦추는 결.`

  if (isWeak) {
    return `${baseGuard} 신약이라 외부 압박 큰 시기엔 도움받는 통로 먼저 확인.`
  }
  if (geokguk?.includes('편관') || geokguk?.includes('칠살')) {
    return `${baseGuard} 편관격은 충동 결정이 가장 큰 손실로 이어지므로 24시간 hold rule 권장.`
  }
  return baseGuard
}
