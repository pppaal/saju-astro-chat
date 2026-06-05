/**
 * 실제 엔진 통합 — 진짜 생년월일을 buildNatalContext(사주+점성 실계산)에 넣어
 * 나온 데이터로 운세 차트 교차표 9행을 그대로 출력한다. (가짜 샘플 X)
 */
import { describe, it, expect } from 'vitest'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { dignityOf } from '@/lib/astrology/foundation/dignities'
import {
  evalIdentity,
  evalNeeds,
  evalSocialRole,
  evalFortune,
  evalRelations,
  evalStrength,
  evalTemperament,
  evalEnergyDirection,
  evalPersona,
  evalDrive,
  evalKeyAspect,
  dominantSibsinGroup,
  synthesize,
  type CrossVerdict,
} from '@/lib/destiny-map/natalCross'

const SIGN_KO_EN: Record<string, string> = {
  양자리: 'Aries', 황소자리: 'Taurus', 쌍둥이자리: 'Gemini', 게자리: 'Cancer',
  사자자리: 'Leo', 처녀자리: 'Virgo', 천칭자리: 'Libra', 전갈자리: 'Scorpio',
  사수자리: 'Sagittarius', 염소자리: 'Capricorn', 물병자리: 'Aquarius', 물고기자리: 'Pisces',
}
const TONE: Record<string, string> = {
  resonant: '잘 맞아요 ✓', complement: '서로 채워줘요', tension: '부딪혀요 ⚡', neutral: '따로따로',
}

describe('운세 차트 — 실제 엔진 통합', () => {
  it('진짜 생년월일로 9영역 교차 출력', async () => {
    // 실제 사람: 1992-03-15 09:20, 여성, 서울
    const ctx = await buildNatalContext({
      birthDate: '1992-03-15',
      birthTime: '09:20',
      gender: 'female',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })
    const saju = ctx.saju
    const astro = ctx.astro
    const planets = astro.chart.planets
    const find = (n: string) => planets.find((p) => p.name === n)

    // ── 실제 값 추출 ──
    const dmEl = saju.dayMaster.element // '목'·'화'…
    const sunSign = find('Sun')?.sign
    const moonSign = find('Moon')?.sign
    const adv = saju.advancedAnalysis as {
      geokguk?: { primary?: string } | null
      sibsin?: { categoryCount?: Record<string, number> } | null
    }
    const yongsin = saju.yongsin.primary
    const geokguk = adv?.geokguk?.primary ?? saju.geokguk
    const mcSign = astro.chart.mc.sign
    const ascSign = astro.chart.ascendant.sign
    const dayShinsal = saju.natalShinsal
      .filter((h) => h.pillars.includes('day'))
      .map((h) => String(h.kind))
    const hap = saju.natalRelations.filter((r) => String(r.kind).includes('합')).length
    const chung = saju.natalRelations.filter((r) => String(r.kind).includes('충')).length
    let harmonious = 0
    let hard = 0
    for (const a of astro.natalAspects) {
      const t = String((a as { type?: string }).type ?? '').toLowerCase()
      if (t === 'trine' || t === 'sextile') harmonious++
      else if (t === 'square' || t === 'opposition') hard++
    }
    const stages = getTwelveStagesForPillars(saju.pillars) as Record<string, string>
    const twelveStage = stages.day
    const fiveElements = saju.fiveElements as unknown as Record<string, number>
    const details = adv?.sibsin?.categoryCount
    const planetSigns = planets.map((p) => p.sign).filter(Boolean) as string[]

    // 강조 행성(앵귤러 1·4·7·10 또는 입궁/고양) + 최고 위신 행성
    const ANGLES = new Set([1, 4, 7, 10])
    const emphasized = new Set<string>()
    let topDignity: { planet: string; status: string } | null = null
    for (const p of planets) {
      if (!p.name) continue
      const en = SIGN_KO_EN[p.sign] ?? p.sign
      const status = dignityOf(p.name, en)
      if (typeof p.house === 'number' && ANGLES.has(p.house)) emphasized.add(p.name)
      if (status === 'domicile' || status === 'exaltation') {
        emphasized.add(p.name)
        if (!topDignity) topDignity = { planet: p.name, status }
      }
    }

    const lang = 'ko' as const
    const rows: Array<{ cat: string; v: CrossVerdict | null }> = [
      { cat: '정체성   ', v: evalIdentity(dmEl, sunSign) },
      { cat: '욕망     ', v: evalNeeds(yongsin, moonSign) },
      { cat: '사회역할 ', v: evalSocialRole(geokguk, mcSign) },
      { cat: '길흉     ', v: evalFortune(dayShinsal) },
      { cat: '관계     ', v: evalRelations(hap, chung, harmonious, hard) },
      { cat: '강점     ', v: evalStrength(twelveStage, topDignity) },
      { cat: '기질     ', v: evalTemperament(fiveElements, planetSigns) },
      { cat: '에너지   ', v: evalEnergyDirection(details, emphasized) },
      { cat: '드러나는나', v: evalPersona(dmEl, ascSign) },
      {
        cat: '추진력   ',
        v: evalDrive(
          (adv as { yongsin?: { daymasterStrength?: string } })?.yongsin?.daymasterStrength ??
            saju.strength,
          emphasized.has('Sun') || emphasized.has('Mars'),
        ),
      },
      {
        cat: '핵심성향 ',
        v: evalKeyAspect(
          astro.natalAspects as Parameters<typeof evalKeyAspect>[0],
          dominantSibsinGroup(details),
        ),
      },
    ]
    const verdicts = rows.map((r) => r.v).filter((v): v is CrossVerdict => !!v)
    const synth = synthesize(verdicts)

    const out: string[] = ['', '┌─ 🧬 실제 차트 (1992-03-15 09:20 여성·서울) ─┐']
    out.push(`  일간 ${saju.dayMaster.name}(${dmEl}) · 태양 ${sunSign} · 달 ${moonSign} · ASC ${ascSign} · 격국 ${geokguk ?? '없음'}`)
    if (synth) out.push(`  [종합] ${synth.text[lang]}`)
    out.push('  ' + '─'.repeat(58))
    for (const r of rows) {
      if (!r.v) {
        out.push(`  ${r.cat} │ (데이터 없음)`)
        continue
      }
      out.push(`  ${r.cat} │ ${TONE[r.v.tone]}`)
      out.push(`           └ ${r.v.reason[lang]}`)
    }
    out.push('  ' + '─'.repeat(58))
    console.log(out.join('\n'))

    expect(verdicts.length).toBeGreaterThanOrEqual(5)
  }, 30000)
})
