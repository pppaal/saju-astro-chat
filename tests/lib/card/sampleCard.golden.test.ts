/**
 * 홈 샘플 사주 카드 골든 — src/app/(main)/home/sampleCard.ts 가 지금 엔진의 출력과 같은지 본다.
 *
 * 홈은 샘플 카드를 요청마다 계산하지 않고(Swiss Ephemeris 비용) 체크인된 픽스처를 그린다.
 * 그 픽스처가 엔진과 어긋나면 홈이 엔진이 말하지 않는 값을 보여 주므로, 이 테스트가 같은
 * 입력 · 같은 now 로 다시 만들어 깊은 비교를 한다:
 *
 *  - SAMPLE_CARD: buildSajuCardData (리포트와 같은 길 — 타입 이름 · 정체성 · 합의 줄)
 *  - SAMPLE_BAND.traits: 그 카드를 계산한 교차 행 중 띠 대체 행(정체성 · 기질), ko/en
 *  - SAMPLE_BAND.timing: /destiny 와 같은 길(buildNatalContext → 그날 셀 → assembleLifetime)의
 *    이 10년의 겹침(buildDecadeCross) 행
 *  - SAMPLE_DIAL: 태어난 해(원국 연주의 사주년, 입춘 기준)와 다음 인생 마디(생애 마디 중
 *    올해 다음 첫 항목 — 해와 만 나이)
 *
 * 엔진이 바뀌어 값이 달라지면 이 테스트가 실패한다. 의도한 변경이면 로컬에서 다시 만든다:
 *
 *   UPDATE_SAMPLE_CARD=1 npx vitest run tests/lib/card/sampleCard.golden.test.ts
 *
 * (파일을 다시 쓰고 통과한다. CI 에선 쓰지 않는다 — 바뀐 파일은 커밋 diff 로 검토한다.)
 *
 * 실제 Swiss Ephemeris(node 환경, swisseph unmock). native swisseph 가 없으면 로컬에선 skip,
 * CI · destiny 릴리스 게이트에선 실패한다(tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'
import { writeFileSync } from 'node:fs'
import path from 'node:path'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')
const { buildSajuCardReading, toTraitRow } = await import('@/lib/card/buildSajuCard')
const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const { buildCalendar } = await import('@/lib/calendar-engine')
const { assembleLifetime } = await import('@/app/calendar/assembleLifetime')
const { yearPillarOfSajuYear } = await import('@/lib/saju/datePillars')
const { getDateComponentsInTimezone } = await import('@/lib/datetime/timezone')
const fixture = await import('@/app/(main)/home/sampleCard')

type CrossRows = Awaited<ReturnType<typeof buildSajuCardReading>>['crossRows']['en']

/** 샘플 — 1997-03-21 14:30 여, 서울. */
const SAMPLE_BIRTH = {
  date: '1997-03-21',
  time: '14:30',
  gender: 'female',
  timeZone: 'Asia/Seoul',
  latitude: 37.5665,
  longitude: 126.978,
} as const
/** 2026-11-19 12:00 Asia/Seoul. */
const SAMPLE_NOW = '2026-11-19T03:00:00.000Z'
/** 띠 3단계의 대체 행(타이밍 행이 없을 때) — 서로 다른 판정 둘을 보여 주는 두 축. */
const BAND_TRAIT_KEYS = ['identity', 'temperament'] as const

const FIXTURE_PATH = path.resolve(__dirname, '../../../src/app/(main)/home/sampleCard.ts')

const pickTraits = (rows: CrossRows) =>
  BAND_TRAIT_KEYS.map((k) => {
    const row = rows.find((r) => r.key === k)
    if (!row) throw new Error(`sample has no '${k}' cross row`)
    return toTraitRow(row)
  })

/** 픽스처 전체를 엔진으로 다시 만든다(+ Life 의 인생 모양 — 카드와 같아야 한다). */
async function buildHomeSample() {
  const now = new Date(SAMPLE_NOW)
  const { card, crossRows } = await buildSajuCardReading({ birth: SAMPLE_BIRTH, now })

  // /destiny(loadLifetimeData)와 같은 길 — 본명 컨텍스트, 그날 셀, assembleLifetime.
  const today = getDateComponentsInTimezone(now, SAMPLE_BIRTH.timeZone)
  const todayIso = `${today.year}-${String(today.month).padStart(2, '0')}-${String(today.day).padStart(2, '0')}`
  const natal = await buildNatalContext({
    birthDate: SAMPLE_BIRTH.date,
    birthTime: SAMPLE_BIRTH.time,
    gender: SAMPLE_BIRTH.gender,
    latitude: SAMPLE_BIRTH.latitude,
    longitude: SAMPLE_BIRTH.longitude,
    timeZone: SAMPLE_BIRTH.timeZone,
    now,
  })
  const [focusDayCell] = await buildCalendar(
    natal,
    { start: `${todayIso}T00:00:00.000Z`, end: `${todayIso}T23:59:59.999Z`, granularity: 'day' },
    { includeEvidence: true }
  )
  const { lifetime } = await assembleLifetime({
    natal,
    lang: 'en',
    birthYear: Number(SAMPLE_BIRTH.date.slice(0, 4)),
    targetYear: today.year,
    sex: '여',
    birthDisplay: '',
    whoBirthLine: '',
    place: '',
    now,
    todayIso,
    focusDayCell: focusDayCell ?? null,
  })

  // 태어난 해 = 원국 연주의 사주년(입춘 전 출생이면 양력 연도 − 1).
  const gy = Number(SAMPLE_BIRTH.date.slice(0, 4))
  const bornYear = [gy, gy - 1].find((y) => {
    const p = yearPillarOfSajuYear(y)
    return p.stem === card.pillars.year.stem && p.branch === card.pillars.year.branch
  })
  if (bornYear == null) throw new Error('year pillar matches neither saju year')
  const next = lifetime.milestones.find((m) => m.year > today.year)

  return {
    card,
    band: {
      timing: lifetime.decadeCross ?? [],
      traits: { ko: pickTraits(crossRows.ko), en: pickTraits(crossRows.en) },
    },
    dial: { bornYear, turn: next ? { year: next.year, age: next.age } : null },
    crossRows,
    lifePattern: lifetime.lifePattern,
  }
}

type HomeSample = Awaited<ReturnType<typeof buildHomeSample>>

// 한 줄 JSON — prettier 가 printWidth 에 맞춰 접는다(짧은 객체는 한 줄로 남는다).
const ts = (v: unknown) => JSON.stringify(v)

/** 픽스처 파일 본문 — UPDATE_SAMPLE_CARD=1 일 때만 쓴다. */
async function renderFixture(s: HomeSample): Promise<string> {
  const src = `/**
 * 홈 샘플 사주 카드 — 생성 파일, 손으로 고치지 않는다.
 *
 * 샘플: ${SAMPLE_BIRTH.date} ${SAMPLE_BIRTH.time} 여 · 서울(${SAMPLE_BIRTH.timeZone}), now = ${SAMPLE_NOW}.
 * 엔진(buildSajuCardData · assembleLifetime)이 한 번 만든 값을 체크인한다 — 홈은 요청마다
 * Swiss Ephemeris 를 돌리지 않는다. tests/lib/card/sampleCard.golden.test.ts 가 같은 입력으로
 * 다시 만들어 이 값과 비교하므로 엔진이 바뀌면 실패한다. 의도한 변경이면 다시 만든다:
 *
 *   UPDATE_SAMPLE_CARD=1 npx vitest run tests/lib/card/sampleCard.golden.test.ts
 *
 * 카드 데이터는 ko/en 한 쌍(Bi)이라 한 벌로 두 언어를 그린다. 띠의 축 행만 언어별 문구다.
 * 카드 뒷면 세운은 여기 없다 — 홈이 보는 사람의 날짜로 정한다.
 */
import type { CardTraitRow, SajuCardData } from '@/lib/card/types'
import type { Lang } from '@/lib/i18n/bi'
import type { DestinyDecadeCross } from '@/types/calendar'

/** 샘플 출생 정보(폴리오 스탬프용) — 카드 데이터에는 들어가지 않는다. */
export const SAMPLE_BIRTH = ${ts({ ...SAMPLE_BIRTH, timeUnknown: false })} as const

/** 픽스처를 만든 '지금'. */
export const SAMPLE_NOW = ${ts(SAMPLE_NOW)}

export const SAMPLE_CARD: SajuCardData = ${ts(s.card)}

export interface SampleBand {
  /** 이 10년의 겹침(타이밍) 행 — 비면 축 행(traits)으로 대신한다. */
  timing: DestinyDecadeCross[]
  /** 대체 축 행(정체성 · 기질) — 교차 판정, 언어별 문구. */
  traits: Record<Lang, CardTraitRow[]>
}

export const SAMPLE_BAND: SampleBand = ${ts(s.band)}

export interface SampleDial {
  /** 태어난 해 — 원국 연주의 사주년(입춘 기준). */
  bornYear: number
  /** 다음 인생 마디(생애 마디 중 올해 다음 첫 항목) — 해와 만 나이. */
  turn: { year: number; age: number } | null
}

export const SAMPLE_DIAL: SampleDial = ${ts(s.dial)}
`
  const prettier = await import('prettier')
  const options = (await prettier.resolveConfig(FIXTURE_PATH)) ?? {}
  return prettier.format(src, { ...options, filepath: FIXTURE_PATH })
}

const HOW_TO_REGENERATE =
  'The Home sample fixture no longer matches the engine. If the engine change is intended, ' +
  'regenerate it locally with `UPDATE_SAMPLE_CARD=1 npx vitest run tests/lib/card/sampleCard.golden.test.ts` ' +
  'and review the diff of src/app/(main)/home/sampleCard.ts.'

describeRealEphemeris('홈 샘플 사주 카드 — 골든 (real ephemeris)', () => {
  it('sampleCard.ts = 엔진 출력(now 2026-11-19) — 카드 · 띠 · 다이얼', async () => {
    const built = await buildHomeSample()

    if (process.env.UPDATE_SAMPLE_CARD === '1') {
      writeFileSync(FIXTURE_PATH, await renderFixture(built))
      return
    }

    expect(fixture.SAMPLE_NOW, HOW_TO_REGENERATE).toBe(SAMPLE_NOW)
    expect(fixture.SAMPLE_BIRTH, HOW_TO_REGENERATE).toEqual({ ...SAMPLE_BIRTH, timeUnknown: false })
    expect(fixture.SAMPLE_CARD, HOW_TO_REGENERATE).toEqual(built.card)
    expect(fixture.SAMPLE_BAND, HOW_TO_REGENERATE).toEqual(built.band)
    expect(fixture.SAMPLE_DIAL, HOW_TO_REGENERATE).toEqual(built.dial)

    // 표면 일치 — 홈 카드의 인생 모양 = /destiny 히어로의 인생 유형(같은 곡선 파이프라인).
    expect(built.lifePattern, 'Life pattern missing').toBeTruthy()
    expect(fixture.SAMPLE_CARD.lifeShape).toEqual({
      ko: built.lifePattern!.ko,
      en: built.lifePattern!.en,
    })
    // 띠 대체 행은 카드 합의 줄을 센 바로 그 교차 행에서 왔다.
    for (const lang of ['ko', 'en'] as const) {
      for (const t of fixture.SAMPLE_BAND.traits[lang]) {
        expect(built.crossRows[lang].find((r) => r.key === t.key)?.tone).toBe(t.verdict)
      }
    }
  }, 300_000)
})
