/**
 * 상담사 대운 타임라인 — 모든 칸이 '시작~끝' 으로 닫힌다, 지금 흐르는 마지막 칸 포함 (G12).
 *
 * 대운 칸은 [시작, 시작+10) (daeunAge SSOT · DAEUN_SPAN_YEARS). 예전엔 목록의 마지막 칸만
 * '101~ 庚寅(now …)' 처럼 열려 있어, LLM 이 그 대운이 끝없이 이어진다고 읽을 수 있었다.
 * 100세+ 차트(목록 11칸, 마지막 칸이 지금 대운)와 보통 차트(10칸) 둘 다 ko/en 으로 본다.
 *
 * EN 시스템 프롬프트의 천간 규칙도 같이 고정한다 — 컨텍스트에 없는 로마자 음(Geng 등)을
 * 요구하지 않고, EN 컨텍스트가 실제로 싣는 'day_master: 庚 (yang Metal)' 꼴을 가리킨다.
 */
import { describe, it, expect } from 'vitest'
import { buildDestinyContext, type DestinyBirth } from '@/lib/destiny/counselorContext'
import { buildDestinyCounselorPrompt } from '@/lib/prompts/destinyCounselorPrompt'

const SAJU_ONLY = { saju: true, astro: false }

// currentDaeunParity 와 같은 100세+ 차트 — 만 101세, 庚寅@101 이 지금 대운(목록 11칸).
const CENTENARIAN: DestinyBirth = {
  birthDate: '1925-03-30',
  birthTime: '08:44',
  gender: 'female',
  latitude: 40.4812,
  longitude: -73.8248,
  timezone: 'America/New_York',
}
const CENTENARIAN_DAY = new Date('2026-11-24T12:00:00Z')

const ORDINARY: DestinyBirth = {
  birthDate: '1990-05-15',
  birthTime: '08:30',
  gender: 'male',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
}
const ORDINARY_DAY = new Date('2026-11-26T12:00:00Z')

async function daeunCells(birth: DestinyBirth, day: Date, locale: 'ko' | 'en') {
  const ctx = await buildDestinyContext(birth, day, locale, undefined, SAJU_ONLY)
  const head = locale === 'en' ? 'daeun: ' : '대운: '
  const line = ctx.daily.split('\n').find((l) => l.startsWith(head))
  expect(line, 'daeun timeline line').toBeDefined()
  return line!.slice(head.length).split(' / ')
}

const CELL = (locale: 'ko' | 'en') =>
  locale === 'en' ? /^(\d+)~(\d+) \S\S/ : /^(\d+)~(\d+)세 \S\S/

describe('상담사 대운 타임라인 — 닫힌 칸', () => {
  it.each(['en', 'ko'] as const)(
    '100세+ (%s): 마지막 칸도 101~110 으로 닫히고 그 칸이 지금 대운',
    async (locale) => {
      const cells = await daeunCells(CENTENARIAN, CENTENARIAN_DAY, locale)
      expect(cells.length).toBe(11)
      const last = cells[cells.length - 1]
      expect(last).toMatch(
        locale === 'en' ? /^101~110 庚寅\(now [^)]+\)$/ : /^101~110세 庚寅\(현재 [^)]+\)$/
      )
      // 열린 칸('101~ ' / '101세~')은 하나도 없다.
      for (const c of cells) expect(c).toMatch(CELL(locale))
    },
    60000
  )

  it.each(['en', 'ko'] as const)(
    '보통 차트 (%s): 칸마다 끝 = 시작+9, 다음 칸 시작 = 끝+1',
    async (locale) => {
      const cells = await daeunCells(ORDINARY, ORDINARY_DAY, locale)
      expect(cells.length).toBe(10)
      const spans = cells.map((c) => {
        const m = c.match(CELL(locale))
        expect(m, `closed cell: ${c}`).not.toBeNull()
        return [Number(m![1]), Number(m![2])] as const
      })
      spans.forEach(([s, e], i) => {
        expect(e - s).toBe(9)
        if (i > 0) expect(s).toBe(spans[i - 1][1] + 1)
      })
    },
    60000
  )
})

describe('EN 프롬프트 천간 규칙 — 컨텍스트가 싣는 것만 요구', () => {
  it('EN 규칙은 로마자 음을 요구하지 않고, EN 컨텍스트의 day_master 꼴과 맞다', async () => {
    const en = buildDestinyCounselorPrompt('en')
    expect(en).not.toMatch(/\b(Geng|Jia|Bing|Ding|Xin|Ren|Gui)\b/)
    expect(en).toContain('"day_master: 庚 (yang Metal)"')

    const ctx = await buildDestinyContext(ORDINARY, ORDINARY_DAY, 'en', undefined, SAJU_ONLY)
    const all = `${ctx.stable}\n${ctx.daily}`
    // EN 컨텍스트의 일간 줄 = '<한자> (<yin|yang> <Element>)' — 로마자 음 없음.
    expect(all).toMatch(
      /day_master: [甲乙丙丁戊己庚辛壬癸] \((yin|yang) (Wood|Fire|Earth|Metal|Water)\)/
    )
    expect(all).not.toMatch(/day_master: \S+ = /)
  })

  it('KO 규칙은 KO 컨텍스트가 싣는 한글 음 병기(예: 일간: 庚경)를 그대로 가리킨다', async () => {
    const ko = buildDestinyCounselorPrompt('ko')
    expect(ko).toContain('일간: 庚경')
    const ctx = await buildDestinyContext(ORDINARY, ORDINARY_DAY, 'ko', undefined, SAJU_ONLY)
    expect(`${ctx.stable}\n${ctx.daily}`).toMatch(/일간: [甲乙丙丁戊己庚辛壬癸][가-힣]\(/)
  })
})
