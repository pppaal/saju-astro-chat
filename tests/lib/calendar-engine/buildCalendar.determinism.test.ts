/**
 * buildCalendar 결정론 골든 — 진짜 천체력 (destiny release gate).
 *
 * 엔진은 순수·재현가능해야 한다(CLAUDE.md) — 같은 본명·같은 범위·같은 now 면
 * 셀 출력이 byte-identical. 이 테스트가 그 불변식을 못 깨게 잠근다:
 *   (1) 같은 입력 2회 빌드 → 셀 digest 동일(비결정성 회귀 차단)
 *   (2) digest 가 고정 golden 과 일치(의도치 않은 산식 변화 감지 — 의도 변경 시 갱신)
 *   (3) 점수 분포 invariant(0~100 범위 + 변별력 있음)
 *
 * 예전엔 전역 swisseph 목(행성 고정·swe_rise_trans 없음) 위의 digest 라 점성 신호는
 * 가짜 위치였고 행성시는 아예 빠졌다(엔진 감사 F11). 이제 node 환경에서 목을 풀고 진짜
 * 천체력으로 빌드한다. 사주 대운은 주입한 now 로 고정해 digest 가 시계에 새지 않는다.
 * native swisseph 가 없으면 로컬에선 skip, CI·release gate 에선 실패한다
 * (tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { it, expect, vi } from 'vitest'
import { createHash } from 'node:crypto'
import type { CalendarCell } from '@/lib/calendar-engine/types'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')
const { calculateSajuData } = await import('@/lib/saju/saju')
const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
const { buildCalendar } = await import('@/lib/calendar-engine')

const LOC = { lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' }
const BIRTH = { birthDate: '1990-05-15', birthTime: '10:30', gender: 'male' as const }
const RANGE = {
  start: '2026-06-01T00:00:00.000Z',
  end: '2026-06-30T23:59:59.000Z',
  granularity: 'day' as const,
}

/** 셀 수치 골격 digest — 의도적 산식/룰 변경 때만 갱신(아래 갱신 이력). */
const GOLDEN = '285e3fcf6cf37fdb7287cb713d745efef77981bd'

/** 대운 기준 시각 — 빌드 범위 첫날(2026-06-01 KST 정오). */
const NOW = new Date('2026-06-01T03:00:00Z')

async function build(): Promise<CalendarCell[]> {
  const saju = calculateSajuData(
    BIRTH.birthDate,
    BIRTH.birthTime,
    BIRTH.gender,
    'solar',
    LOC.tz,
    false,
    LOC.lon,
    NOW
  )
  const natal = await buildNatalContext(
    {
      birthDate: BIRTH.birthDate,
      birthTime: BIRTH.birthTime,
      gender: BIRTH.gender,
      latitude: LOC.lat,
      longitude: LOC.lon,
      timeZone: LOC.tz,
    },
    { saju }
  )
  return buildCalendar(natal, RANGE, { includeEvidence: false })
}

// 셀의 *수치 골격*만 digest — datetime + 점수 + 현저도. (해석 텍스트는 제외:
// 결정론의 핵심은 점수/현저도. 텍스트 변경으로 골든이 깨지지 않게.)
function digest(cells: CalendarCell[]): string {
  const skeleton = cells.map((c) => [
    c.datetime,
    Math.round(c.derivedScore),
    Math.round(c.salience * 1000),
  ])
  return createHash('sha1').update(JSON.stringify(skeleton)).digest('hex')
}

describeRealEphemeris('buildCalendar 결정론 골든 (real ephemeris)', () => {
  it('같은 입력 2회 빌드 → 셀 수치 골격 동일 (결정론)', async () => {
    const a = await build()
    const b = await build()
    expect(a.length).toBe(b.length)
    expect(digest(a)).toBe(digest(b))
  }, 60_000)

  it('점수 분포 invariant — 0~100 범위 + 변별력(sd>0)', async () => {
    const cells = await build()
    expect(cells.length).toBeGreaterThan(20)
    const scores = cells.map((c) => c.derivedScore)
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(100)
    }
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const sd = Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length)
    expect(sd).toBeGreaterThan(0) // 전부 같은 점수면 변별 불가 — 회귀
  }, 60_000)

  it('digest 가 고정 golden 과 일치 (의도치 않은 산식 변화 감지)', async () => {
    // 의도적 산식/룰 변경 시에만 이 값을 갱신한다(Saju determinism-golden 과 동일 규약).
    // 2026-07 갱신(v5): 교차 매핑 31→57쌍 확장(일/월 근거 커버리지 — 달·태양·
    // 수성·금성·화성·천을귀인). 새 cross-activation 신호가 점수 골격에 합류하며
    // digest 변경. 의도된 커버리지 확장에 따른 정당한 갱신.
    // 2026-07 갱신(v6): ZR 정통화 — 나이 앵커 출생년 1/1→실제 생일(A-2) +
    // Loosing-of-the-Bond Valens 점프 규칙(A-1). ZR 신호 창·이벤트가 이동하며
    // digest 변경. 의도된 정통 규칙 교정에 따른 정당한 갱신.
    // 2026-07 갱신(v7): 자시(子時) 이중계상 교정(C2) — 자시가 자정을 넘겨 두 날
    // 셀에 걸리던 것을, 각 셀이 그날 생성 시진만 갖도록 dedup. 새벽 꼬리(전날 자시)
    // 가 hourly 층에서 빠지며 일점수 골격 이동. 의도된 이중계상 제거에 따른 정당한 갱신.
    // 2026-11 갱신(v8, 엔진 감사 E3): 신살 canon — 태극귀인 三命通會 표, 귀문관 정통
    // 6쌍(일지 기준), 천주귀인 식신祿, 도화 = 일지 三合 年殺(子午卯酉 전부 → 한 지지).
    // 일진 신살 신호가 바뀌며 일점수 골격 이동. 의도된 정통 표 교정에 따른 정당한 갱신.
    // 2026-11 갱신(엔진 감사 E4): 강약 중심 보정(일간 자기 비겁 제외, 중앙값 50) +
    // 용신이 억부와 모순되지 않게(병약·통관 억부 필터, 추천·회피 서로소) + 화기격국
    // 엄격 규칙. 사주 추출기 극성이 모두 용신 기준이라 일점수 골격 이동. 의도된 갱신.
    // 2026-11 갱신(v9, 엔진 감사 E9): 교차 범위 불변 — 트랜짓·품위·달 위상 창을 범위
    // 밖까지 이어 진짜 run·최소 orb 로, 子時 민용일 두 조각, 교차 부모는 정통 기둥·시진·
    // 신살 × 실제 활성 행성(오행 흐름·지장간·행성시 제외), 교차 dedup (셀, name, layer).
    // 신호 weight·교차 구성이 바뀌어 digest 변경. 의도된 갱신.
    // 2026-11 갱신(v10, 엔진 감사 E11): 교차 교리 — 두 부모가 매핑 방향에 동의할 때만 부호,
    // layer 는 좁은 부모 층(시진 교차 hourly)·밴드도 그 층, 솔라 아크·진행·진행 달 교차 키
    // 제외, 도화×화성 은퇴, 회귀 추출기가 범위 직전 회귀부터. 교차 구성이 바뀌어 digest 변경.
    // 2026-11 갱신(v11, 엔진 감사 E13): 점성 일관성 — 행성시는 실제 일출(swe_rise_trans)
    // 기준(전역 모의 천체력엔 swe_rise_trans 가 없어 이 테스트에선 행성시가 빠진다), ZR L3 는
    // L2 의 1/12(2.5일), 택일 classifyAspects 는 순서 없는 서로 다른 쌍, VoC 끝은 달 진입 시각.
    // 신호 구성이 바뀌어 digest 변경. 의도된 갱신.
    // 2026-11 갱신(엔진 감사 E16): 전역 목 → 진짜 천체력. 트랜짓·달·품위·행성시·VoC 가
    // 실제 위치로 계산되고, 사주 대운 기준 시각을 NOW 로 주입. 산식 변화 없음 — 측정
    // 대상(목 → 실제 천체력)이 바뀐 갱신. 이후 이 digest 는 실제 하늘 위의 값을 잠근다.
    // 2026-11 갱신(v12, 오너 결정 15): 솔라·루나 리턴은 교차 키가 아니다 — 회귀 주기 구간을
    // 부모로 한 교차(비견×태양·정인×달 등)가 빠져 점수 골격 이동. 천을귀인×목성 은퇴(결정 14)는
    // 발화 불가 행이라 digest 영향 없음(따로 확인). 의도된 갱신.
    // 2026-11 갱신(G6, 재감사 AC-3·CC-1): 라이프사이클 신호가 평균 나이표 창 대신 실측 통과
    // 창(첫 통과 접근 1° ~ 마지막 통과 뒤 1°)을 쓴다. 이 표본(1990-05-15)의 2026-06 에 켜져
    // 있던 '명왕성 사각' −2(표 창 2026–2031, 실제 첫 통과 2033-03)와 '세 번째 목성 회귀' +2
    // (표 창 2026–2028, 실제 2025-07-22)가 빠진다. 의도된 갱신.
    // 2026-11 갱신(G4, 재감사 SDR-01·02): 일진 삼합·방합은 국이 완성될 때만, 두 지지는
    // 왕지 반합(+2)만 — 生-墓 쌍 '삼합'(+3)·두 지지 방합(+1)이 빠진다. 암합 化氣 게이트가
    // 합을 이루는 본명 천간 자신을 파합자로 세지 않는다(甲己·戊癸 대칭). 의도된 갱신.
    expect(digest(await build())).toBe(GOLDEN)
  }, 60_000)

  it('digest 가 서버 시계와 무관하다 (now 주입)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date('2031-01-15T12:00:00Z'))
      expect(digest(await build())).toBe(GOLDEN)
    } finally {
      vi.useRealTimers()
    }
  }, 60_000)
})
