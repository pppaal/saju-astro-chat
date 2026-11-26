/**
 * EN 티어 렌더에 한글이 없다 — 실제 천체력 (재감사 SI-1·SI-2·CC-4·SI-3·SI-4, destiny release gate).
 *
 * 엔진 → 어셈블러(assembleTiers·assembleLifetime) → 뷰모델 → 컴포넌트(LifeFlow(v9.2 인생 흐름) ·
 * MonthView · DayView(v9.2 운세 달력)) 전 경로를 EN 로케일로 정적 렌더해, 영어가 와야 할 자리에
 * 한글이 새지 않는지 본다.
 *  - 한자(간지·强/弱·財生官·長生)는 허용 — 글리프 자리다. 한글(가-힣)은 어디에도 없어야 한다.
 *  - 차트는 1997-03-21 14:30 F 서울(샘플, 상관격·신약·건록 교차 달), 1951-09-07 01:26 M LA
 *    (건록격·성격), 시간 미상 1988-08-08 시드니, 1975-12-30 05:10 M 뉴욕.
 *  - 월은 샘플의 건록 교차가 '왜 이런 날' 칩에 서는 2026-10/11(재감사 재현 셀)을 포함한다.
 *
 * 전역 setup 이 swisseph 를 목으로 바꾸므로 여기서 풀고 node 로 돈다. native swisseph 가 없으면
 * 로컬에선 skip, CI·release gate 에선 실패한다(tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: 'en' }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const { describeRealEphemeris } = await import('../../../helpers/realEphemeris')
const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const { buildCalendar } = await import('@/lib/calendar-engine')
const { assembleTiers } = await import('@/app/calendar/assembleTiers')
const { assembleLifetime } = await import('@/app/calendar/assembleLifetime')
const { default: LifeFlow } = await import('@/app/destiny/LifeFlow')
const { buildLifetimeViewModel } = await import('@/lib/calendar-view/lifetimeViewModel')
const { default: MonthView } = await import('@/components/calendar/v9/MonthView')
const { default: DayView } = await import('@/components/calendar/v9/DayView')
const { buildMonthViewModel } = await import('@/lib/calendar-view/monthViewModel')
const { buildDayViewModel } = await import('@/lib/calendar-view/dayViewModel')

const { twelveStageHanja, appliedPatternEn } = await import('@/lib/calendar-view/dayTierEnMaps')

const NOW = new Date('2026-11-25T03:00:00.000Z')
/** 차트·포커스일별 렌더 HTML — 샘플 재현 셀의 구체 문구를 아래에서 확인한다. */
const rendered = new Map<string, { month: string; day: string }>()
/** 차트·포커스일별 응용격국 id — 샘플 재현 셀의 SI-3 확인용(v9 일간 탭은 본명 풀이를 그리지 않는다). */
const patterns = new Map<string, Array<{ id: string; name: string }>>()
const noop = () => {}

interface Chart {
  label: string
  birthDate: string
  birthTime: string
  birthTimeUnknown?: boolean
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
  /** [YYYY-MM, focus day] */
  months: Array<[string, number]>
}

const CHARTS: Chart[] = [
  {
    label: 'sample 1997-03-21 14:30 F Seoul',
    birthDate: '1997-03-21',
    birthTime: '14:30',
    gender: 'female',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
    // 10-04 = 건록 × 태양 근거일(재감사 CC-4), 11-21 = 건록 × 태양(SI-2), 11-25 = 재생관(SI-3).
    months: [
      ['2026-10', 4],
      ['2026-11', 25],
    ],
  },
  {
    label: '1951-09-07 01:26 M Los Angeles (건록격)',
    birthDate: '1951-09-07',
    birthTime: '01:26',
    gender: 'male',
    latitude: 34.2555,
    longitude: -118.3346,
    timeZone: 'America/Los_Angeles',
    months: [['2026-11', 21]],
  },
  {
    label: '1988-08-08 time unknown F Sydney',
    birthDate: '1988-08-08',
    birthTime: '',
    birthTimeUnknown: true,
    gender: 'female',
    latitude: -33.8688,
    longitude: 151.2093,
    timeZone: 'Australia/Sydney',
    months: [['2026-03', 10]],
  },
  {
    label: '1975-12-30 05:10 M New York',
    birthDate: '1975-12-30',
    birthTime: '05:10',
    gender: 'male',
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: 'America/New_York',
    months: [['2026-07', 15]],
  },
]

const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/

/** 렌더된 HTML 의 *보이는 텍스트*(태그 밖)와 title/aria-label 속성에서 한글 조각을 모은다. */
function hangulLeaks(html: string): string[] {
  const out: string[] = []
  const text = html.replace(/<[^>]*>/g, '\u0000')
  for (const chunk of text.split('\u0000')) {
    if (HANGUL.test(chunk)) out.push(chunk.trim())
  }
  for (const m of html.matchAll(/\s(?:title|aria-label|alt)="([^"]*)"/g)) {
    if (HANGUL.test(m[1])) out.push(`@attr ${m[1]}`)
  }
  return out
}

function lastDay(ym: string): number {
  return new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate()
}

async function natalOf(c: Chart) {
  return buildNatalContext({
    birthDate: c.birthDate,
    birthTime: c.birthTime,
    birthTimeUnknown: c.birthTimeUnknown,
    gender: c.gender,
    latitude: c.latitude,
    longitude: c.longitude,
    timeZone: c.timeZone,
  })
}

describeRealEphemeris('EN 티어 렌더 — 한글 없음 (실제 천체력)', () => {
  for (const c of CHARTS) {
    it(`${c.label}: Life / Month / Day`, async () => {
      const natal = await natalOf(c)
      const birthYear = +c.birthDate.slice(0, 4)
      const sex = c.gender === 'female' ? '여' : '남'

      const life = await assembleLifetime({
        natal,
        lang: 'en',
        birthYear,
        targetYear: 2026,
        sex,
        birthDisplay: c.birthDate,
        whoBirthLine: c.birthDate,
        place: 'x',
        now: NOW,
        todayIso: '2026-11-25',
      })
      const lifeVm = buildLifetimeViewModel(life, { lang: 'en', todayIso: '2026-11-25' })
      const lifeHtml = renderToStaticMarkup(
        <LifeFlow
          vm={lifeVm}
          locale="en"
          dayMaster={{ stem: life.user.ilgan.hanja, element: 'water' }}
          chipStamp={c.birthDate}
          folioStamp={c.birthDate}
          folioRight="destinypal.com"
          river={null}
        />
      )
      expect(lifeHtml.length).toBeGreaterThan(2000)
      expect(hangulLeaks(lifeHtml), `${c.label} Life`).toEqual([])
      // 머리말 — 격국 이름이 영문으로(SI-1). EN 강약 · 상태 줄은 페이로드에 없다(D30).
      expect(life.user.gyeokgukEn).not.toMatch(HANGUL)
      expect(life.user).not.toHaveProperty('gangyakEn')

      for (const [ym, focus] of c.months) {
        const y = +ym.slice(0, 4)
        const m = +ym.slice(5, 7)
        const cells = await buildCalendar(
          natal,
          {
            start: `${ym}-01T00:00:00.000Z`,
            end: `${ym}-${lastDay(ym)}T23:59:59.999Z`,
            granularity: 'day',
          },
          { includeEvidence: false }
        )
        const di = `${ym}-${String(focus).padStart(2, '0')}`
        const [focusCell] = await buildCalendar(
          natal,
          { start: `${di}T00:00:00.000Z`, end: `${di}T23:59:59.999Z`, granularity: 'day' },
          { includeEvidence: true }
        )
        const t = await assembleTiers({
          natal,
          cells,
          lang: 'en',
          birthYear,
          targetYear: y,
          targetMonth: m,
          targetDay: focus,
          targetDayIso: di,
          sex,
          birthDisplay: c.birthDate,
          whoBirthLine: c.birthDate,
          place: 'x',
          focusDayCell: focusCell,
          now: NOW,
        })

        // 데이터 층 — 교차 사주 키 EN(SI-2·CC-4). (이달 총평 SI-4 는 D9 에서 페이로드째 삭제.)
        for (const cell of t.month.calendar) {
          if (cell.reason) expect(cell.reason.sajuEn, `${ym}-${cell.d} reason`).not.toMatch(HANGUL)
        }
        for (const x of t.day.crossActivations ?? []) {
          expect(x.sajuSide, `${di} cross`).not.toMatch(HANGUL)
        }

        // 렌더 — 월은 포커스일이 오늘인 월간 탭('03 / 오늘'의 '왜 이런 날' 행 포함), 일은 그 날.
        const monthVm = buildMonthViewModel(t.month, t.day, { lang: 'en' })
        const monthHtml = renderToStaticMarkup(
          <MonthView vm={monthVm} locale="en" onOpenDay={noop} />
        )
        expect(monthHtml.length).toBeGreaterThan(2000)
        expect(hangulLeaks(monthHtml), `${c.label} Month ${ym}`).toEqual([])
        const dayVm = buildDayViewModel(t.day, { lang: 'en', sex, isToday: false })
        const dayHtml = renderToStaticMarkup(<DayView vm={dayVm} locale="en" />)
        expect(dayHtml.length).toBeGreaterThan(2000)
        expect(hangulLeaks(dayHtml), `${c.label} Day ${di}`).toEqual([])
        // 데이터 층 — 12운성 보조 글리프는 한자, 응용격국은 영문 이름·글로스(SI-3). v9 일간 탭은
        // 본명 풀이 접이식을 그리지 않으므로 표시용 지도가 영문·한자만 내는지를 직접 본다.
        for (const st of t.day.twelveStageMatrix ?? []) {
          if (st.stage !== '—') expect(twelveStageHanja(st.stage)).not.toMatch(HANGUL)
        }
        for (const p of t.day.appliedPatterns ?? []) {
          const en = appliedPatternEn(String(p.id))
          if (en) expect(`${en.name} ${en.gloss}`, `${di} pattern ${p.id}`).not.toMatch(HANGUL)
        }
        rendered.set(`${c.birthDate}|${di}`, { month: monthHtml, day: dayHtml })
        patterns.set(
          `${c.birthDate}|${di}`,
          (t.day.appliedPatterns ?? []).map((p) => ({ id: String(p.id), name: String(p.name) }))
        )
      }
    }, 120_000)
  }

  it('샘플 재현 셀 — 건록 교차는 Established Stipend, 재생관은 영문 이름 + 財生官', () => {
    // 2026-10-04: '왜 이런 날' = 건록 × 태양(재감사 CC-4) — 월간 '03 / 오늘'의 '왜' 행과 일간 카드 모두 영문.
    const oct = rendered.get('1997-03-21|2026-10-04')
    expect(oct?.month).toContain('Established Stipend')
    expect(oct?.day).toContain('Established Stipend')
    // 2026-11-25: 응용격국 재생관(SI-3) — EN 이름(표시용 지도), 보조 글리프는 한자 이름만.
    const list = patterns.get('1997-03-21|2026-11-25') ?? []
    const jsg = list.find((p) => appliedPatternEn(p.id)?.name === 'Wealth generates Officer')
    expect(jsg, `patterns ${list.map((p) => p.id).join(',')}`).toBeTruthy()
    expect(jsg?.name).toContain('財生官')
    expect(jsg?.name).not.toContain('財生官 (')
  })
})
