/**
 * 통합 리포트 실데이터 파이프라인 테스트 —
 * 진짜 생년월일 → buildNatalContext → 어댑터 → ReportData + 섹션5 교차.
 */
import { describe, it, expect } from 'vitest'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { natalToReportData, buildCrossRows } from '@/components/destiny-map/charts/integrated/adapter'

describe('통합 리포트 — 실데이터 파이프라인', () => {
  it('진짜 생년월일로 ReportData + 교차 생성', async () => {
    const ctx = (await buildNatalContext({
      birthDate: '1992-03-15', birthTime: '09:20', gender: 'female',
      latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
    })) as Record<string, unknown>

    // 12운성 부착 (어댑터가 S.twelveStages 로 읽음)
    const saju = ctx.saju as Record<string, unknown>
    saju.twelveStages = getTwelveStagesForPillars(saju.pillars as never)
    // input 보강
    ;(ctx as Record<string, unknown>).input = {
      ...(ctx.input as object), name: '내담자', gender: 'female', place: '대한민국 서울',
      timeZone: 'Asia/Seoul', isoUTC: '',
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
    out.push(`기둥: ${(['year', 'month', 'day', 'hour'] as const).map((k) => rd.saju.pillars[k].stem + rd.saju.pillars[k].branch).join(' ')}`)
    out.push(`오행: ${JSON.stringify(rd.saju.fiveElements)}`)
    out.push(`행성 ${rd.astro.planets.length} · 어스펙트 ${rd.astro.aspects.length} · 위계 ${rd.astro.dignities.length}`)
    out.push(`ASC ${rd.astro.ascendant.sign} · MC ${rd.astro.mc.sign}`)
    out.push(`[종합] ${cross.synthesis}`)
    for (const r of cross.rows) out.push(`  ${r.category} · ${r.tone} — ${r.reason}`)
    console.log(out.join('\n'))
  }, 30000)
})
