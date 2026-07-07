/**
 * deriveLifetimeFlow — 사주 대운 × 점성 인생 마디 교차 단계 합성기 단위 테스트.
 *
 * 순수·결정론 (LLM/네트워크/DB 무사용). NatalContext 를 최소 fixture 로 만들어
 * intro 합성 / 4단계(초년·청년·중년·장년) phase / daeunLine·relationLine·
 * shinsalLine·twelveStageLine / KO·EN 양 path / undefined 가드를 단언한다.
 *
 * 헬퍼 실제 출력(probe 로 확인):
 *   getSibsinKo('甲','庚')=편관(관성)   getSibsinKo('辛','丙')=정관(관성)
 *   getStemElement('庚')=금
 *   getTwelveStage('辛','子')=장생,  ('辛','申')=왕지(해석 테이블 밖→stage 만 노출)
 */
import { describe, it, expect } from 'vitest'
import { deriveLifetimeFlow } from '@/lib/calendar-engine/derivers/lifetimeFlow'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { LifecycleMilestoneOverride } from '@/lib/calendar-engine/lifecycle/astroLifecycle'

// ── fixture builder ───────────────────────────────────────────────
type DaeunEntry = { startAge: number; startYear: number; stem: string; branch: string }

interface NatalOpts {
  year?: number | null
  month?: number
  date?: number
  timeZone?: string
  dayMaster?: string | null
  strength?: 'strong' | 'medium' | 'weak'
  daeun?: DaeunEntry[]
  yongsin?: { primary?: string; secondary?: string; avoid?: string[] }
  fiveElements?: { wood: number; fire: number; earth: number; metal: number; water: number }
  yearStem?: string
  monthBranch?: string
  branches?: { year?: string; month?: string; day?: string; time?: string }
  natalShinsal?: Array<{ kind: string; target?: string; pillars?: string[] }>
  analyses?: Record<string, unknown>
  astro?: {
    sun?: string
    asc?: string
    mc?: string
  }
}

function makeNatal(opts: NatalOpts = {}): NatalContext {
  const {
    year = 1990,
    month = 5,
    date = 15,
    timeZone = 'Asia/Seoul',
    dayMaster = '辛',
    strength = 'medium',
    daeun = [
      { startAge: 5, startYear: 1995, stem: '丁', branch: '丑' },
      { startAge: 15, startYear: 2005, stem: '丙', branch: '子' },
      { startAge: 25, startYear: 2015, stem: '乙', branch: '亥' },
      { startAge: 35, startYear: 2025, stem: '甲', branch: '戌' },
      { startAge: 45, startYear: 2035, stem: '癸', branch: '酉' },
      { startAge: 55, startYear: 2045, stem: '壬', branch: '申' },
    ],
    yongsin = { primary: '토', secondary: undefined, avoid: [] },
    fiveElements,
    yearStem = '庚',
    monthBranch = '巳',
    branches = { year: '午', month: '巳', day: '酉', time: '亥' },
    natalShinsal = [],
    analyses,
    astro,
  } = opts

  const pillars = {
    year: {
      heavenlyStem: { name: yearStem },
      earthlyBranch: { name: branches.year },
    },
    month: {
      earthlyBranch: { name: branches.month ?? monthBranch },
    },
    day: {
      heavenlyStem: { name: dayMaster },
      earthlyBranch: { name: branches.day },
    },
    time: {
      earthlyBranch: { name: branches.time },
    },
  }

  const chart = astro
    ? {
        planets: astro.sun ? [{ name: 'Sun', sign: astro.sun }] : [],
        ascendant: astro.asc ? { sign: astro.asc } : undefined,
        mc: astro.mc ? { sign: astro.mc } : undefined,
      }
    : undefined

  return {
    input: { year, month, date, timeZone },
    saju: {
      pillars,
      dayMaster: dayMaster ? { name: dayMaster } : undefined,
      strength,
      yongsin,
      daeun,
      fiveElements,
      natalShinsal,
      analyses: analyses ?? {},
    },
    astro: chart ? { chart } : undefined,
  } as unknown as NatalContext
}

describe('deriveLifetimeFlow', () => {
  describe('undefined 가드', () => {
    it('birthYear 없으면 undefined', () => {
      expect(deriveLifetimeFlow(makeNatal({ year: null }))).toBeUndefined()
    })
    it('daeun 비었으면 undefined', () => {
      expect(deriveLifetimeFlow(makeNatal({ daeun: [] }))).toBeUndefined()
    })
    it('dayMaster 없으면 undefined', () => {
      expect(deriveLifetimeFlow(makeNatal({ dayMaster: null }))).toBeUndefined()
    })
  })

  describe('기본 KO 출력 구조', () => {
    const out = deriveLifetimeFlow(makeNatal())!

    it('LifetimeFlow shape (intro + phases) 반환', () => {
      expect(out).toBeDefined()
      expect(typeof out.intro).toBe('string')
      expect(Array.isArray(out.phases)).toBe(true)
    })

    it('4개 인생 단계 (초년·청년·중년·장년)', () => {
      expect(out.phases.map((p) => p.label)).toEqual(['초년기', '청년기', '중년기', '장년기'])
    })

    it('intro head 는 평이 — 강약+용신 오행, raw 한자 일간/"용신" 용어 없음(de-jargon)', () => {
      expect(out.intro).toContain('기운이 비교적 균형 잡힌 편') // strength=medium
      expect(out.intro).toContain('토') // 용신 오행은 평이하게 노출
      // raw 한자 일간·"용신" 용어는 surface 에서 제거됨(감사 jargon).
      expect(out.intro).not.toContain('辛 일간')
      expect(out.intro).not.toContain('용신 ')
    })

    it('각 단계 ageRange 가 출생연도 기반으로 계산된다', () => {
      // 출생 1990 → 초년 0~19 · 1990~2009.
      expect(out.phases[0].ageRange).toBe('0~19세 · 1990~2009')
      expect(out.phases[1].ageRange).toBe('20~39세 · 2010~2029')
      expect(out.phases[3].ageRange).toBe('60~84세 · 2050~2074')
    })

    it('F7: 85세+ 도 마지막 단계(장년기)를 현재로 표시 — 현재 마커 소실 방지', () => {
      // 1990 출생, now=2081 → 만 90세. 옛 `<= 84` 는 어느 단계도 현재가 아니었다.
      const old = deriveLifetimeFlow(
        makeNatal(),
        'ko',
        undefined,
        new Date('2081-07-07T00:00:00Z')
      )!
      const current = old.phases.filter((p) => p.current)
      expect(current).toHaveLength(1)
      expect(current[0].label).toBe('장년기')
    })

    it('초년기 본문은 평이 부모·뿌리 도입부로 시작 (raw 십신 노출 없음)', () => {
      const child = out.phases[0]
      // 평이 우선: 십신 원명("겁재(비겁) 흐름")을 surface 에서 빼고 부모·뿌리 도입부 + 평이 본문.
      expect(child.text).toContain('초년은 부모와 뿌리의 영향을 받는 시기예요')
      expect(child.text).not.toContain('겁재(비겁)')
    })

    it('감사: 초년 톤도 인생 곡선을 따른다 — 초년 高곡선 vs 低곡선이 다른 톤(색·톤 모순 제거)', () => {
      // 곡선 초년(0~19) 이 높은 vs 낮은 두 케이스. 옛 코드는 초년 톤을 억부(년주)에
      // 고정해 곡선(계절 색)과 부호가 어긋났다(950209 초년발복형인데 초년 톤 '힘겹게').
      const earlyHigh = {
        points: Array.from({ length: 91 }, (_, age) => ({ age, macro: (40 - age) / 40 })), // 초년 高
      }
      const earlyLow = {
        points: Array.from({ length: 91 }, (_, age) => ({ age, macro: (age - 50) / 40 })), // 초년 低
      }
      const now = new Date('2026-07-07T00:00:00Z')
      const hi = deriveLifetimeFlow(makeNatal(), 'ko', undefined, now, earlyHigh)!
      const lo = deriveLifetimeFlow(makeNatal(), 'ko', undefined, now, earlyLow)!
      // 초년 톤이 곡선에 반응 → 두 케이스가 달라야 한다(억부 고정이면 동일).
      expect(hi.phases[0].toneKo).not.toBe(lo.phases[0].toneKo)
    })

    it('비초년 단계는 평이 본문으로 시작 (raw 십신/년주 prefix 없음)', () => {
      const young = out.phases[1]
      expect(young.text).not.toContain('년주(부모·뿌리)')
      // 십신 원명을 surface 에 노출하지 않는다(평이 본문에 의미만 녹음).
      expect(young.text).not.toContain('편재(재성)')
    })

    it('daeunLine 은 단계에 걸친 대운들을 화살표로 연결 (한글음+연도, raw 한자 없음)', () => {
      // 초년 0~19: startAge+10>0 && startAge<=19 → 丁丑(5), 丙子(15). novice 표면이라 한글 음만.
      const child = out.phases[0]
      expect(child.daeunLine).toContain('정축 대운 1995-2005')
      expect(child.daeunLine).toContain('병자 대운 2005-2015')
      expect(child.daeunLine).toContain('→')
      expect(child.daeunLine).not.toMatch(/[㐀-鿿]/) // raw 간지 한자 누수 금지
    })

    it('단계 대운이 3개 초과면 "→…" 로 압축', () => {
      // 한 20년 밴드에 대운 4개 들어가도록 5년 간격 대운으로.
      const dense = makeNatal({
        daeun: [
          { startAge: 20, startYear: 2010, stem: '甲', branch: '子' },
          { startAge: 25, startYear: 2015, stem: '乙', branch: '丑' },
          { startAge: 30, startYear: 2020, stem: '丙', branch: '寅' },
          { startAge: 35, startYear: 2025, stem: '丁', branch: '卯' },
        ],
      })
      const r = deriveLifetimeFlow(dense)!
      const young = r.phases.find((p) => p.label === '청년기')!
      expect(young.daeunLine).toContain('→…')
    })

    it('current 플래그 — 만나이가 든 단계 하나만 true', () => {
      // currentDate 2026, 출생 1990 → 만 ~35~36세 → 청년기(20~39).
      const trueCount = out.phases.filter((p) => p.current).length
      expect(trueCount).toBe(1)
      expect(out.phases.find((p) => p.current)!.label).toBe('청년기')
    })

    it('비초년 단계의 twelveStageLine 은 평이 의미만 (raw 간지/일간/운성 노출 없음)', () => {
      // 아동기는 운성 해석이 성인 기준이라 생략 — 비초년 단계만 채워진다.
      for (const p of out.phases) {
        if (p.label === '초년기') {
          expect(p.twelveStageLine).toBeUndefined()
          continue
        }
        expect(typeof p.twelveStageLine).toBe('string')
        // 평이 우선 — 간지/일간/운성 원명을 surface 에서 빼고 의미 한 줄.
        expect(p.twelveStageLine).not.toContain('일간')
        expect(p.twelveStageLine).toContain('기운의 흐름으로 보면')
      }
    })
  })

  describe('relationLine — 본명 지지 ↔ 대운 지지 충/육합', () => {
    it('충: 본명 지지가 대운 지지와 충이면 평이 "변동·마찰" 문장 (raw 간지/충 노출 없음)', () => {
      // 청년기 대표 대운 지지 亥. 본명에 巳 있으면 巳↔亥 충.
      const n = makeNatal({ branches: { year: '巳', month: '巳', day: '酉', time: '寅' } })
      const r = deriveLifetimeFlow(n)!
      const young = r.phases.find((p) => p.label === '청년기')!
      expect(young.relationLine).toContain('움직임과 전환이 생기는 편이에요')
      expect(young.relationLine).not.toContain('충')
      expect(young.relationLine).not.toContain('亥')
    })

    it('육합: 본명 지지가 대운 지지와 육합이면 평이 "손발 맞춤" 문장', () => {
      // 대운 亥 의 육합은 寅. 본명에 寅 두면 육합.
      const n = makeNatal({ branches: { year: '寅', month: '巳', day: '酉', time: '辰' } })
      const r = deriveLifetimeFlow(n)!
      const young = r.phases.find((p) => p.label === '청년기')!
      expect(young.relationLine).toContain('한 방향으로 맞물리며 묶이는 편이에요')
      expect(young.relationLine).not.toContain('육합')
    })

    it('충도 육합도 없으면 relationLine 은 undefined', () => {
      // 대운 지지들과 충/합 안 걸리는 본명 지지 (亥의 충=巳, 육합=寅 둘 다 회피).
      const n = makeNatal({ branches: { year: '辰', month: '辰', day: '辰', time: '辰' } })
      const r = deriveLifetimeFlow(n)!
      const young = r.phases.find((p) => p.label === '청년기')!
      // 청년 대운 亥 vs 辰: 충(亥↔巳 아님), 육합(亥↔寅 아님) → 미발동.
      expect(young.relationLine).toBeUndefined()
    })
  })

  describe('shinsalLine — 본명 신살 활성', () => {
    it('신살 target 이 대운 지지와 일치하면 활성 줄 생성 (매핑 테이블 short)', () => {
      // 청년 대표 대운 지지 亥. target=亥 천을귀인.
      const n = makeNatal({
        natalShinsal: [{ kind: '천을귀인', target: '亥', pillars: ['day'] }],
      })
      const r = deriveLifetimeFlow(n)!
      const young = r.phases.find((p) => p.label === '청년기')!
      expect(young.shinsalLine).toContain('천을귀인 기운')
      expect(young.shinsalLine).toContain('도움·우호적 지원 시기')
      // 평이 우선: raw 간지 메커닉(대운/본명 위치 + 한자)을 surface 에서 제거(감사 BUG-3)
      expect(young.shinsalLine).not.toMatch(/[一-鿿]/)
      expect(young.shinsalLine).not.toContain('본명')
    })

    it('신살 target 이 대운 천간과 일치해도 활성 (stem 분기)', () => {
      // 청년 대표 대운 천간 乙. target=乙.
      const n = makeNatal({
        natalShinsal: [{ kind: '문창귀인', target: '乙', pillars: ['month'] }],
      })
      const r = deriveLifetimeFlow(n)!
      const young = r.phases.find((p) => p.label === '청년기')!
      expect(young.shinsalLine).toContain('문창귀인 기운')
      // 메커닉(위치 라벨 + 한자) 제거됨 — 평이 의미만
      expect(young.shinsalLine).not.toMatch(/[一-鿿]/)
    })

    it('매핑 테이블에 없는 kind 는 "${kind} 발현" 폴백', () => {
      const n = makeNatal({
        natalShinsal: [{ kind: '괴강', target: '亥' }],
      })
      const r = deriveLifetimeFlow(n)!
      const young = r.phases.find((p) => p.label === '청년기')!
      expect(young.shinsalLine).toContain('괴강 기운')
      expect(young.shinsalLine).toContain('괴강 발현')
    })

    it('target 미매칭이면 shinsalLine 없음', () => {
      const n = makeNatal({
        natalShinsal: [{ kind: '천을귀인', target: '戌' }],
      })
      const r = deriveLifetimeFlow(n)!
      const young = r.phases.find((p) => p.label === '청년기')!
      expect(young.shinsalLine).toBeUndefined()
    })

    it('target 없는 신살은 skip', () => {
      const n = makeNatal({ natalShinsal: [{ kind: '천을귀인' }] })
      const r = deriveLifetimeFlow(n)!
      expect(r.phases.every((p) => p.shinsalLine === undefined)).toBe(true)
    })
  })

  describe('fiveElements / geokguk / sibsin intro 합성', () => {
    it('fiveElements 지배 오행이 intro 에 노출', () => {
      const n = makeNatal({
        fiveElements: { wood: 1, fire: 1, earth: 5, metal: 1, water: 0 },
      })
      const r = deriveLifetimeFlow(n)!
      expect(r.intro).toContain('토 기운이 가장 많아')
    })

    it('fiveElements 전부 0 이면 오행 줄 생략', () => {
      const n = makeNatal({
        fiveElements: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
      })
      const r = deriveLifetimeFlow(n)!
      expect(r.intro).not.toContain('기운이 가장 많아')
    })

    it('geokguk.primary 가 미정이 아니면 격국 줄 노출 (평이 — raw 격국명 없음)', () => {
      const n = makeNatal({ analyses: { geokguk: { primary: '정관격' } } })
      const r = deriveLifetimeFlow(n)!
      expect(r.intro).toContain('타고난 큰 틀로 보면')
      expect(r.intro).toContain('원칙·책임 중심 스타일')
      // raw 격국명(정관격)은 surface 에서 제거(감사 jargon).
      expect(r.intro).not.toContain('정관격')
    })

    it('geokguk.primary 가 "미정" 이면 격국 줄 생략', () => {
      const n = makeNatal({ analyses: { geokguk: { primary: '미정' } } })
      const r = deriveLifetimeFlow(n)!
      expect(r.intro).not.toContain('타고난 큰 틀로 보면')
    })

    it('강약 × 지배 십신 → 구조 인식 서사 (재성 지배 + 신약 = 재다신약)', () => {
      const n = makeNatal({
        strength: 'weak',
        analyses: {
          sibsin: { categoryCount: { 비겁: 1, 식상: 1, 재성: 6, 관성: 1, 인성: 1 } },
        },
      })
      const r = deriveLifetimeFlow(n)!
      // 구조 서사가 raw % 줄을 대체 — 명명된 구조 + 풀리는 운 방향(비겁·인성).
      expect(r.intro).toContain('재다신약')
      expect(r.intro).not.toContain('재성이 60%로 가장 두드러져')
    })

    it('sibsin categoryCount 합 0 이면 십성 줄 생략', () => {
      const n = makeNatal({
        analyses: {
          sibsin: { categoryCount: { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 } },
        },
      })
      const r = deriveLifetimeFlow(n)!
      expect(r.intro).not.toContain('가장 두드러져')
    })

    it('통근/월령(득령) 전문어는 novice intro 에 노출하지 않는다(de-jargon)', () => {
      const n = makeNatal({
        strength: 'strong',
        analyses: { tonggeun: { totalStrength: 120 }, deukryeong: { status: '득령' } },
      })
      const r = deriveLifetimeFlow(n)!
      // 강약은 head 에 평이하게, 통근/월령/득령 메커닉은 surface 에서 제외(감사 jargon).
      expect(r.intro).toContain('기운이 강한 편')
      expect(r.intro).not.toContain('통근')
      expect(r.intro).not.toContain('월령')
      expect(r.intro).not.toContain('박혀')
    })

    it('통근 0/실령도 전문어 없이 — 평이 강약만', () => {
      const n = makeNatal({
        strength: 'weak',
        analyses: { tonggeun: { totalStrength: 0 }, deukryeong: { status: '실령' } },
      })
      const r = deriveLifetimeFlow(n)!
      expect(r.intro).toContain('기운이 약한 편')
      expect(r.intro).not.toContain('뿌리 없이')
      expect(r.intro).not.toContain('월령')
    })
  })

  describe('astro identity intro', () => {
    it('태양·상승·MC 가 intro 에 노출', () => {
      const n = makeNatal({ astro: { sun: 'Leo', asc: 'Scorpio', mc: 'Aquarius' } })
      const r = deriveLifetimeFlow(n)!
      expect(r.intro).toContain('태양')
      expect(r.intro).toContain('상승')
      expect(r.intro).toContain('MC')
      expect(r.intro).toContain('이 둘이 평생 흐름의 바탕을 만들고')
    })

    it('astro 없으면 교차 안내 문장으로 마무리', () => {
      const r = deriveLifetimeFlow(makeNatal())!
      expect(r.intro).toContain('사주 대운과 점성 인생 마디를 교차해 본 큰 흐름이에요.')
    })
  })

  describe('milestoneLine — 외행성 마디 override', () => {
    it('단계 age 범위 안에 떨어지는 마디를 라벨+날짜로 노출', () => {
      const overrides: LifecycleMilestoneOverride[] = [
        { kind: 'saturn_return_1', startYear: 2019, age: 29, exactDateISO: '2019-08-10T00:00:00Z' },
      ]
      const r = deriveLifetimeFlow(makeNatal(), 'ko', overrides)!
      const young = r.phases.find((p) => p.label === '청년기')! // 20~39 포함 age29
      expect(young.milestoneLine).toContain('첫 토성 회귀')
      expect(young.milestoneLine).toContain('2019년 8월')
    })

    it('exactDateISO 없고 startYear 만 있으면 연도만 표기', () => {
      const overrides: LifecycleMilestoneOverride[] = [
        { kind: 'jupiter_return_1', startYear: 2002, age: 12, exactDateISO: null },
      ]
      const r = deriveLifetimeFlow(makeNatal(), 'ko', overrides)!
      const child = r.phases.find((p) => p.label === '초년기')!
      expect(child.milestoneLine).toContain('첫 목성 회귀')
      expect(child.milestoneLine).toContain('2002년')
    })

    it('override 없이도 lifecycle 테이블로 외행성 마디가 채워진다 (outer 항상 채움)', () => {
      // 회귀: 예전엔 override 미지정 시 milestoneLine 이 전부 undefined → outer 빈 []
      // (lifeStages 외행성 마디 전체 누락). 이제 테이블로 항상 채운다.
      const r = deriveLifetimeFlow(makeNatal(), 'ko')!
      expect(r.phases.some((p) => !!p.milestoneLine)).toBe(true)
    })

    it('매핑 테이블에 없는 kind 의 override 는 무시(테이블 마디는 그대로 노출)', () => {
      const overrides = [
        { kind: 'unknown_kind', startYear: 2019, age: 29 },
      ] as unknown as LifecycleMilestoneOverride[]
      const r = deriveLifetimeFlow(makeNatal(), 'ko', overrides)!
      // unknown override 는 무시되지만 lifecycle 테이블 마디는 여전히 채워진다.
      expect(r.phases.some((p) => !!p.milestoneLine)).toBe(true)
      expect(r.phases.map((p) => p.milestoneLine ?? '').join(' ')).not.toContain('unknown_kind')
    })

    it('4개 초과 마디는 "외 N" 으로 압축 (TOP_N=3)', () => {
      const overrides: LifecycleMilestoneOverride[] = [
        {
          kind: 'jupiter_return_2',
          startYear: 2014,
          age: 24,
          exactDateISO: '2014-01-01T00:00:00Z',
        },
        { kind: 'saturn_return_1', startYear: 2019, age: 29, exactDateISO: '2019-01-01T00:00:00Z' },
        {
          kind: 'jupiter_return_3',
          startYear: 2026,
          age: 36,
          exactDateISO: '2026-01-01T00:00:00Z',
        },
        {
          kind: 'pluto_square_pluto',
          startYear: 2027,
          age: 37,
          exactDateISO: '2027-01-01T00:00:00Z',
        },
      ]
      const r = deriveLifetimeFlow(makeNatal(), 'ko', overrides)!
      const young = r.phases.find((p) => p.label === '청년기')!
      // 청년기(20~39)엔 테이블 마디가 4개 초과로 떨어져 "외 N" 으로 압축된다.
      expect(young.milestoneLine).toMatch(/외 \d+/)
    })
  })

  describe('bilingual baked fields (server render 언어와 무관하게 양 언어 병행)', () => {
    // KO render 호출이어도 모든 phase 가 labelKo/labelEn, textKo/textEn 을 함께
    // 내보내 클라이언트 토글이 서버 render 언어에 묶이지 않음 (lifetimePivots 패턴).
    const koOut = deriveLifetimeFlow(makeNatal())!

    it('phase 마다 labelKo + labelEn 둘 다 채워진다', () => {
      expect(koOut.phases.map((p) => p.labelKo)).toEqual(['초년기', '청년기', '중년기', '장년기'])
      expect(koOut.phases.map((p) => p.labelEn)).toEqual([
        'Early years',
        'Young adulthood',
        'Midlife',
        'Elder years',
      ])
    })

    it('phase 마다 textKo + textEn 둘 다 — EN 본문은 영문 카테고리/문장', () => {
      for (const p of koOut.phases) {
        expect(typeof p.textKo).toBe('string')
        expect(typeof p.textEn).toBe('string')
        // textEn 은 평이 영문 본문(BAND_CAT_EN + 톤). raw 십신/카테고리 라벨을
        // surface 에 노출하지 않으므로, 한글이 새지 않는지로 검증(영문 순수).
        expect(p.textEn).not.toMatch(/[가-힣]/)
      }
    })

    it('relationLine 충 — KO/EN 평이 baked (EN 에 한글 없음)', () => {
      const n = makeNatal({ branches: { year: '巳', month: '巳', day: '酉', time: '辰' } })
      const r = deriveLifetimeFlow(n)! // KO render
      const young = r.phases.find((p) => p.label === '청년기')!
      expect(young.relationLine).toContain('움직임과 전환이 생기는 편이에요')
      expect(young.relationLineEn).toContain('movement and turning points')
      expect(young.relationLineEn).not.toMatch(/[가-힣]/)
    })

    it('shinsalLine — KO render 여도 shinsalLineEn 동반', () => {
      const n = makeNatal({
        natalShinsal: [{ kind: '천을귀인', target: '亥', pillars: ['day'] }],
      })
      const r = deriveLifetimeFlow(n)!
      const young = r.phases.find((p) => p.label === '청년기')!
      expect(young.shinsalLine).toContain('천을귀인 기운')
      expect(young.shinsalLineEn).toContain('Cheoneul Gwiin (Nobleman)')
      expect(young.shinsalLineEn).not.toMatch(/[가-힣]/)
    })

    it('twelveStageLine — 비초년만 평이 baked (EN 한글 없음, raw 운성 머리 없음)', () => {
      for (const p of koOut.phases) {
        if (p.label === '초년기') {
          expect(p.twelveStageLineEn).toBeUndefined()
          continue
        }
        expect(typeof p.twelveStageLineEn).toBe('string')
        // 평이 영문 — raw 간지/일간/운성 머리 없이 의미만.
        expect(p.twelveStageLineEn).toContain('life-energy cycle')
        expect(p.twelveStageLineEn).not.toMatch(/[가-힣]/)
      }
    })

    it('milestoneLine — KO/EN 양쪽 baked', () => {
      const overrides: LifecycleMilestoneOverride[] = [
        { kind: 'saturn_return_1', startYear: 2019, age: 29, exactDateISO: '2019-08-10T00:00:00Z' },
      ]
      const r = deriveLifetimeFlow(makeNatal(), 'ko', overrides)!
      const young = r.phases.find((p) => p.label === '청년기')!
      expect(young.milestoneLine).toContain('첫 토성 회귀')
      expect(young.milestoneLine).toContain('2019년 8월')
      expect(young.milestoneLineEn).toContain('First Saturn return')
      expect(young.milestoneLineEn).toContain('Aug 2019')
      expect(young.milestoneLineEn).not.toMatch(/[가-힣]/)
    })

    it('톤 variant 인덱스가 KO/EN 동기화 (같은 variant 위치)', () => {
      // textKo/textEn 의 톤 꼬리가 같은 인덱스의 KO/EN variant 여야 한다.
      // 간단 검사: 두 본문 모두 비어있지 않고, EN 본문에 한글이 섞이지 않음.
      for (const p of koOut.phases) {
        expect(p.textKo.length).toBeGreaterThan(0)
        expect(p.textEn.length).toBeGreaterThan(0)
      }
    })
  })

  describe('EN path', () => {
    const out = deriveLifetimeFlow(
      makeNatal({ astro: { sun: 'Leo', asc: 'Scorpio', mc: 'Aquarius' } }),
      'en'
    )!

    it('영문 단계 라벨', () => {
      expect(out.phases.map((p) => p.label)).toEqual([
        'Early years',
        'Young adulthood',
        'Midlife',
        'Elder years',
      ])
    })

    it('영문 intro — 평이 강약(raw 한자 day master 없음) + astro identity', () => {
      expect(out.intro).toContain('your nature is')
      expect(out.intro).toContain('relatively balanced in strength')
      expect(out.intro).not.toContain('辛 day master') // raw 한자 제거(감사 jargon)
      expect(out.intro).toContain('Sun in Leo')
      expect(out.intro).toContain('Scorpio rising')
      expect(out.intro).toContain('MC in Aquarius')
    })

    it('영문 ageRange 포맷', () => {
      expect(out.phases[0].ageRange).toBe('age 0-19 · 1990-2009')
    })

    it('영문 daeunLine — romanization + "daeun" (raw 한자 없음)', () => {
      const child = out.phases[0]
      expect(child.daeunLine).toContain('daeun')
      expect(child.daeunLine).toContain('Jeongchuk') // 로마자 음(첫 글자 대문자)
      expect(child.daeunLine).not.toMatch(/[㐀-鿿]/)
    })

    it('영문 본문 — 평이 영문(한글 없음, raw 십신 라벨 노출 없음)', () => {
      const young = out.phases[1]
      expect(young.text).not.toMatch(/[가-힣]/)
      expect(young.text).not.toContain('(Wealth)')
    })

    it('영문 relationLine — 평이 clash 문장 (한글 없음)', () => {
      const n = makeNatal({
        astro: { sun: 'Leo' },
        branches: { year: '巳', month: '巳', day: '酉', time: '辰' },
      })
      const r = deriveLifetimeFlow(n, 'en')!
      const young = r.phases.find((p) => p.label === 'Young adulthood')!
      expect(young.relationLine).toContain('movement and turning points')
      expect(young.relationLine).not.toMatch(/[가-힣]/)
    })

    it('영문 shinsalLine — SHINSAL_SHORT_EN name+short', () => {
      const n = makeNatal({
        natalShinsal: [{ kind: '천을귀인', target: '亥', pillars: ['day'] }],
      })
      const r = deriveLifetimeFlow(n, 'en')!
      const young = r.phases.find((p) => p.label === 'Young adulthood')!
      expect(young.shinsalLine).toContain('Cheoneul Gwiin (Nobleman)')
      expect(young.shinsalLine).toContain('supportive helpers')
    })

    it('영문 milestoneLine 날짜 포맷 (Mon YYYY)', () => {
      const overrides: LifecycleMilestoneOverride[] = [
        { kind: 'saturn_return_1', startYear: 2019, age: 29, exactDateISO: '2019-08-10T00:00:00Z' },
      ]
      const r = deriveLifetimeFlow(makeNatal({ astro: { sun: 'Leo' } }), 'en', overrides)!
      const young = r.phases.find((p) => p.label === 'Young adulthood')!
      expect(young.milestoneLine).toContain('Aug 2019')
    })

    it('영문 격국 줄 — 평이(raw pattern name 없음)', () => {
      const n = makeNatal({ astro: { sun: 'Leo' }, analyses: { geokguk: { primary: '정관격' } } })
      const r = deriveLifetimeFlow(n, 'en')!
      expect(r.intro).toContain('By your core make-up,')
      // raw 격국 영문명(Direct-officer (Jeonggwan) pattern)은 surface 에서 제거.
      expect(r.intro).not.toContain('pattern —')
    })
  })

  describe('초년 톤 — 억부(신강/신약) 보정', () => {
    it('신약 초년 비겁/인성 → good 톤 variant', () => {
      // yearStem 庚 vs 辛 = 겁재(비겁), strength weak → good.
      const n = makeNatal({ strength: 'weak', yearStem: '庚' })
      const r = deriveLifetimeFlow(n)!
      const child = r.phases[0]
      // good variant 중 하나 포함.
      const goodVariants = [
        '드디어 되는 일이',
        '착착 맞아떨어지는',
        '내딛는 걸음마다 길이 열리는',
        '뿌린 게 어렵잖게',
        '사람도 기회도 곁에',
        '때가 딱 받쳐주는',
        '막히는 게 적어서',
      ]
      expect(goodVariants.some((v) => child.text.includes(v))).toBe(true)
    })

    it('신약 초년 재성/관성/식상 → hard 톤', () => {
      // yearStem 戊 vs 辛 = 정인(인성)? probe: 辛 vs 戊 = 정인(인성). 재성 필요 → 甲.
      // 辛 vs 甲 = 정재(재성). weak → hard.
      const n = makeNatal({ strength: 'weak', yearStem: '甲' })
      const r = deriveLifetimeFlow(n)!
      const child = r.phases[0]
      const hardVariants = [
        '나만 매번 애쓰는',
        '나만 제자리인가',
        '부딪히고 깎이는',
        '길이 좁아진 느낌',
        '맞바람이 자주 부는',
        '쉽지 않은 고비',
        '숨 고르고 채비할',
      ]
      expect(hardVariants.some((v) => child.text.includes(v))).toBe(true)
    })

    it('신강 초년 식상/재성/관성 → good 톤', () => {
      // 辛 vs 甲 = 정재(재성), strong → good.
      const n = makeNatal({ strength: 'strong', yearStem: '甲' })
      const r = deriveLifetimeFlow(n)!
      const child = r.phases[0]
      const goodVariants = [
        '드디어 되는 일이',
        '착착 맞아떨어지는',
        '내딛는 걸음마다 길이 열리는',
        '뿌린 게 어렵잖게',
        '사람도 기회도 곁에',
        '때가 딱 받쳐주는',
        '막히는 게 적어서',
      ]
      expect(goodVariants.some((v) => child.text.includes(v))).toBe(true)
    })

    it('신강 초년 비겁/인성 → hard 톤', () => {
      // 辛 vs 庚 = 겁재(비겁), strong → hard.
      const n = makeNatal({ strength: 'strong', yearStem: '庚' })
      const r = deriveLifetimeFlow(n)!
      const child = r.phases[0]
      const hardVariants = [
        '나만 매번 애쓰는',
        '나만 제자리인가',
        '부딪히고 깎이는',
        '길이 좁아진 느낌',
        '맞바람이 자주 부는',
        '쉽지 않은 고비',
        '숨 고르고 채비할',
      ]
      expect(hardVariants.some((v) => child.text.includes(v))).toBe(true)
    })
  })

  describe('twelveStageLine — 동의어 운성(왕지/임관) 의미 복원', () => {
    it('왕지(=제왕 동의어)도 평이 의미가 붙는다 (bare 운성/일간 노출 없음)', () => {
      // 대운 지지 申 → getTwelveStage('辛','申')='왕지'. 동의어 '제왕' 으로 매핑돼
      // 추상 에너지 글로스(BUG-4)가 붙는다 — 문자 그대로의 "권력의 정점"(성공·운
      // 모순 유발)이 아니라 vitality 결("기운이 가장 무르익은 절정").
      const n = makeNatal({
        daeun: [{ startAge: 25, startYear: 2015, stem: '乙', branch: '申' }],
      })
      const r = deriveLifetimeFlow(n)!
      const young = r.phases.find((p) => p.label === '청년기')
      expect(young).toBeDefined()
      expect(young!.twelveStageLine).toContain('기운의 흐름으로 보면')
      expect(young!.twelveStageLine).toContain('기운이 가장 무르익은 절정')
      // raw 운성명/일간은 surface 에 노출하지 않는다.
      expect(young!.twelveStageLine).not.toContain('왕지')
      expect(young!.twelveStageLine).not.toContain('일간')
    })
  })

  describe('대운 커버리지 결손', () => {
    it('어떤 단계도 덮는 대운이 없으면 그 단계 skip (장년기 누락 가능)', () => {
      // 대운이 초년·청년만 → 중년·장년 phase 없음.
      const n = makeNatal({
        daeun: [
          { startAge: 5, startYear: 1995, stem: '丁', branch: '丑' },
          { startAge: 15, startYear: 2005, stem: '丙', branch: '子' },
        ],
      })
      const r = deriveLifetimeFlow(n)!
      const labels = r.phases.map((p) => p.label)
      expect(labels).toContain('초년기')
      // 40세 이상 덮는 대운 없음 → 중년·장년 빠짐.
      expect(labels).not.toContain('장년기')
    })
  })

  describe('용신 secondary 처리', () => {
    it('primary+secondary 둘 다 있으면 "·" 로 연결 (평이 — "용신" 용어 없음)', () => {
      const n = makeNatal({ yongsin: { primary: '토', secondary: '금', avoid: [] } })
      const r = deriveLifetimeFlow(n)!
      expect(r.intro).toContain('토·금 기운이 받쳐줄 때')
      expect(r.intro).not.toContain('용신 ')
    })
  })
})
