/**
 * 통합 리포트 실데이터 파이프라인 테스트 —
 * 진짜 생년월일 → buildNatalContext → 어댑터 → ReportData + 섹션5 교차.
 */
import { describe, it, expect } from 'vitest'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { natalToReportData, buildCrossRows } from '@/components/report/integrated/adapter'

describe('통합 리포트 — 실데이터 파이프라인', () => {
  it('진짜 생년월일로 ReportData + 교차 생성', async () => {
    const ctx = (await buildNatalContext({
      birthDate: '1992-03-15',
      birthTime: '09:20',
      gender: 'female',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })) as Record<string, unknown>

    // 12운성 부착 (어댑터가 S.twelveStages 로 읽음)
    const saju = ctx.saju as Record<string, unknown>
    saju.twelveStages = getTwelveStagesForPillars(saju.pillars as never)
    // input 보강
    ;(ctx as Record<string, unknown>).input = {
      ...(ctx.input as object),
      name: '내담자',
      gender: 'female',
      place: '대한민국 서울',
      timeZone: 'Asia/Seoul',
      isoUTC: '',
    }

    const rd = natalToReportData(ctx)
    const cross = buildCrossRows(ctx)

    // ── 구조 완전성 ──
    expect(rd.saju.dayMaster).toBeTruthy()
    expect(rd.saju.pillars.day.stem).toBeTruthy()
    expect(Object.values(rd.saju.fiveElements).reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
    expect(rd.astro.planets.length).toBeGreaterThanOrEqual(8)
    expect(rd.astro.planets[0].glyph).toBeTruthy()
    expect(rd.astro.houses.length).toBe(12)
    expect(cross.rows.length).toBeGreaterThanOrEqual(5)

    // ── 콘솔 요약 ──
    const out: string[] = ['', '── 통합 리포트 실데이터 (1992-03-15 09:20 여성) ──']
    out.push(`일간 ${rd.saju.dayMaster} · ${rd.saju.geokguk} · ${rd.saju.strength}`)
    out.push(
      `기둥: ${(['year', 'month', 'day', 'hour'] as const).map((k) => rd.saju.pillars[k].stem + rd.saju.pillars[k].branch).join(' ')}`
    )
    out.push(`오행: ${JSON.stringify(rd.saju.fiveElements)}`)
    out.push(
      `행성 ${rd.astro.planets.length} · 어스펙트 ${rd.astro.aspects.length} · 위계 ${rd.astro.dignities.length}`
    )
    out.push(`ASC ${rd.astro.ascendant.sign} · MC ${rd.astro.mc.sign}`)
    out.push(`[종합] ${cross.synthesis}`)
    for (const r of cross.rows) out.push(`  ${r.category} · ${r.tone} — ${r.reason}`)
    console.info(out.join('\n'))
  }, 30000)

  it('placeUnreliable: _chart 폴백 ASC/MC/하우스가 리포트로 새지 않는다 (ENGINE-AUDIT B)', async () => {
    const ctx = (await buildNatalContext({
      birthDate: '1992-03-15',
      birthTime: '09:20',
      gender: 'female',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })) as Record<string, unknown>
    const saju = ctx.saju as Record<string, unknown>
    saju.twelveStages = getTwelveStagesForPillars(saju.pillars as never)
    ;(ctx as Record<string, unknown>).input = {
      ...(ctx.input as object),
      gender: 'female',
      timeZone: 'Asia/Seoul',
    }
    // 출생시각/출생지 미상 시뮬레이션: _chart 에는 폴백 각/하우스가 차 있어도 가려야 한다.
    ;(ctx.astro as Record<string, unknown>).placeUnreliable = true

    const rd = natalToReportData(ctx)
    const cross = buildCrossRows(ctx)

    // ASC/MC/하우스는 전부 비워짐 (가짜 폴백 비노출)
    expect(rd.astro.ascendant.sign).toBeNull()
    expect(rd.astro.ascendant.lon).toBeNull()
    expect(rd.astro.mc.sign).toBeNull()
    expect(rd.astro.houses).toEqual([])
    // 행성 sign 은 유지되지만 house 는 전부 0(UNKNOWN)
    expect(rd.astro.planets.length).toBeGreaterThanOrEqual(8)
    expect(rd.astro.planets.every((p) => p.house === 0)).toBe(true)
    // MC 의존 사회역할 행은 생략됨
    expect(cross.rows.some((r) => r.category.includes('사회') || /role/i.test(r.category))).toBe(
      false
    )
  }, 30000)
})
