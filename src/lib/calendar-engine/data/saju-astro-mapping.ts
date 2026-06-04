/**
 * 사주-점성 의미 매핑 사전 (A등급).
 *
 * 사주 십신/신살과 서양 점성 행성 사이의 학파 검증된 의미 대응.
 * "동시 활성" 페어 중 의미상 자연스럽게 강화·간섭하는 조합만 골라
 * cross-activation 신호로 emit 한다.
 *
 * ── 등급 기준 ──
 * A등급: 동·서 양 학파 문헌에서 직접 등치되거나, symbolic correspondence
 *        가 강하고 (예: 정관 = 책임·법·구조 ↔ Saturn = 책임·구조·시간) 둘
 *        다 같은 polarity 방향으로 작동하는 경우.
 *
 * 본 파일은 데이터만 보관 — 매칭 로직은 cross-activation extractor 에 분리.
 *
 * 페어 polarity 합산 모델 (extractor):
 *   pair.polarity = sign(saju.polarity × astro.polarity) × |mapping.polarity|
 * pair.weight  = saju.weight × astro.weight × 0.6 (cross 신호 noise 방지)
 */

import type { Polarity } from '../types'

/** 사주 측의 매칭 키 — 십신 또는 신살명. */
export type SajuMatchKey =
  | '비견' | '겁재' | '식신' | '상관' | '편재' | '정재'
  | '편관' | '정관' | '편인' | '정인'
  | '도화' | '도화살' | '역마' | '역마살' | '건록' | '양인'

/** 점성 측의 매칭 키 — 단일 행성명. astro extractor 가 evidence.planets[0] 에 박는 명칭과 일치. */
export type AstroMatchKey =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'

export type CrossMappingGrade = 'A' | 'B' | 'C'

export interface CrossMapping {
  /** 매칭 키 (사주 측). 십신 또는 신살명. */
  saju: SajuMatchKey
  /** 매칭 키 (점성 측). 단일 행성명. */
  astro: AstroMatchKey
  /** 사용자 노출 의미 한 줄. */
  meaning: { ko: string; en: string }
  /**
   * 매핑 자체의 polarity (의미의 방향).
   *  +: 두 신호가 같은 방향으로 강화 (예: 정인 × Jupiter — 학습·확장).
   *  -: 두 신호가 같은 방향으로 압력 가중 (예: 편관 × Mars — 압박·돌발).
   *   0: 중립적 자원형 (도화 × Venus — 매력·관계).
   *
   * 최종 페어 polarity 는 extractor 가 두 부모 신호 polarity 의 곱셈
   * 부호와 합산해 산출 — 본 값은 의미 톤의 *방향* 만 결정.
   */
  polarity: Polarity
  grade: CrossMappingGrade
  /** 작성자 메모 — 명리/점성 검수용. */
  note?: string
}

/**
 * A등급 매핑 — 학파 검증된 의미 대응.
 *
 * 한 쌍의 (sajuKey, astroKey) 가 둘 다 활성인 셀에서만 cross-activation 신호가
 * 발화. 한 쪽이 missing 이면 emit 하지 않음 — 노이즈 차단.
 */
export const SAJU_ASTRO_MAPPINGS: readonly CrossMapping[] = [
  // ─── 십신 × 행성 (관성 — 책임·압박) ───
  {
    saju: '정관',
    astro: 'Saturn',
    meaning: {
      ko: '정관 × 토성 — 책임·법·구조가 강화되는 시기. 공식 절차·약속을 다지기 좋음.',
      en: 'Right Officer × Saturn — responsibility, law, and structure are reinforced; a window to lock in formal commitments.',
    },
    polarity: 1,
    grade: 'A',
    note: '정관(책임·규범) ↔ Saturn(structure·discipline) 직접 등치. 동·서 모두 +방향.',
  },
  {
    saju: '편관',
    astro: 'Mars',
    meaning: {
      ko: '편관 × 화성 — 강제·압박·돌발 사건의 결이 두 배. 결단은 빠르게, 충돌은 한 박자 늦추기.',
      en: 'Seven Killings × Mars — pressure, force, and sudden events doubled. Decide fast, but slow any clash by a beat.',
    },
    polarity: -2,
    grade: 'A',
    note: '편관(살·강제) ↔ Mars(force·sudden assault). 두 신호 모두 자극·압박축.',
  },

  // ─── 십신 × 행성 (재성 — 자원·가치) ───
  {
    saju: '정재',
    astro: 'Venus',
    meaning: {
      ko: '정재 × 금성 — 안정된 가치·관계·자산의 결이 동시에 살아남. 결혼·계약·구매에 우호.',
      en: 'Right Wealth × Venus — stable value, relationships, and assets light up together. Favourable for marriage, contracts, purchase.',
    },
    polarity: 2,
    grade: 'A',
    note: '정재(안정 재물·정처) ↔ Venus(value·partner). 양쪽 모두 안정·결합축.',
  },
  {
    saju: '편재',
    astro: 'Mercury',
    meaning: {
      ko: '편재 × 수성 — 동산·상업·기회 포착이 빨라지는 시기. 단타·중개·정보거래 우위.',
      en: 'Indirect Wealth × Mercury — speed and opportunity in moveable assets, trade, and info-flow.',
    },
    polarity: 2,
    grade: 'A',
    note: '편재(유통·동산) ↔ Mercury(commerce·exchange). 둘 다 빠른 회전축.',
  },

  // ─── 십신 × 행성 (식상 — 표현·창의) ───
  {
    saju: '식신',
    astro: 'Mercury',
    meaning: {
      ko: '식신 × 수성 — 표현·창의·소통이 결결이 풀리는 시기. 글·말·작품 산출에 최적.',
      en: 'Eating God × Mercury — expression, creativity, and communication flow open. Best window for writing, talks, and creative output.',
    },
    polarity: 2,
    grade: 'A',
    note: '식신(표현·산출) ↔ Mercury(speech·craft). 둘 다 외향 표현축.',
  },
  {
    saju: '상관',
    astro: 'Mercury',
    meaning: {
      ko: '상관 × 수성 — 언변·재치는 살아나지만 비판·직설이 관계를 흔들 수 있는 결.',
      en: 'Hurting Officer × Mercury — wit sharpens, yet bluntness can shake relationships. Edit before you speak.',
    },
    polarity: 1,
    grade: 'A',
    note: '상관(예봉·비판) ↔ Mercury(speech). 표현 강화 + 트러블 양면.',
  },

  // ─── 십신 × 행성 (인성 — 수용·학습) ───
  {
    saju: '정인',
    astro: 'Jupiter',
    meaning: {
      ko: '정인 × 목성 — 학습·확장·정통의 기운이 한 방향으로 흘러요. 자격·학위·해외 우호.',
      en: 'Right Print × Jupiter — learning, expansion, and orthodoxy run in the same direction. Favours credentials, degrees, overseas moves.',
    },
    polarity: 2,
    grade: 'A',
    note: '정인(학문·정통 인장) ↔ Jupiter(wisdom·expansion). 학파별 직접 등치.',
  },
  {
    saju: '정인',
    astro: 'Moon',
    meaning: {
      ko: '정인 × 달 — 수용·돌봄·어머니 결이 두 배. 휴식·치유·가족 챙기기에 우호.',
      en: 'Right Print × Moon — reception, care, and the maternal note doubled. Favours rest, healing, and family.',
    },
    polarity: 1,
    grade: 'A',
    note: '정인(母·수용) ↔ Moon(mother·nurture). 양쪽 모두 받아들임축.',
  },
  {
    saju: '편인',
    astro: 'Saturn',
    meaning: {
      ko: '편인 × 토성 — 고립된 사고·종교·연구의 결이 깊어지는 시기. 혼자 파고드는 일에 우호.',
      en: 'Indirect Print × Saturn — solitary thought, religion, and deep research grow heavier. Favours single-minded study.',
    },
    polarity: 0,
    grade: 'A',
    note: '편인(고독·이단 학문) ↔ Saturn(solitude·discipline). 깊이↑ 사회성↓.',
  },

  // ─── 십신 × 행성 (비겁 — 자아·경쟁) ───
  {
    saju: '비견',
    astro: 'Sun',
    meaning: {
      ko: '비견 × 태양 — 자아·주체성·동료 결이 한 방향으로 살아남. 본인 이름 걸고 나서기에 우호.',
      en: 'Friend × Sun — self, agency, and peer presence light up together. A window to step out under your own name.',
    },
    polarity: 1,
    grade: 'A',
    note: '비견(같은 결의 동료·자아) ↔ Sun(self·vitality). 둘 다 주체성축.',
  },
  {
    saju: '겁재',
    astro: 'Mars',
    meaning: {
      ko: '겁재 × 화성 — 경쟁·분탈·충동 결이 두 배. 큰 돈·관계 결정은 한 박자 늦추기.',
      en: 'Rob Wealth × Mars — competition, rivalry, and impulse doubled. Slow big money and relationship calls by a beat.',
    },
    polarity: -2,
    grade: 'A',
    note: '겁재(경쟁·분탈) ↔ Mars(competition·heat). 양쪽 모두 충돌축.',
  },

  // ─── 신살 × 행성 ───
  {
    saju: '도화',
    astro: 'Venus',
    meaning: {
      ko: '도화살 × 금성 — 관계·매력·인기 결이 동시에 살아남. 사교·연애·미적 활동에 우호.',
      en: 'Peach-Blossom × Venus — connection, charm, and popularity light up together. Favours socials, romance, and aesthetic work.',
    },
    polarity: 2,
    grade: 'A',
    note: '도화(인연·끌림) ↔ Venus(attraction·beauty). 매칭 완전 일치.',
  },
  {
    saju: '도화살',
    astro: 'Venus',
    meaning: {
      ko: '도화살 × 금성 — 관계·매력·인기 결이 동시에 살아남. 사교·연애·미적 활동에 우호.',
      en: 'Peach-Blossom × Venus — connection, charm, and popularity light up together. Favours socials, romance, and aesthetic work.',
    },
    polarity: 2,
    grade: 'A',
    note: '도화살 = 도화의 이명. 동일 매핑.',
  },
  {
    saju: '역마',
    astro: 'Mercury',
    meaning: {
      ko: '역마살 × 수성 — 이동·소통·정보 결이 두 배. 출장·교섭·매체 활용에 우호.',
      en: 'Travelling Horse × Mercury — movement, messages, and info-flow doubled. Favours travel, negotiation, and media work.',
    },
    polarity: 1,
    grade: 'A',
    note: '역마(이동) ↔ Mercury(travel·message). 동·서 모두 이동축.',
  },
  {
    saju: '역마살',
    astro: 'Mercury',
    meaning: {
      ko: '역마살 × 수성 — 이동·소통·정보 결이 두 배. 출장·교섭·매체 활용에 우호.',
      en: 'Travelling Horse × Mercury — movement, messages, and info-flow doubled. Favours travel, negotiation, and media work.',
    },
    polarity: 1,
    grade: 'A',
    note: '역마살 = 역마의 이명. 동일 매핑.',
  },
  {
    saju: '양인',
    astro: 'Mars',
    meaning: {
      ko: '양인살 × 화성 — 직진·과열·돌발이 한 시기에 몰리는 결. 칼·차·운동에 평소보다 주의.',
      en: 'Yang-Blade × Mars — straight-line drive, over-heat, and sudden moves pile up. Extra care with blades, vehicles, and intense exercise.',
    },
    polarity: -2,
    grade: 'A',
    note: '양인(예봉·과열) ↔ Mars(blade·sudden injury). 양쪽 모두 첨예·과열축.',
  },
  {
    saju: '건록',
    astro: 'Jupiter',
    meaning: {
      ko: '건록 × 목성 — 실력·인정·확장 결이 한 방향으로 흘러요. 자기 자리 잡기에 최적.',
      en: 'Established Stipend × Jupiter — competence, recognition, and expansion run together. Best window for claiming your own seat.',
    },
    polarity: 2,
    grade: 'A',
    note: '건록(자기 자리·실력의 록) ↔ Jupiter(recognition·expansion). 양쪽 모두 인정축.',
  },
]

/**
 * 빠른 매칭용 인덱스 — saju 키 + astro 키 → CrossMapping.
 * cross-activation extractor 가 셀당 매번 lookup.
 */
const MAPPING_INDEX = new Map<string, CrossMapping>()
for (const m of SAJU_ASTRO_MAPPINGS) {
  MAPPING_INDEX.set(`${m.saju}|${m.astro}`, m)
}

export function lookupCrossMapping(
  sajuKey: string | undefined,
  astroKey: string | undefined,
): CrossMapping | undefined {
  if (!sajuKey || !astroKey) return undefined
  return MAPPING_INDEX.get(`${sajuKey}|${astroKey}`)
}

/** 매핑 통계 — 디버그·테스트용. */
export const MAPPING_COUNT = SAJU_ASTRO_MAPPINGS.length
