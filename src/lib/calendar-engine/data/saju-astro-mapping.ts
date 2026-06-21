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
 * 페어 polarity 합산 모델 (extractor combinePolarity):
 *   - 두 부모 부호가 같은 방향(++ 또는 --) → mapping.polarity 를 **부호 그대로** 사용
 *     (예: 편관×Mars −2 는 둘 다 압력이면 −2 유지 — 흉을 더 키움. sign 곱이 아님).
 *   - 부호가 반대(+− / −+) → 0 (의미 충돌 — 톤 무력화).
 *   - 한쪽 polarity = 0 → mapping.polarity 그대로 (부호 정보 부재 시 매핑이 결정).
 * pair.weight  = saju.weight × astro.weight × 0.6 (cross 신호 noise 방지)
 */

import type { Polarity, SignalLayer } from '../types'

/** 사주 측의 매칭 키 — 십신 또는 신살명. */
export type SajuMatchKey =
  | '비견'
  | '겁재'
  | '식신'
  | '상관'
  | '편재'
  | '정재'
  | '편관'
  | '정관'
  | '편인'
  | '정인'
  | '도화'
  | '역마'
  | '건록'
  | '양인'

/** 점성 측의 매칭 키 — 단일 행성명. astro extractor 가 evidence.planets[0] 에 박는 명칭과 일치. */
export type AstroMatchKey =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'

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
   * 최종 페어 polarity 는 extractor combinePolarity 가 산출:
   * 두 부모 부호가 같은 방향이면 이 값을 **부호 그대로** 채택(편관×Mars −2 → −2),
   * 부호가 반대면 0, 한쪽이 0 이면 이 값을 그대로 — 본 값은 의미 톤의 *방향* 을 결정.
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
      en: 'Direct Officer × Saturn — responsibility, law, and structure all firm up; a window to lock in formal commitments.',
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
      en: 'Seven Killings × Mars — pressure, force, and sudden events hit twice as hard. Decide fast, but slow any clash by a beat.',
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
      en: 'Direct Wealth × Venus — stable value, relationships, and assets light up together. Favours marriage, contracts, and purchases.',
    },
    polarity: 2,
    grade: 'A',
    note: '정재(안정 재물·정처) ↔ Venus(value·partner). 양쪽 모두 안정·결합축.',
  },
  {
    saju: '편재',
    astro: 'Jupiter',
    meaning: {
      ko: '편재 × 목성 — 큰물의 기회·확장 재물 결이 한 방향으로. 신사업·투자 검토에 우호.',
      en: 'Indirect Wealth × Jupiter — big opportunities and expansive wealth line up the same way. Favours new ventures and weighing investments.',
    },
    polarity: 2,
    grade: 'A',
    note: '편재(큰 재물·기회·투기) ↔ Jupiter(expansion·fortune). 정재=Venus(안정 축적)와 축 분리. Mercury 과부하(식신·상관·역마와 중복 발화) 해소 목적의 재배선.',
  },

  // ─── 십신 × 행성 (식상 — 표현·창의) ───
  {
    saju: '식신',
    astro: 'Mercury',
    meaning: {
      ko: '식신 × 수성 — 만들어 내놓는 결. 초안·시제품·요리·콘텐츠처럼 손으로 빚는 산출에 최적.',
      en: 'Eating God × Mercury — a streak for making things. Best for drafts, prototypes, cooking, and hands-on creative work.',
    },
    polarity: 2,
    grade: 'A',
    note: '식신(생산·산출) ↔ Mercury(craft). 상관×수성(말·비판)과 결 분리: 식신=만들기, 상관=말하기.',
  },
  {
    saju: '상관',
    astro: 'Mercury',
    meaning: {
      ko: '상관 × 수성 — 말이 서는 결. 협상·설득·발표엔 날개, 직설·비판은 한 번 다듬고 내보내기.',
      en: 'Hurting Officer × Mercury — your words land well. A boost for negotiation and pitches; soften blunt criticism before you send it.',
    },
    polarity: 1,
    grade: 'A',
    note: '상관(언변·예봉) ↔ Mercury(speech). 식신×수성(만들기)과 결 분리: 상관=말하기·설득.',
  },

  // ─── 십신 × 행성 (인성 — 수용·학습) ───
  {
    saju: '정인',
    astro: 'Jupiter',
    meaning: {
      ko: '정인 × 목성 — 학습·확장·정통의 기운이 한 방향으로 흘러요. 자격·학위·해외 우호.',
      en: 'Direct Resource × Jupiter — learning, expansion, and tradition all pull the same way. Favours credentials, degrees, and overseas moves.',
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
      en: 'Direct Resource × Moon — receptivity, care, and a maternal note are doubly strong. Favours rest, healing, and family.',
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
      en: 'Indirect Resource × Saturn — solitary thought, faith, and deep research run deeper. Favours single-minded study.',
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
      en: 'Companion × Sun — self, agency, and peer presence light up together. A window to step out under your own name.',
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
      en: 'Rob Wealth × Mars — competition, rivalry, and impulse run twice as hot. Sleep on any big money or relationship call.',
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
      en: 'Peach Blossom × Venus — connection, charm, and popularity light up together. Favours socializing, romance, and aesthetic work.',
    },
    polarity: 2,
    grade: 'A',
    note: '도화(인연·끌림) ↔ Venus(attraction·beauty). 매칭 완전 일치.',
  },
  {
    saju: '역마',
    astro: 'Mercury',
    meaning: {
      ko: '역마살 × 수성 — 이동·소통·정보 결이 두 배. 출장·교섭·매체 활용에 우호.',
      en: 'Travelling Horse × Mercury — movement, messages, and information all run twice as strong. Favours travel, negotiation, and media work.',
    },
    polarity: 1,
    grade: 'A',
    note: '역마(이동) ↔ Mercury(travel·message). 동·서 모두 이동축.',
  },
  {
    saju: '양인',
    astro: 'Mars',
    meaning: {
      ko: '양인살 × 화성 — 직진·과열·돌발이 한 시기에 몰리는 결. 칼·차·운동에 평소보다 주의.',
      en: 'Yang Blade × Mars — headlong drive, overheating, and sudden moves all pile up. Take extra care with blades, vehicles, and intense exercise.',
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
      en: 'Established Stipend × Jupiter — skill, recognition, and expansion run together. The best window for claiming your own seat.',
    },
    polarity: 2,
    grade: 'A',
    note: '건록(자기 자리·실력의 록) ↔ Jupiter(recognition·expansion). 양쪽 모두 인정축.',
  },

  // ─── 외행성 × 십신 (B등급) — *장주기 전용* ───
  // 천왕·해왕·명왕은 너무 느려 일/월에서 교차하면 노이즈(윈도우가 수년). 그래서
  // CROSS_LAYER_BAND 로 *대운(decadal) 층에서만* 발화하게 막는다. 대운(10년)은
  // 외행성 한 sign 체류(~7~15년)와 같은 장주기 급이라 의미 대응이 자연스럽다.
  {
    saju: '편관',
    astro: 'Pluto',
    meaning: {
      ko: '편관 × 명왕성 — 이 대운은 권력·강제·근본 변형의 결. 끝과 시작이 함께 오니 무리한 통제보다 큰 재구성에 맡기기.',
      en: 'Seven Killings × Pluto — this decade carries power, coercion, and deep transformation. Endings and beginnings arrive together; rather than force control, surrender to the larger restructuring.',
    },
    polarity: -1,
    grade: 'B',
    note: '편관(七殺·강제·위기) ↔ Pluto(변형·권력). decadal 전용(밴드).',
  },
  {
    saju: '편인',
    astro: 'Neptune',
    meaning: {
      ko: '편인 × 해왕성 — 이 대운은 영성·직관·비주류 학문이 깊어지되 현실 감각이 흐려질 수 있는 결.',
      en: 'Indirect Resource × Neptune — this decade deepens spirituality, intuition, and unconventional study, but your grip on reality can blur.',
    },
    polarity: 0,
    grade: 'B',
    note: '편인(이단·고독 학문·직관) ↔ Neptune(영성·환상·용해). decadal 전용(밴드).',
  },
  {
    saju: '상관',
    astro: 'Uranus',
    meaning: {
      ko: '상관 × 천왕성 — 이 대운은 틀을 깨는 재능·혁신·반항의 결. 돌파구가 열리되 기존 질서와 부딪칠 수 있어요.',
      en: 'Hurting Officer × Uranus — this decade carries rule-breaking talent, innovation, and rebellion. Breakthroughs open up, but they can clash with the established order.',
    },
    polarity: 0,
    grade: 'B',
    note: '상관(예봉·반관·천재성) ↔ Uranus(돌발·혁명·천재성). decadal 전용(밴드).',
  },
]

/**
 * 층별 교차 밴드 — 행성마다 *어느 시간 층에서* 교차신호를 낼 수 있는지.
 * 행성 속도에 맞춘다: 빠른 행성은 일/월에서만(긴 층에선 무의미), 느린/외행성은
 * 대운/장주기에서만(짧은 층에선 노이즈 — 윈도우가 수개월~수년이라 상시 발화).
 * cross-activation 이 합성 신호의 layer 가 이 밴드에 없으면 emit 하지 않는다.
 * → "전부 켜기/끄기"가 아니라 *층마다 맞는 행성만* 교차.
 */
const CROSS_LAYER_BAND: Record<AstroMatchKey, readonly SignalLayer[]> = {
  Moon: ['daily'],
  Sun: ['daily', 'monthly'],
  Mercury: ['daily', 'monthly'],
  Venus: ['daily', 'monthly'],
  Mars: ['daily', 'monthly'],
  Jupiter: ['monthly', 'yearly', 'decadal'],
  Saturn: ['yearly', 'decadal'],
  Uranus: ['decadal'],
  Neptune: ['decadal'],
  Pluto: ['decadal'],
}

/** 합성 교차신호의 layer 가 그 행성의 밴드에 드는지. 미정의 행성은 허용(보수적). */
export function crossLayerAllowed(astro: string, layer: SignalLayer): boolean {
  const band = CROSS_LAYER_BAND[astro as AstroMatchKey]
  return band ? band.includes(layer) : true
}

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
  astroKey: string | undefined
): CrossMapping | undefined {
  if (!sajuKey || !astroKey) return undefined
  return MAPPING_INDEX.get(`${sajuKey}|${astroKey}`)
}
