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
  | '천을귀인'

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
  /**
   * true 면 *캘린더 cross-activation 커버리지 전용* 보조 매핑 — 같은 십신의
   * 1차(정통 등치) 매핑에 결을 더하는 2차 nuance 다. 캘린더(extractCrossActivations)
   * 는 전체 목록을 순회하므로 그대로 활성화되지만, 리포트의 십신→대표행성 단일화
   * (natalCrossShared SAJU_TO_MAPPING)는 이 항목을 제외해 정통 1차 등치(예: 정관→토성)를
   * 대표로 유지한다 — 보조 매핑이 polarity 로 대표를 가로채지 않게.
   */
  crossOnly?: boolean
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
    saju: '정관',
    astro: 'Sun',
    meaning: {
      ko: '정관 × 태양 — 정당한 권위·직위·공인의 결이 한 방향으로 살아남. 윗선의 인정·승진·공식 무대에 우호.',
      en: 'Direct Officer × Sun — legitimate authority, office, and public standing line up the same way. Favours recognition from above, promotion, and the formal stage.',
    },
    polarity: 2,
    grade: 'A',
    crossOnly: true,
    note: '정관(직위·공인된 권위·명예) ↔ Sun(authority·legitimacy·자리). Saturn(책임·구조)과 결 분리: Sun=정당성·인정. 둘 다 +방향.',
  },
  {
    saju: '정관',
    astro: 'Jupiter',
    meaning: {
      ko: '정관 × 목성 — 규범·자격이 사회적 신뢰로 넓어지는 결. 자격·면허·공직·법적 정당화에 우호.',
      en: 'Direct Officer × Jupiter — rules and credentials broaden into social trust. Favours licences, public office, and legal legitimacy.',
    },
    polarity: 2,
    grade: 'A',
    crossOnly: true,
    note: '정관(규범·자격·법) ↔ Jupiter(법·정당성·확장). Saturn=책임의 무게, Jupiter=인정의 확장으로 결 분리. monthly/yearly/decadal 밴드.',
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
  {
    saju: '편재',
    astro: 'Mercury',
    meaning: {
      ko: '편재 × 수성 — 거래·중개·정보로 돈을 굴리는 결. 영업·딜·협상·매매 회전에 우호, 잔머리 과욕은 절제.',
      en: 'Indirect Wealth × Mercury — money moves through deals, brokering, and information. Favours sales, negotiation, and fast turnover; rein in over-clever greed.',
    },
    polarity: 1,
    grade: 'A',
    crossOnly: true,
    note: '편재(유통·기회 재물·수완) ↔ Mercury(거래·중개·정보). Jupiter=큰 확장, Mercury=실무 회전으로 결 분리.',
  },
  {
    saju: '편재',
    astro: 'Venus',
    meaning: {
      ko: '편재 × 금성 — 즐기며 버는 결, 사교·접대·취향이 돈으로 이어지는 흐름. 씀씀이가 커지니 균형은 챙기기.',
      en: 'Indirect Wealth × Venus — earning through pleasure, where socializing, hospitality, and taste turn into money. Spending swells too, so keep the balance.',
    },
    polarity: 1,
    grade: 'A',
    crossOnly: true,
    note: '편재(향유·교제 재물) ↔ Venus(pleasure·social·value). 정재×Venus(안정 결합)와 톤 분리: 편재=유동·향유. +방향이나 과소비 경계로 +1.',
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
    saju: '식신',
    astro: 'Venus',
    meaning: {
      ko: '식신 × 금성 — 누리고 빚는 결. 미식·예술·공예처럼 솜씨를 즐기며 내놓는 일에 우호.',
      en: 'Eating God × Venus — a streak for enjoying and crafting. Favours food, art, and craft where you take pleasure in the making.',
    },
    polarity: 2,
    grade: 'A',
    crossOnly: true,
    note: '식신(향유·산출·복록) ↔ Venus(pleasure·craft·beauty). Mercury×식신(손기술)과 결 분리: Venus=미감·향유. 둘 다 +방향.',
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
    saju: '정인',
    astro: 'Saturn',
    meaning: {
      ko: '정인 × 토성 — 정통 학문을 끈기 있게 다지는 결. 자격 시험·장기 연구·체계적 공부에 우호.',
      en: 'Direct Resource × Saturn — disciplined, patient mastery of orthodox study. Favours certification exams, long research, and systematic learning.',
    },
    polarity: 1,
    grade: 'A',
    crossOnly: true,
    note: '정인(정통 학문·인장) ↔ Saturn(discipline·persistence·구조). Jupiter×정인(확장·해외)과 결 분리: Saturn=끈기·체계. 둘 다 +방향.',
  },
  {
    saju: '편인',
    astro: 'Mercury',
    meaning: {
      ko: '편인 × 수성 — 비주류 정보·이면을 캐는 결. 자료 조사·재해석·편집에 우호, 의심이 과하면 결론을 미루게 됨.',
      en: 'Indirect Resource × Mercury — digging into unconventional information and hidden angles. Favours research, reinterpretation, and editing; excess suspicion can stall conclusions.',
    },
    polarity: 0,
    grade: 'A',
    crossOnly: true,
    note: '편인(이면·재해석·비주류 흡수) ↔ Mercury(정보·분석). 자원형 중립(+/− 양가) → 0.',
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
  {
    saju: '겁재',
    astro: 'Venus',
    meaning: {
      ko: '겁재 × 금성 — 돈·관계를 두고 빼앗고 빼앗기는 결. 공동 지출·보증·삼각관계는 한 박자 늦추기.',
      en: 'Rob Wealth × Venus — money and relationships become a tug-of-war of taking and being taken from. Sleep on joint spending, guarantees, and love triangles.',
    },
    polarity: -1,
    grade: 'A',
    crossOnly: true,
    note: '겁재(분탈·공유 자원 다툼) ↔ Venus(돈·관계). 가치축이 경쟁에 노출 → 압력 −1.',
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
    saju: '도화',
    astro: 'Moon',
    meaning: {
      ko: '도화살 × 달 — 정서적 끌림·인기·대중성이 살아나는 결. 감성 콘텐츠·공감·사람 모으는 일에 우호.',
      en: 'Peach Blossom × Moon — emotional pull, popularity, and mass appeal come alive. Favours heartfelt content, empathy, and drawing a crowd.',
    },
    polarity: 1,
    grade: 'A',
    crossOnly: true,
    note: '도화(인기·끌림) ↔ Moon(정서·대중·공감). Venus×도화(미·연애)와 결 분리: Moon=정서·대중성.',
  },
  {
    saju: '역마',
    astro: 'Mars',
    meaning: {
      ko: '역마살 × 화성 — 떠나려는 충동·추진이 두 배. 출장·이주·도전엔 동력, 다만 서두른 운전·일정은 한 박자 늦추기.',
      en: 'Travelling Horse × Mars — the urge to move and push runs twice as hard. Drive for trips, relocation, and bold moves; just slow rushed driving and schedules by a beat.',
    },
    polarity: 0,
    grade: 'A',
    crossOnly: true,
    note: '역마(이동) ↔ Mars(drive·속도). Mercury×역마(소통·정보)와 결 분리: Mars=추진·이동의 충동. 동력+과속경계 양가 → 0.',
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

  // ─── 대운 커버리지 확장 (B등급) — 장주기 십신×사회/외행성 ───
  // 대운 십신 중 정재·식신·비견·겁재는 외행성/사회행성 대응이 없어, 외행성
  // 트랜짓이 활성이어도 그 대운엔 교차가 못 떴다(커버리지 공백). 신호를 지어내지
  // 않고, 천문학적으로 타당한 대응만 추가해 트랜짓이 실제 활성일 때 발화하게 한다.
  // 토성/목성은 밴드상 yearly 에서도 발화(세운 교차도 함께 넓어짐), 명왕성은 decadal 전용.
  {
    saju: '정재',
    astro: 'Saturn',
    meaning: {
      ko: '정재 × 토성 — 꾸준한 가치·약속·자산이 시간을 들여 단단해지는 결. 서두르지 않고 쌓을수록 오래 갑니다.',
      en: 'Direct Wealth × Saturn — steady value, commitments, and assets harden with time. The less you rush, the longer it lasts.',
    },
    polarity: 1,
    grade: 'B',
    note: '정재(안정 재물·정처·신의) ↔ Saturn(structure·durability·time). 지속·구조축. yearly/decadal 밴드.',
  },
  {
    saju: '식신',
    astro: 'Jupiter',
    meaning: {
      ko: '식신 × 목성 — 만들어 내놓는 결과 풍요·확장이 같은 방향으로 흘러요. 즐기며 꾸준히 내놓을수록 불어납니다.',
      en: 'Eating God × Jupiter — your output and abundance pull the same way; the more you create with ease, the more it grows.',
    },
    polarity: 1,
    grade: 'B',
    note: '식신(생산·향유·복록) ↔ Jupiter(abundance·growth). 복록·확장축. monthly/yearly/decadal 밴드.',
  },
  {
    saju: '비견',
    astro: 'Saturn',
    meaning: {
      ko: '비견 × 토성 — 홀로 서는 힘과 책임이 단단해지는 결. 남에게 기대기보다 제 자리를 시간 들여 다지게 돼요.',
      en: 'Companion × Saturn — self-reliance and responsibility harden. Rather than leaning on others, you build your own footing over time.',
    },
    polarity: 0,
    grade: 'B',
    note: '비견(자립·주체) ↔ Saturn(self-reliance·maturation). 자립↑. yearly/decadal 밴드.',
  },
  {
    saju: '겁재',
    astro: 'Pluto',
    meaning: {
      ko: '겁재 × 명왕성 — 이 대운은 경쟁·분배·권력 다툼이 근본에서 뒤집히는 결. 빼앗고 빼앗기는 자리라 큰 욕심보다 재구성에 맡기기.',
      en: 'Rob Wealth × Pluto — this decade overturns rivalry, redistribution, and power struggles at the root. A seat of taking and being taken from; surrender to restructuring rather than overreaching.',
    },
    polarity: -1,
    grade: 'B',
    note: '겁재(분탈·경쟁·공유 자원) ↔ Pluto(power·elimination·shared resources). decadal 전용(밴드).',
  },

  // ─── 일/월 근거 커버리지 확장 (2026-07) ───
  // 감사: 26쌍 시절엔 그날 가장 센 신호가 매핑 밖이면 "왜 이런 날" 근거가 비어
  // 일반 문구로 떨어졌다. 특히 달(Moon)은 가장 자주 발화하는 일간 트랜짓인데
  // 매핑이 2쌍뿐이었다. 원칙 불변 — 의미상 자연스럽게 강화·간섭하는 조합만,
  // 신호를 지어내지 않고 양쪽이 실제 활성일 때만 발화. 전부 crossOnly(보조) —
  // 리포트의 십신→대표행성 단일화는 기존 1차 등치를 유지한다.
  // 카피 원칙은 toneMeaning 과 동일: 단정 + 생활 명사 + 처방.

  // ── × Moon (daily 전용 밴드 — 일간 근거의 최대 공백) ──
  {
    saju: '식신',
    astro: 'Moon',
    meaning: {
      ko: '식신 × 달 — 일상을 빚는 결. 요리·살림·루틴 산출과 돌봄이 손에 잘 붙는 날.',
      en: 'Eating God × Moon — a streak for shaping daily life. Cooking, homemaking, routines, and caregiving all come easily.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '식신(양생·산출·먹거리) ↔ Moon(일상·양육·먹고사는 일). 둘 다 양생축.',
  },
  {
    saju: '상관',
    astro: 'Moon',
    meaning: {
      ko: '상관 × 달 — 기분이 말로 새기 쉬운 결. 감정 실린 답장·댓글은 하루 묵혔다 보내기.',
      en: 'Hurting Officer × Moon — moods leak straight into words. Sit on emotionally loaded replies for a day.',
    },
    polarity: -1,
    grade: 'B',
    crossOnly: true,
    note: '상관(감정 표출·예봉) ↔ Moon(기분·정서). 표출축이 정서로 증폭 → 압력 −1.',
  },
  {
    saju: '편인',
    astro: 'Moon',
    meaning: {
      ko: '편인 × 달 — 마음이 안으로 예민해지는 결. 혼자 재충전이 답, 새벽 감성 결정은 금물.',
      en: 'Indirect Resource × Moon — the mind turns inward and fine-tuned. Recharge alone; no 2am feelings-driven decisions.',
    },
    polarity: 0,
    grade: 'B',
    crossOnly: true,
    note: '편인(내향 수용·불안정 정서) ↔ Moon(기분). 깊이↑ 기복↑ 양가 → 0.',
  },
  {
    saju: '정재',
    astro: 'Moon',
    meaning: {
      ko: '정재 × 달 — 집·가족·생활비의 결. 가계 정돈, 집 정리, 가족과 쓰는 돈 계획에 우호.',
      en: 'Direct Wealth × Moon — home, family, and living costs align. Favours tidying budgets, the house, and family spending plans.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '정재(안정 재물·정처·살림) ↔ Moon(가정·생활). 둘 다 생활 안정축.',
  },
  {
    saju: '편관',
    astro: 'Moon',
    meaning: {
      ko: '편관 × 달 — 압박이 기분까지 누르는 결. 수면·스트레스 관리부터, 밤의 걱정은 내일의 나에게.',
      en: 'Seven Killings × Moon — pressure weighs on your mood itself. Guard sleep and stress first; hand tonight’s worries to tomorrow-you.',
    },
    polarity: -1,
    grade: 'B',
    crossOnly: true,
    note: '편관(압박·긴장) ↔ Moon(정서·수면). 압박이 정서축을 침식 → −1.',
  },

  // ── × Sun (daily/monthly — 무대·권위·주목) ──
  {
    saju: '상관',
    astro: 'Sun',
    meaning: {
      ko: '상관 × 태양 — 윗사람·권위와 부딪히기 쉬운 결(상관견관). 상사 앞 직설·공개 반박은 오늘 접기.',
      en: 'Hurting Officer × Sun — friction with authority runs high. Shelve blunt words and public pushback in front of the boss today.',
    },
    polarity: -2,
    grade: 'A',
    crossOnly: true,
    note: '상관견관(傷官見官) 고전 축 ↔ Sun(권위·자리). 반권위축 직접 등치 — A.',
  },
  {
    saju: '건록',
    astro: 'Sun',
    meaning: {
      ko: '건록 × 태양 — 제 이름 걸고 서는 결. 발표·면접·서명처럼 내 실력이 무대 중앙에 서는 일에 우호.',
      en: 'Established Stipend × Sun — a streak for standing under your own name. Favours presentations, interviews, and signatures where your skill takes centre stage.',
    },
    polarity: 2,
    grade: 'B',
    crossOnly: true,
    note: '건록(관록·제 실력의 자리) ↔ Sun(자기 이름·무대). 둘 다 주체·자리축.',
  },
  {
    saju: '식신',
    astro: 'Sun',
    meaning: {
      ko: '식신 × 태양 — 만든 것을 공개 무대에 올리는 결. 발행·출시·시연에 우호.',
      en: 'Eating God × Sun — a streak for putting your work on the public stage. Favours publishing, launching, and demos.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '식신(산출) ↔ Sun(공개·조명). 산출이 가시성으로 → +1.',
  },
  {
    saju: '도화',
    astro: 'Sun',
    meaning: {
      ko: '도화살 × 태양 — 시선이 나에게 모이는 결. 프로필 사진·무대·라이브처럼 보여지는 일에 우호.',
      en: 'Peach Blossom × Sun — eyes gather on you. Favours profile shots, stages, and going live — anything where you’re seen.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '도화(인기·주목) ↔ Sun(조명·가시성). 매력이 무대 중앙으로 → +1.',
  },
  {
    saju: '겁재',
    astro: 'Sun',
    meaning: {
      ko: '겁재 × 태양 — 성과와 주목을 두고 다투는 결. 공 가로채기 조심, 내 기여는 기록으로 남기기.',
      en: 'Rob Wealth × Sun — credit and spotlight become contested. Watch for claimed credit; keep your contribution on record.',
    },
    polarity: -1,
    grade: 'B',
    crossOnly: true,
    note: '겁재(분탈·경쟁) ↔ Sun(공·주목·자리). 주목 자원의 다툼 → −1.',
  },

  // ── × Mercury (daily/monthly — 문서·거래·기록) ──
  {
    saju: '정관',
    astro: 'Mercury',
    meaning: {
      ko: '정관 × 수성 — 공문서·결재의 결. 계약서 검토, 관공서 서류, 공식 메일 처리에 우호.',
      en: 'Direct Officer × Mercury — a streak for official paperwork. Favours contract review, government forms, and formal mail.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '정관(규범·절차) ↔ Mercury(문서·소통). 절차가 문서로 → +1.',
  },
  {
    saju: '정재',
    astro: 'Mercury',
    meaning: {
      ko: '정재 × 수성 — 장부가 맞아떨어지는 결. 정산·가계부·구독 정리, 미뤄둔 환불 요청에 우호.',
      en: 'Direct Wealth × Mercury — the books balance today. Favours settling accounts, budgets, subscriptions, and that refund request you postponed.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '정재(안정 재물·꼼꼼함) ↔ Mercury(기록·계산). 재물의 회계축 → +1.',
  },
  {
    saju: '정인',
    astro: 'Mercury',
    meaning: {
      ko: '정인 × 수성 — 배운 게 정리되는 결. 필기·요약·복습, 배운 내용을 문서로 굳히기에 우호.',
      en: 'Direct Resource × Mercury — learning settles into order. Favours notes, summaries, review, and writing down what you’ve learned.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '정인(학문·수용) ↔ Mercury(기록·정리). 학습의 문서화축 → +1.',
  },
  {
    saju: '도화',
    astro: 'Mercury',
    meaning: {
      ko: '도화살 × 수성 — 대화가 통하는 결. 먼저 보낸 메시지·소개 자리의 스몰토크가 잘 풀림.',
      en: 'Peach Blossom × Mercury — conversation lands well. First messages and small talk at introductions flow easily.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '도화(끌림·사교) ↔ Mercury(대화·메시지). 매력의 소통축 → +1.',
  },
  {
    saju: '편관',
    astro: 'Mercury',
    meaning: {
      ko: '편관 × 수성 — 독촉·통보가 날아들기 쉬운 결. 기한 지난 서류·답장부터 먼저 치우면 압박이 준다.',
      en: 'Seven Killings × Mercury — demands and notices tend to land today. Clear overdue papers and replies first and the pressure eases.',
    },
    polarity: -1,
    grade: 'B',
    crossOnly: true,
    note: '편관(압박·독촉) ↔ Mercury(문서·연락). 압박의 문서화축 → −1, 처방으로 닫음.',
  },

  // ── × Venus (daily/monthly — 관계·가치·보상) ──
  {
    saju: '상관',
    astro: 'Venus',
    meaning: {
      ko: '상관 × 금성 — 재능이 매력으로 번지는 결. 창작 발표·공연·스타일 변화가 좋게 받아들여짐.',
      en: 'Hurting Officer × Venus — talent spills over into charm. Creative releases, performances, and a style change land well.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '상관(재능 표출) ↔ Venus(미·매력). 예봉이 미감으로 순화 → +1.',
  },
  {
    saju: '정관',
    astro: 'Venus',
    meaning: {
      ko: '정관 × 금성 — 격식 있는 자리가 부드럽게 풀리는 결. 상견례·공식 행사·예의 갖춘 부탁에 우호.',
      en: 'Direct Officer × Venus — formal occasions soften in your favour. Good for meeting the parents, official events, and courteous asks.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '정관(격식·규범) ↔ Venus(조화·호감). 격식의 관계축 → +1.',
  },
  {
    saju: '건록',
    astro: 'Venus',
    meaning: {
      ko: '건록 × 금성 — 실력이 보상으로 이어지는 결. 몸값·연봉·단가 이야기 꺼내기 좋은 날.',
      en: 'Established Stipend × Venus — skill converts into reward. A good day to bring up your rate, salary, or price.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '건록(제 실력의 록) ↔ Venus(가치·보상). 실력의 가격축 → +1.',
  },

  // ── × Mars (daily/monthly — 추진·충동·과열) ──
  {
    saju: '식신',
    astro: 'Mars',
    meaning: {
      ko: '식신 × 화성 — 만들기에 불이 붙는 결. 몰아서 끝내는 제작·운동엔 최고, 밤샘은 하루만.',
      en: 'Eating God × Mars — making catches fire. Great for sprint-finishing work and workouts; cap the all-nighter at one.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '식신(산출) ↔ Mars(추진·에너지). 산출의 추진축 → +1.',
  },
  {
    saju: '정관',
    astro: 'Mars',
    meaning: {
      ko: '정관 × 화성 — 절차를 건너뛰고 싶은 충동의 결. 서류는 순서대로, 지름길이 오늘은 더 멀다.',
      en: 'Direct Officer × Mars — the urge to skip procedure runs hot. Do the paperwork in order; today the shortcut is the long way.',
    },
    polarity: -1,
    grade: 'B',
    crossOnly: true,
    note: '정관(절차·규범) ↔ Mars(충동·속도). 규범축과 충동축의 간섭 → −1.',
  },
  {
    saju: '편재',
    astro: 'Mars',
    meaning: {
      ko: '편재 × 화성 — 공격적으로 지르고 싶은 결. 몰빵·레버리지·홧김 결제는 오늘 금지, 소액 테스트까지만.',
      en: 'Indirect Wealth × Mars — the urge to bet aggressively runs hot. No all-ins, leverage, or rage-buys today; small tests only.',
    },
    polarity: -1,
    grade: 'B',
    crossOnly: true,
    note: '편재(기회 재물·투기) ↔ Mars(충동). 투기의 과열축 → −1.',
  },
  {
    saju: '정재',
    astro: 'Mars',
    meaning: {
      ko: '정재 × 화성 — 아껴둔 돈에 충동이 붙는 결. 장바구니 결제·큰 지출은 24시간 묵히기.',
      en: 'Direct Wealth × Mars — impulse latches onto saved money. Let the cart and any big spend sit for 24 hours.',
    },
    polarity: -1,
    grade: 'B',
    crossOnly: true,
    note: '정재(축적 재물) ↔ Mars(충동 지출). 축적축 침식 → −1.',
  },
  {
    saju: '비견',
    astro: 'Mars',
    meaning: {
      ko: '비견 × 화성 — 동료·형제와 경쟁이 과열되는 결. 이기려 들기보다 판을 나누면 오히려 얻는다.',
      en: 'Companion × Mars — rivalry with peers and siblings overheats. Split the field instead of fighting for it and you gain more.',
    },
    polarity: -1,
    grade: 'B',
    crossOnly: true,
    note: '비견(동배 경쟁) ↔ Mars(경쟁·열기). 겁재×Mars 의 완화판 — −1.',
  },
  {
    saju: '도화',
    astro: 'Mars',
    meaning: {
      ko: '도화살 × 화성 — 끌림이 격정으로 달아오르는 결. 질투·성급한 고백은 하루 식히고.',
      en: 'Peach Blossom × Mars — attraction heats into intensity. Cool jealousy and rushed confessions for a day.',
    },
    polarity: -1,
    grade: 'B',
    crossOnly: true,
    note: '도화(끌림) ↔ Mars(격정·성급). 인연축의 과열 → −1.',
  },
  {
    saju: '건록',
    astro: 'Mars',
    meaning: {
      ko: '건록 × 화성 — 실력에 추진력이 붙는 결. 미뤄둔 승부수·도전 과제를 걸기 좋은 날.',
      en: 'Established Stipend × Mars — drive attaches to real skill. A good day to make the bold move you postponed.',
    },
    polarity: 1,
    grade: 'B',
    crossOnly: true,
    note: '건록(실력·자리) ↔ Mars(추진). 실력의 승부축 → +1.',
  },

  // ── 신살 길성 확장 ──
  {
    saju: '천을귀인',
    astro: 'Jupiter',
    meaning: {
      ko: '천을귀인 × 목성 — 귀인이 실제로 움직이는 결. 부탁·소개 요청·멘토 연락을 미루지 말 것.',
      en: 'Heavenly Benefactor × Jupiter — your helpers are actually in motion. Don’t postpone the ask, the intro request, or that message to a mentor.',
    },
    polarity: 2,
    grade: 'A',
    crossOnly: true,
    note: '천을귀인(최상 길성·조력자) ↔ Jupiter(greater benefic·귀인운). 동·서 길성 아키타입 직접 등치 — A.',
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
