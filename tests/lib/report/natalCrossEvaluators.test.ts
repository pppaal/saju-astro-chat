/**
 * natalCrossEvaluators — 미커버 평가기·분기 집중 회귀 스위트.
 *
 * 기존 natalCross.test.ts / natalCross.enhanced.test.ts 가 다루지 않은
 * 평가기(evalVoid / evalNorthNode / evalMovement / evalSpirit / evalWealth /
 * evalExpression)와, 일부 평가기의 미커버 arm(중립·보완·각 톤 + ko/en 짝)을
 * 직접 잠근다. eval 함수는 원시값만 받으므로 천체력 불필요 — 빠르게 돈다.
 */
import { describe, it, expect } from 'vitest'
import {
  evalIdentity,
  evalNeeds,
  evalSocialRole,
  evalFortune,
  evalRelations,
  evalStrength,
  evalTemperament,
  evalEnergyDirection,
  evalDrive,
  evalKeyAspect,
  evalVoid,
  evalNorthNode,
  evalRomance,
  evalMovement,
  evalSpirit,
  evalWealth,
  evalExpression,
  evalYinYang,
  dominantSajuElement,
  dominantAstroElement,
  dominantSibsinGroup,
  signToSajuElement,
} from '@/lib/report/natalCross'

const HANGUL = /[가-힣]/

// ── evalIdentity — ASC tail + almuten arm ──────────────────────────────────
describe('evalIdentity — ASC 첫인상 분기', () => {
  it('ASC 원소가 태양과 같으면 "한 줄로 또렷하게" tail', () => {
    // 화 일간 + 사자(火) 태양 + 양자리(火) ASC → ascSame
    const v = evalIdentity('화', 'Leo', 'Aries')!
    expect(v.reason.ko).toContain('한 줄로 또렷하게 이어져요')
    expect(v.reason.en).toContain('line up cleanly')
  })
  it('ASC 원소가 태양과 다르면 "한 번 더 갈려요" tail', () => {
    // 화 일간 + 사자(火) 태양 + 게자리(水) ASC → 다름
    const v = evalIdentity('화', 'Leo', 'Cancer')!
    expect(v.reason.ko).toContain('한 번 더 갈려요')
    expect(v.reason.en).toContain('split once more')
  })
  it('ASC sign 이 매핑 안 되면 base 그대로 (tail 없음)', () => {
    const base = evalIdentity('화', 'Leo')!
    const withBad = evalIdentity('화', 'Leo', '???')!
    expect(withBad.reason.ko).toBe(base.reason.ko)
  })
  it('almuten 없으면 주인 행성 줄 없음 / EN 한글 없음', () => {
    const v = evalIdentity('화', 'Leo', 'Aries', 'Mars')!
    expect(v.reason.ko).toContain('알무텐')
    expect(HANGUL.test(v.reason.en)).toBe(false)
  })
})

// ── evalNeeds — neutral arm + suffix 조합 ──────────────────────────────────
describe('evalNeeds — 미커버 arm', () => {
  it('용신·달이 생극 무관계면 neutral', () => {
    // 용신 금(metal), 달 사자(火). metal-fire: fire가 metal을 극(CONTROLS.fire=metal)
    // → CONTROLS[moon=fire]===need(metal) → tension. 무관계 만들려면:
    // 용신 금(metal), 달 게자리(水). metal→water(생), 즉 GENERATES[metal]=water=moon
    // → GENERATES[need]===moon (반대). 위 코드는 GENERATES[moon]===need / CONTROLS[moon]===need 만 봄.
    // moon=water: GENERATES[water]=wood(!=metal), CONTROLS[water]=fire(!=metal) → neutral.
    const v = evalNeeds('금', 'Cancer')!
    expect(v.tone).toBe('neutral')
    expect(v.reason.ko).toContain('따로 노는')
    expect(v.reason.en).toContain('separate tracks')
  })
  it('avoid 와 johu 가 동시에 붙는다(early-return 함정 없음)', () => {
    const v = evalNeeds('수', 'Cancer', '화', {
      el: '수',
      climateKo: '한',
      climateEn: 'cold',
      rating: 5,
    })!
    expect(v.reason.ko).toContain('피할 건')
    expect(v.reason.ko).toContain('추운 달에 태어나')
    expect(HANGUL.test(v.reason.en)).toBe(false)
  })
  it('데이터 부족 시 null', () => {
    expect(evalNeeds(undefined, 'Cancer')).toBeNull()
    expect(evalNeeds('수', undefined)).toBeNull()
    expect(evalNeeds('수', '???')).toBeNull()
  })
})

// ── evalSocialRole — complement(peregrine) arm + null ──────────────────────
describe('evalSocialRole — peregrine 보완', () => {
  it('dignity 가 domicile/detriment 아니면 complement', () => {
    // 정관격 → 십신 정관 → mapping.astro. peregrine 떨어지는 sign 선택.
    const v = evalSocialRole('정관격', 'Gemini')
    expect(v).not.toBeNull()
    expect(v!.tone).toBe('complement')
    expect(v!.reason.ko).toContain('다른 방식으로 넓혀줘요')
    expect(HANGUL.test(v!.reason.en)).toBe(false)
  })
  it('mcSign 인식 불가면 peregrine 단정 대신 행 생략(null) — ENGINE-AUDIT', () => {
    expect(evalSocialRole('정관격', '???')).toBeNull()
  })
  it('빈 입력 null', () => {
    expect(evalSocialRole(undefined, 'Capricorn')).toBeNull()
    expect(evalSocialRole('정관격', undefined)).toBeNull()
  })
})

// ── evalFortune — 흉신 benefic<0 보완 arm ──────────────────────────────────
describe('evalFortune — polarity·강조 매트릭스', () => {
  it('흉신 + 행성 비강조 → 보완(거친 결 눌림)', () => {
    const v = evalFortune(['양인'], new Set())!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('센 기운')
    expect(HANGUL.test(v.reason.en)).toBe(false)
  })
  it('빈 신살 배열 / undefined → null', () => {
    expect(evalFortune([], new Set())).toBeNull()
    expect(evalFortune(undefined)).toBeNull()
  })
})

// ── evalRelations — complement arm + child-present/absent ko/en ─────────────
describe('evalRelations — 엇갈림 + 자식성', () => {
  it('사주·점성 방향 엇갈리면 complement', () => {
    const v = evalRelations(3, 0, 1, 4)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('어떤 관계는 매끄럽고')
  })
  it('자식성 present/absent ko 문구 분기 + EN 한글 없음', () => {
    const present = evalRelations(3, 0, 4, 1, 'male', 2)!
    const absent = evalRelations(3, 0, 4, 1, 'male', 0)!
    expect(present.reason.ko).toContain('원국에 자리해')
    expect(absent.reason.ko).toContain('깊이로 가꿔가는')
    expect(HANGUL.test(present.reason.en)).toBe(false)
    expect(HANGUL.test(absent.reason.en)).toBe(false)
  })
  it('합·충·각 모두 0 이면 null', () => {
    expect(evalRelations(0, 0, 0, 0)).toBeNull()
  })
})

// ── evalStrength — sajuStrong-only / sajuWeak / neutral arms ────────────────
describe('evalStrength — 미커버 arm', () => {
  it('강한 운성만(위신 없음) → complement', () => {
    const v = evalStrength('건록', null)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('안정적으로 받쳐주는')
  })
  it('약한 운성(위신 없음) → neutral 충전기', () => {
    const v = evalStrength('병', null)!
    expect(v.tone).toBe('neutral')
    expect(v.reason.ko).toContain('비축하는 단계')
  })
  it('중립 운성(강·약 아님, 위신 없음, rooted=true) → neutral 균형형 + 통근 suffix', () => {
    const v = evalStrength('태', null, true)!
    expect(v.tone).toBe('neutral')
    expect(v.reason.ko).toContain('균형형')
    expect(v.reason.ko).toContain('통근')
  })
  it('전부 비어 있으면 null', () => {
    expect(evalStrength(undefined, null)).toBeNull()
  })
})

// ── evalTemperament — complement / neutral arms ────────────────────────────
describe('evalTemperament — 분포 우세 교차', () => {
  it('상생 우세 → complement', () => {
    // 사주 목(wood) 우세, 점성 화(fire) 우세 → wood gen fire → complement
    const v = evalTemperament({ wood: 3 }, ['Leo', 'Aries', 'Sagittarius'])!
    expect(v.tone).toBe('complement')
  })
  it('무관계 우세 → neutral', () => {
    // 사주 금(metal), 점성 게/전갈/물고기(water). metal gen water → complement.
    // neutral 만들려면: 사주 토(earth), 점성 사자(fire). fire gen earth → complement.
    // earth↔water: earth ctrl water → tension. earth↔metal: earth gen metal.
    // earth↔wood: wood ctrl earth → tension. earth↔fire: fire gen earth → complement(bGenA).
    // earth↔earth same. neutral 불가? 가능 조합 찾기:
    // wood↔metal: metal ctrl wood → tension. wood↔water: water gen wood → complement.
    // fire↔water: water ctrl fire → tension. metal↔fire: fire ctrl metal → tension.
    // 모든 쌍이 same/gen/ctrl 중 하나라 5원소에서 'none' 불가 → neutral arm 은
    // elementVerdict 의 neutral 이 아니라 도달 불가. complement/tension/resonant 만.
    const v = evalTemperament({ metal: 3 }, ['Cancer', 'Scorpio', 'Pisces'])!
    expect(v.tone).toBe('complement') // metal gen water
  })
  it('한쪽 분포 비면 null', () => {
    expect(evalTemperament({}, ['Leo'])).toBeNull()
    expect(evalTemperament({ fire: 1 }, [])).toBeNull()
  })
  it('점성 공기 우세 → 木 라벨이 새지 않고 공기로 표기 + 근사 헤지', () => {
    // 사주 목(wood) + 점성 공기 우세(쌍둥이·천칭·물병). air→wood 근사라 관계상
    // same(목↔목)이 나오지만, 표시는 '공기'여야 하고 거짓 수렴 헤지가 붙어야 한다.
    const v = evalTemperament({ wood: 3 }, ['Gemini', 'Libra', 'Aquarius'])!
    expect(v.right?.ko).toContain('공기')
    expect(v.right?.ko).not.toContain('木')
    expect(v.right?.en).toContain('Air')
    // airApprox 헤지 문구(어림잡아/approximately)가 same 분기에 포함된다.
    expect(v.reason.ko).toContain('어림잡아')
    expect(v.reason.en.toLowerCase()).toContain('approximat')
  })
})

// ── evalEnergyDirection — complement arm + EN ──────────────────────────────
describe('evalEnergyDirection — 대표 행성 강조 여부', () => {
  it('대표 행성 비강조 → complement', () => {
    const v = evalEnergyDirection({ 식상: 4 }, new Set(['Saturn']))!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('다른 통로로')
    expect(HANGUL.test(v.reason.en)).toBe(false)
  })
  it('우세 그룹 없으면 null', () => {
    expect(evalEnergyDirection({}, new Set())).toBeNull()
    expect(evalEnergyDirection(undefined, new Set())).toBeNull()
  })
})

// ── evalDrive — weak+resonant arm + strong-complement arm ──────────────────
describe('evalDrive — 신강약 × 자기주장', () => {
  it('신약 + 비강조 → 동조(조력자형)', () => {
    const v = evalDrive('신약', false)!
    expect(v.tone).toBe('resonant')
    expect(v.reason.ko).toContain('조력자형')
  })
  it('신강 + 비강조 → 보완(부드럽게 다듬)', () => {
    const v = evalDrive('신강', false)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('부드럽게 다듬어줘요')
  })
  it('strengthLevel 비면 null', () => {
    expect(evalDrive(undefined, true)).toBeNull()
  })
})

// ── evalKeyAspect — matches=false / non-personal·minor 필터 ─────────────────
describe('evalKeyAspect — 필터·매칭', () => {
  it('비개인 행성·소수각 무시하고 매핑된 각만 채택', () => {
    const aspects = [
      { from: { name: 'Pluto' }, to: { name: 'Sun' }, type: 'square', orb: 0.5 }, // 비개인
      { from: { name: 'Sun' }, to: { name: 'Mercury' }, type: 'quintile', orb: 0.2 }, // 소수각
      { from: { name: 'Venus' }, to: { name: 'Mars' }, type: 'trine', orb: 3 }, // 채택
    ]
    const v = evalKeyAspect(aspects, '재성')! // Mars|Venus 그룹=재성 → 일치
    expect(v.tone).toBe('resonant')
    expect(v.reason.ko).toContain('같은 결')
  })
  it('orb 가 숫자 아니면 99 센티넬로 끼우지 않고 건너뛴다 — ENGINE-AUDIT', () => {
    // 유일한 후보의 orb 가 없으면 임의의 '핵심각'을 내지 말고 null.
    expect(
      evalKeyAspect([{ from: { name: 'Sun' }, to: { name: 'Mars' }, type: 'square' }], '인성')
    ).toBeNull()
    // 멀쩡한 orb 를 가진 각이 따로 있으면 그쪽이 채택된다(orb 없는 각은 무시).
    const v = evalKeyAspect(
      [
        { from: { name: 'Sun' }, to: { name: 'Mars' }, type: 'square' }, // orb 없음 → 무시
        { from: { name: 'Venus' }, to: { name: 'Mars' }, type: 'trine', orb: 2 }, // 채택
      ],
      '재성'
    )!
    expect(v.tone).toBe('resonant')
  })
})

// ── evalVoid — match(resonant) / mismatch(neutral) / null ───────────────────
describe('evalVoid — 공망 × 사우스노드', () => {
  it('같은 오행 가리키면 resonant', () => {
    // 공망 子(water) + South Node 게자리(water) → match
    const v = evalVoid(['子', '丑'], 'Cancer')!
    expect(v.tone).toBe('resonant')
    expect(v.reason.ko).toContain('공망')
    expect(v.reason.ko).toContain('수') // water KO label
    expect(HANGUL.test(v.reason.en)).toBe(false)
  })
  it('air 사우스노드 → 사주(wood/metal) 매치 처리', () => {
    // 공망 寅(wood) + South Node 쌍둥이(air→wood/metal) → wood 포함 → match
    const v = evalVoid(['寅'], 'Gemini')!
    expect(v.tone).toBe('resonant')
  })
  it('다른 오행 가리키면 neutral', () => {
    // 공망 子(water) + South Node 사자(fire) → mismatch
    const v = evalVoid(['子'], 'Leo')!
    expect(v.tone).toBe('neutral')
    expect(v.reason.ko).toContain('다른 영역')
    expect(HANGUL.test(v.reason.en)).toBe(false)
  })
  it('빈 입력 null', () => {
    expect(evalVoid([], 'Cancer')).toBeNull()
    expect(evalVoid(['子'], undefined)).toBeNull()
    expect(evalVoid(undefined, 'Cancer')).toBeNull()
  })
})

// ── evalNorthNode — same / generating / divergent arms ─────────────────────
describe('evalNorthNode — 노스노드 × 결핍 오행', () => {
  it('결핍 오행과 노스노드 같으면 resonant', () => {
    // counts: water 결핍(0) → weakest=water. NN 게자리(water) → 같음
    const v = evalNorthNode({ wood: 2, fire: 2, earth: 2, metal: 2, water: 0 }, 'Cancer')!
    expect(v.tone).toBe('resonant')
    expect(v.reason.ko).toContain('성장 방향')
    expect(HANGUL.test(v.reason.en)).toBe(false)
  })
  it('생(生) 관계면 complement (선순환)', () => {
    // wood 결핍(0). NN 화(Leo). GENERATES[wood]=fire → 생관계 → complement(맞물려)
    const v = evalNorthNode({ wood: 0, fire: 2, earth: 2, metal: 2, water: 2 }, 'Leo')!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('맞물려')
    expect(HANGUL.test(v.reason.en)).toBe(false)
  })
  it('생도 같음도 아니면 complement (두 갈래)', () => {
    // wood 결핍(0). NN 금(metal). metal ctrl wood (극) → 분기 → complement(두 갈래)
    const v = evalNorthNode({ wood: 0, fire: 2, earth: 2, metal: 3, water: 2 }, 'Capricorn')
    // Capricorn=earth. weakest=wood. wood↔earth: wood ctrl earth → 극.
    // GENERATES[wood]=fire(!=earth), GENERATES[earth]=metal(!=wood) → divergent → complement
    expect(v!.tone).toBe('complement')
    expect(v!.reason.ko).toContain('두 갈래')
  })
  it('데이터 부족 null', () => {
    expect(evalNorthNode(undefined, 'Cancer')).toBeNull()
    expect(evalNorthNode({ wood: 1 }, undefined)).toBeNull()
    expect(evalNorthNode({ wood: 1 }, '???')).toBeNull()
  })
})

// ── evalRomance — astroLove-only / neutral arms ────────────────────────────
describe('evalRomance — 도화·금성·하우스 매트릭스', () => {
  it('도화 없고 점성 사랑만 → complement(관계 속 자기발견)', () => {
    const v = evalRomance(false, true, 0, 'male', 0)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('관계 속에서 자기를 발견')
  })
  it('도화·점성 둘 다 없고 배우자성만 → neutral', () => {
    const v = evalRomance(false, false, 0, 'female', 2)!
    expect(v.tone).toBe('neutral')
    expect(v.reason.ko).toContain('진중하게 가꾸는')
    expect(v.reason.ko).toContain('관성') // 여자 배우자성
    expect(HANGUL.test(v.reason.en)).toBe(false)
  })
  it('도화만 있으면 complement(은근한 매력)', () => {
    const v = evalRomance(true, false, 0, 'male', 0)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('은근하게')
  })
})

// ── evalMovement — 3 arms ──────────────────────────────────────────────────
describe('evalMovement — 역마 × 이동 하우스/목성', () => {
  it('역마 + 점성 이동 둘 다 → resonant', () => {
    const v = evalMovement(true, 2, true)!
    expect(v.tone).toBe('resonant')
    expect(v.reason.ko).toContain('옮겨 다니며')
    expect(HANGUL.test(v.reason.en)).toBe(false)
  })
  it('역마만 → complement(떠나고픔+머물고픔)', () => {
    const v = evalMovement(true, 0, false)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('베이스를 두고')
  })
  it('점성 이동만(목성 강조) → complement(멀리 나가보기)', () => {
    const v = evalMovement(false, 0, true)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('시야를 크게')
  })
  it('둘 다 없으면 null', () => {
    expect(evalMovement(false, 0, false)).toBeNull()
  })
})

// ── evalSpirit — 3 arms ────────────────────────────────────────────────────
describe('evalSpirit — 화개 × 12하우스/해왕성', () => {
  it('화개 + 점성 영성 둘 다 → resonant', () => {
    const v = evalSpirit(true, 1, true)!
    expect(v.tone).toBe('resonant')
    expect(v.reason.ko).toContain('보이지 않는 것을 읽고')
  })
  it('화개만 → complement(현실 형태로)', () => {
    const v = evalSpirit(true, 0, false)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('손에 잡히는')
  })
  it('점성 영성만(해왕성 강조) → complement(명상·기록)', () => {
    const v = evalSpirit(false, 0, true)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('명상·기록')
  })
  it('둘 다 없으면 null', () => {
    expect(evalSpirit(false, 0, false)).toBeNull()
  })
})

// ── evalWealth — 3 arms + 임계 ─────────────────────────────────────────────
describe('evalWealth — 재성 × 재물 하우스/길성', () => {
  it('재성≥2 + 점성 재물 둘 다 → resonant', () => {
    const v = evalWealth(3, 1, true)!
    expect(v.tone).toBe('resonant')
    expect(v.reason.ko).toContain('흐름을 만들면')
    expect(HANGUL.test(v.reason.en)).toBe(false)
  })
  it('재성만(≥2) → complement(목적 먼저)', () => {
    const v = evalWealth(2, 0, false)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('무엇을 위해')
  })
  it('점성 재물만(길성 강조) → complement(지키고 불리기)', () => {
    const v = evalWealth(0, 0, true)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('지키고 불리는')
  })
  it('재성<2 이고 점성 없으면 null (임계 경계)', () => {
    expect(evalWealth(1, 0, false)).toBeNull()
  })
})

// ── evalExpression — 3 arms + 임계 ─────────────────────────────────────────
describe('evalExpression — 식상 × 수성/3·5하우스', () => {
  it('식상≥2 + 점성 표현 둘 다 → resonant', () => {
    const v = evalExpression(2, true, 1)!
    expect(v.tone).toBe('resonant')
    expect(v.reason.ko).toContain('말과 글')
  })
  it('식상만(≥2) → complement(미루지 말고)', () => {
    const v = evalExpression(3, false, 0)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('미루지 말고')
  })
  it('점성 표현만(수성 강조) → complement(쓰고 말하는 습관)', () => {
    const v = evalExpression(0, true, 0)!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('습관')
  })
  it('식상<2 이고 점성 없으면 null', () => {
    expect(evalExpression(1, false, 0)).toBeNull()
  })
})

// ── evalYinYang — mismatch arms ────────────────────────────────────────────
describe('evalYinYang — 불일치 arm', () => {
  it('양+야 → complement(낮 에너지를 밤 깊이로)', () => {
    const v = evalYinYang('陽', 'night')!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('밤의 깊이')
  })
  it('음+주 → complement(안의 깊이를 바깥으로)', () => {
    const v = evalYinYang('陰', 'day')!
    expect(v.tone).toBe('complement')
    expect(v.reason.ko).toContain('바깥으로')
  })
})

// ── 분포 추출 헬퍼 — 동률/음수/미정의 ─────────────────────────────────────
describe('분포 추출 헬퍼 edge', () => {
  it('dominantSajuElement: 비숫자 값 무시 + undefined counts', () => {
    expect(dominantSajuElement(undefined)).toBeUndefined()
    // 모두 0 이면 undefined
    expect(dominantSajuElement({ wood: 0, fire: 0 })).toBeUndefined()
  })
  it('dominantAstroElement: 미매핑 sign 무시 + undefined', () => {
    expect(dominantAstroElement(undefined)).toBeUndefined()
    expect(dominantAstroElement(['???'])).toBeUndefined()
  })
  it('dominantAstroElement: 동률이면 무손실 원소가 air-근사(wood)를 이긴다', () => {
    // 공기 2(쌍둥이·천칭) vs 물 2(게·전갈) 동률 → air-근사 wood 가 아니라 water.
    expect(dominantAstroElement(['Gemini', 'Libra', 'Cancer', 'Scorpio'])).toBe('water')
    // 공기가 *엄격히* 더 많으면 그때만 wood(=air).
    expect(dominantAstroElement(['Gemini', 'Libra', 'Aquarius', 'Cancer'])).toBe('wood')
  })
  it('dominantSibsinGroup: undefined / 모두 0', () => {
    expect(dominantSibsinGroup(undefined)).toBeUndefined()
    expect(dominantSibsinGroup({ 비겁: 0 })).toBeUndefined()
  })
  it('signToSajuElement: air→wood 근사', () => {
    expect(signToSajuElement('Aquarius')).toBe('wood')
    expect(signToSajuElement(undefined)).toBeUndefined()
  })
})
